/**
 * 全局标准朗读播放器
 * ------------------------------------------------------------------
 * 2026-10-26 从 InnerAudioContext 换成 BackgroundAudioManager。
 *
 * 为什么换：InnerAudioContext 是「前台音效」定位，小程序一退到后台就被系统掐掉，
 * 锁屏同理 —— 这是接口定位决定的，不是配置能补的。
 * BackgroundAudioManager 是微信专门给音乐/播客类小程序的接口，走 playback 音频会话，
 * 因此同时具备三个能力：
 *   1. 锁屏 / 切后台继续播（需 app.json 配 requiredBackgroundModes: ["audio"]）
 *   2. 锁屏与控制中心出现播放条（title / singer / coverImgUrl 必填）
 *   3. 被来电或其他 app 抢走音频焦点时由系统自动暂停，回到前台可续播
 *
 * ⚠️ 它与 InnerAudioContext 的三个关键行为差异，改这里之前必须知道：
 *   a. **src 是「赋值即播」**，没有「先加载、暂不播」这种中间态。切歌 = 重设 src。
 *   b. **stop() 之后 play() 无效**，必须重新设 src。所以关闭后要清空 currentId，
 *      让下一次播放走 loadAndPlay，而不是直接 play()。
 *   c. **onPlay / onPause 等是「监听」不是「覆盖」**，重复绑定会叠加回调。
 *      本项目播放器是全模块单例、从不 destroy，所以 bindOnce 只绑一次即可。
 *   d. **seek 是「系统代劳」的**，锁屏 / 控制中心拖动进度条由微信自己调 seek，
 *      不经过本模块。所以三段逻辑必须自己补：
 *      · onSeeking 期间到 onSeeked 之后的一小段时间，队列里会残留「跳转前」的
 *        timeupdate 帧，直接广播会让进度条回跳再弹回（锁屏拖动最明显）；
 *      · onSeeked 回调里 Android 的 currentTime 还是跳转前的位置（iOS 才是新的），
 *        所以只能用「我们记录的目标位置」回推 UI，不能读属性；
 *      · 部分 iOS 在锁屏拖动时会先 pause、拖完不自动恢复，表现为「拖完就没声了」。
 *        用 want（用户意图）而不是 playing（真实状态）来判断该不该续播。
 * ------------------------------------------------------------------ */
const { POEMS } = require('../data/poems.js');
const db = require('./db.js');
const audioSession = require('./audio-session.js');

function hasAudio(poem) {
  return !!(poem && poem.audioUrl);
}

function poemAudioUrl(id) {
  const p = POEMS.find(function (x) { return x.id === id; });
  return p ? p.audioUrl : '';
}

/**
 * 解析可播放地址。
 * 代码包内的音频（/assets/audio/x.mp3）在真机上读不到，先拷到 wx.env.USER_DATA_PATH 再播；
 * 网络地址与已拷好的本地地址直接用。
 * 拷贝结果按文件名缓存，同一首不会重复拷贝。
 * 注：当前 40 首全部是 cloud:// fileID，这条本地分支实际不会走到，留作离线降级。
 */
const AUDIO_DIR = (wx.env && wx.env.USER_DATA_PATH ? wx.env.USER_DATA_PATH : '') + '/audio';
let dirReady = false;

function ensureDir() {
  if (dirReady) return true;
  try {
    const fs = wx.getFileSystemManager();
    try { fs.accessSync(AUDIO_DIR); } catch (e) { fs.mkdirSync(AUDIO_DIR, true); }
    dirReady = true;
    return true;
  } catch (e) {
    return false;
  }
}

function resolveSrc(raw) {
  if (!raw) return '';
  // 云存储 fileID：BackgroundAudioManager 从 2.2.3 起原生支持 cloud://，直接交给它
  if (raw.indexOf('cloud://') === 0) return raw;
  if (/^(https?:)?\/\//.test(raw) || raw.indexOf('wxfile://') === 0) return raw;
  if (!ensureDir()) {
    warnOnce('nodir', '[诗韵] 用户目录不可用，改用包内音频路径', raw);
    return raw;
  }
  const dest = AUDIO_DIR + '/' + raw.split('/').pop();
  const fs = wx.getFileSystemManager();
  try {
    const st = fs.statSync(dest);
    // ⚠️ 只认「有内容」的缓存：0 字节说明上次是失败留下的壳，必须重拷
    if (st && st.size > 0) return dest;
  } catch (e) {}

  // 包内源文件是否存在，先探一次 —— 直接 copyFileSync 抛错时只有原生报错，查不动
  try {
    fs.accessSync(raw);
  } catch (e) {
    warnOnce('missing:' + raw, '[诗韵] 代码包里没有音频文件：' + raw, e);
    return raw;
  }

  try {
    fs.copyFileSync(raw, dest);
    return dest;
  } catch (e) {
    warnOnce('copy:' + raw, '[诗韵] 音频拷贝到用户目录失败，回退包内路径', raw, e);
    return raw;
  }
}

/** 同一类告警只打一次，避免连播时刷屏（真机 console 会限流，日志一多反而看不到关键信息） */
const warned = {};
function warnOnce(key) {
  if (warned[key]) return;
  warned[key] = true;
  console.warn.apply(console, Array.prototype.slice.call(arguments, 1));
}

/**
 * 等待 seek 兑现的上限（ms）。
 * 位置一直没到就说明这次 seek 没成功（云文件拉流失败等），
 * 此时按真实位置上报 —— 宁可显示原位置，也不能让进度条永久冻住。
 */
const SEEK_SETTLE_MS = 2500;

/**
 * 拖动进度条时假 ended 的保护窗（ms），由 onSeeking 设置。
 * 拖动常常持续 1 秒以上，markSeek 的 400ms 在松手前就过期了 —— 这是
 * 「拖一下直接从头播」的根因。宁可多挡一会儿（真播完也会被挡），
 * 也不能让一次拖动被当成播完。
 */
const SEEK_GUARD_DRAG_MS = 6000;

/** seek 完成之后，假 ended 还可能迟到一段（ms） */
const SEEK_GUARD_TAIL_MS = 1500;

/**
 * ⚠️ 曾在这里做过「seek 过渡期静音」和「seek 之后补 play()」，两者都已删除，别再捡回来：
 *
 *   · 静音：**BackgroundAudioManager 没有 volume 属性**（那是 InnerAudioContext 的）。
 *     真机日志（2026-10-27）里一整轮 seek 都没打出 MUTED —— 说明
 *     `typeof bgm.volume !== 'number'`，静音分支在真机上是死代码，一行都没执行。
 *     想调音量只能重设 src 或调系统音量，都不能用于 seek 过渡。
 *
 *   · 补 play()：真机日志 #15~#19 拍到了现场 ——
 *       #15 api.seek ... cur=24.2 | pct=15 -> 9.1
 *       #16 onSeeking paused=1 cur=9.2            ← iOS 在 seek 期间自己把 paused 置 1
 *       #17 nudge->play ... SEEKING pending=9.1   ← 我们在 seek 还没落地时插了一次 play()
 *       #18 onSeeked paused=0 cur=9.2             ← 系统本来就会自己恢复
 *       #21 seek-check target=9.1 cur=9.5 OK      ← 位置本来就是对的
 *     也就是说：位置落地没问题，是我们那一下「提前 play()」把还没落地的 seek 打断，
 *     解码从旧位置（甚至 0）重新来过 —— 用户听到的就是「跳一下 / 重播一小段」。
 *     现在只在 seek **完成之后**、且底层确实停在暂停态时，才把声音接回来。
 */

/**
 * 暂停之后多久内收到的 onPlay 视为「系统补发的多余起播」（ms）。
 * 真机日志 #22→#23：通知中心按暂停，0.4 秒后系统自己发了一个 onPlay，
 * 声音响了两秒才停回去 —— 用户看到的就是「按钮闪一下播放再闪回暂停」。
 */
const SPURIOUS_RESUME_MS = 1500;

/**
 * 播放器单例。
 * 用法：
 *   const a = getAudioPlayer();
 *   a.play(poemId) / a.pause() / a.resume()
 *   a.onProgress(fn)  fn({ progress, time, duration })
 *   a.onState(fn)     fn({ playing, poemId })
 *   a.setLoopMode('single' | 'order' | 'random')
 */
function createPlayer() {
  // 只影响 InnerAudioContext，对 BackgroundAudioManager 无效（后者天然是 playback 类别，
  // 本来就不遵循静音开关）。保留是为了将来若出现提示音之类的短期音效仍能出声。
  audioSession.setup();

  const bgm = (typeof wx.getBackgroundAudioManager === 'function')
    ? wx.getBackgroundAudioManager()
    : null;

  if (!bgm) {
    console.warn('[诗韵] 当前环境不支持 BackgroundAudioManager，朗读不可用');
  }

  let currentId = '';
  let playing = false;
  let loopMode = 'single';
  let listeners = { progress: [], state: [] };
  let expanded = false;
  let bound = false;

  /**
   * want = 「用户想让它在播」，与 playing（真实状态）分开记。
   * 被其他 app 抢焦点、锁屏拖动进度条都会让系统把 paused 改成 true，
   * 那时 playing 已经是 false，但用户的意图仍然是「要听」——
   * 拖动结束后该不该自动续上，只能看 want。
   */
  let want = false;

  /**
   * 暂停**之前**的播放意图。
   * 系统暂停（通知中心 / 锁屏 / 被抢焦点）必须把 want 清掉，否则暂停时底层补发的
   * 假 ended 会把播放重新拉起来（「点暂停，按钮回弹一次」）。可 iOS 拖动进度条
   * 也会先 pause 一次，那一次不能清 —— 否则「拖完就没声」。
   * 两者唯一的区别是：拖动之后紧接着一定会来 seek。所以暂停时先在这里留一份原值，
   * 由 onSeeking / onSeeked 确认是拖动后再还原。
   */
  let wantLatch = false;
  /** 最近一次暂停的时刻，用来判断那次暂停是不是「紧跟拖动」 */
  let pausedAt = 0;
  /** 我们自己发起 seek 的时刻（0 = 没有）。系统拖动不经过它，用来区分两种 seek */
  let ownSeekAt = 0;

  /**
   * 待兑现的 seek（秒）。**-1 = 没有**。
   * 从调用 seek() 起、到 timeupdate 报来「已经到达」为止，这段时间一帧位置都不广播。
   * 换成时间窗（旧做法）治不了「回跳」：云文件 seek 要重新拉流，多久到不确定。
   */
  let pendingSeek = -1;
  let pendingSeekAt = 0;
  /**
   * 假 ended 的保护截止时间戳。只服务 onEnded，和进度上报无关。
   * ⚠️ 系统拖动（锁屏 / 控制中心）不会经过 seek()，所以要由 onSeeking / onSeeked 来设，
   * 只靠 markSeek 的 400ms 窗口等于没设。
   */
  let seekGuardUntil = 0;
  /** 系统 seek 进行中（onSeeking 起、onSeeked 止；不派发时靠自愈兜底） */
  let seeking = false;
  let seekingAt = 0;
  /** 最近一次已广播的位置，用来识别「位置还在乱跳 = 拖动没结束」 */
  let lastPos = 0;
  /** lastPos 的采集时刻，用来做「物理上不可能播到末尾」的推算 */
  let lastPosAt = 0;
  /**
   * 上一帧拿到的时长。
   * 部分平台在 ended 之后会把 duration 重置成 0，那时若直接按「没有时长 → 假 ended」
   * 判断，正常的单曲循环就再也走不到了。用这一份记忆兜住。
   */
  let lastDuration = 0;
  /** 假 ended 之后延迟续播的定时器句柄（0 = 没有） */
  let resumeTimer = 0;

  /**
   * 最近一次「确认的暂停」时刻（0 = 没有）。
   * 用来挡系统补发的那一下 onPlay：暂停后 1.5 秒内收到的 onPlay 一律当作多余起播。
   */
  let pauseIntentAt = 0;

  /**
   * 最近一次「我们自己调 bgm.pause()」的时刻。
   * onPause 里要区分两种暂停：用户按的（必须清 want）和 seek 造成的中间态
   * （要保留 want，否则拖完就没声）。我们自己按的那一下永远算前者 ——
   * api.pause() 会把 want 写 false，这里只是防止 onPause 的 seek 判据把它又翻回来。
   */
  let apiPauseAt = 0;

  /* ================= 诊断日志 =================
   * 「暂停后按钮回弹」「拖动后声音跳跃」这类问题只在真机出现，看代码只能猜。
   * 每一条都带上完整状态（playing / want / paused / cur / dur / seeking / pending），
   * 复现一次就能看出是谁把播放态改回去的。
   * 用法：真机调试 → 复现 → Console 里筛 `[AUDIO]` → 全选复制。
   * ⚠️ 上线前把 TRACE_ON 改成 false。
   * ============================================ */
  const TRACE_ON = true;
  const TRACE_MAX = 240;
  const traceBuf = [];
  let traceSeq = 0;
  let lastTraceSec = 0;

  function num(v) {
    return (typeof v === 'number' && isFinite(v)) ? v.toFixed(1) : '?';
  }

  function trace(evt, extra) {
    if (!TRACE_ON) return;
    traceSeq++;
    let line = '#' + traceSeq + ' ' + evt
      + ' playing=' + (playing ? 1 : 0)
      + ' want=' + (want ? 1 : 0)
      + ' paused=' + (bgm && typeof bgm.paused === 'boolean' ? (bgm.paused ? 1 : 0) : '?')
      + ' cur=' + num(bgm && bgm.currentTime)
      + ' dur=' + num(bgm && bgm.duration);
    if (seeking) line += ' SEEKING';
    if (pendingSeek >= 0) line += ' pending=' + num(pendingSeek);
    if (Date.now() < seekGuardUntil) line += ' guard=' + Math.round(seekGuardUntil - Date.now());
    if (extra) line += ' | ' + extra;
    traceBuf.push(line);
    if (traceBuf.length > TRACE_MAX) traceBuf.shift();
    console.log('[AUDIO] ' + line);
  }

  function emitState() {
    listeners.state.slice().forEach(function (fn) {
      fn({ playing: playing, poemId: currentId, loopMode: loopMode, expanded: expanded });
    });
  }

  /**
   * 用 bgm.paused 校正播放态。
   * 被其他 app 抢走音频焦点时，部分 iOS 版本只把 paused 改成 true、并不发 onPause，
   * 所以事件参数不能全信 —— 以只读属性为准，拿不到时才用事件参数兜底。
   */
  function syncPlaying(fallback) {
    const actual = (bgm && typeof bgm.paused === 'boolean') ? !bgm.paused : !!fallback;
    if (playing === actual) return;
    playing = actual;
    emitState();
  }

  /** 回推进度。onTimeUpdate / seek / onSeeked 三处共用，口径必须一致 */
  function emitProgress(t, duration) {
    const progress = duration > 0 ? (t / duration) * 100 : 0;
    listeners.progress.slice().forEach(function (fn) {
      fn({ progress: progress, time: t, duration: duration });
    });
  }

  /**
   * 标记一次 seek。
   * @param {number} t 目标秒数
   */
  function markSeek(t) {
    pendingSeek = t;
    pendingSeekAt = Date.now();
    // 400ms 只用来挡「拖动附带的假 ended」，和进度上报的时间窗无关。
    // 太长会把「拖到末尾自然播完」也一起吞掉。
    seekGuardUntil = Date.now() + 400;
  }

  /**
   * 这次 seek 是不是我们自己发起的（页面点/拖进度条）。
   * 用时间戳而不是布尔量：onSeeked 个别环境不派发，布尔量会永久卡住。
   */
  function isOwnSeek() {
    return ownSeekAt > 0 && Date.now() - ownSeekAt < 1500;
  }

  /**
   * 还原「被暂停抹掉」的播放意图。
   * 只在一个很窄的条件下成立：刚暂停不到 2 秒、紧接着来了一次**系统** seek。
   * 那就是 iOS 拖动进度条时先 pause 的现场 —— 用户要的是「换个位置继续听」。
   * ⚠️ 自己发起的 seek 不还原：用户先按暂停、再点进度条，不该自己播起来。
   */
  function restoreWant() {
    if (want) return;
    if (!wantLatch) return;
    if (isOwnSeek()) return;
    if (Date.now() - pausedAt > 2000) return;
    want = true;
  }

  /**
   * seek 完成之后，如果用户还想听、而底层确实停在暂停态，就把声音接回来。
   *
   * ⚠️ 只能在 seek **完成之后**调，绝不能在 seek 途中调。
   * 真机日志（2026-10-27，#15~#21）拍到了现场：
   *   #16 onSeeking paused=1        ← iOS 在 seek 期间会自己把 paused 置 1
   *   #17 nudge->play ... SEEKING   ← 我们在 seek 还没落地时插了一次 play()
   *   #18 onSeeked paused=0         ← 系统本来就会自己恢复
   *   #21 seek-check cur=9.5 OK     ← 位置本来就是对的
   * 那一下「提前 play()」会打断还没落地的 seek，让解码从旧位置（甚至 0）重新开始，
   * 听感就是「拖一下，声音跳一下 / 重播一小段」。
   * 现在只在落地之后补，而且只补**真的需要**的那一次（paused 为真才调）。
   */
  function resumeIfWanted() {
    if (!bgm || !currentId || !want) return;
    if (!bgm.paused) return;
    trace('seek->resume');
    try { bgm.play(); } catch (e) {}
  }

  /**
   * 绑一个原生事件，事件不存在就跳过。
   * 只有 seek 两个事件走这里：它们是后加的能力，个别低版本基础库没有，
   * 缺了应当降级成「没有 seek 纠偏」，而不是让整个播放器起不来。
   * （onPlay / onPause 这些是播放器的基础事件，缺了本来就播不了，不在此列。）
   */
  function listen(name, fn) {
    if (bgm && typeof bgm[name] === 'function') bgm[name](fn);
  }

  /** 原生事件只绑一次（onXxx 是监听不是覆盖，重复绑定会叠加回调） */
  function bindOnce() {
    if (bound || !bgm) return;
    bound = true;

    bgm.onPlay(function () {
      trace('onPlay');
      // ⚠️ 这里**不设 want**。曾经在这里写 `want = true`（想照顾系统自动续播），
      // 结果迟到的 onPlay 会把「用户刚按的暂停」改回「要继续播」，假 ended 借机把声音拉起来。
      // want 只认 api 层（play / resume / pause / close）和 restoreWant()，来源清楚才可控。

      // ⚠️ 通知中心 / 锁屏按暂停之后，iOS 常常**自己补发一个 play**。
      // 真机日志（2026-10-27 #22→#23）：onPause 之后 0.4 秒就来 onPlay，
      // 声音一直响到 40.8 秒才被停回去 —— 用户看到的就是「按钮闪一下播放再闪回暂停」。
      // 那一刻我们所有会调 play() 的路径都被 want=0 挡着，所以这声音只能是系统起的。
      // 拦截要点：**连 playing 一起不改**。一旦改成 true 就会广播出去，
      // 界面必然闪那一下；这里直接按暂停处理，界面从头到尾停在暂停态。
      if (!want && pauseIntentAt > 0 && Date.now() - pauseIntentAt < SPURIOUS_RESUME_MS) {
        trace('onPlay->reject', 'sincePause=' + Math.round(Date.now() - pauseIntentAt));
        playing = false;
        try { bgm.pause(); } catch (e) {}
        return;
      }

      syncPlaying(true);
    });

    bgm.onPause(function () {
      trace('onPause');
      syncPlaying(false);

      // 「这次暂停是用户不想听了，还是 seek 造成的中间态？」—— 这是整个播放器
      // 最容易搞错的一处判断，改之前把下面两段读完。
      //
      // ⚠️ 旧写法：处在 seek 保护窗内就「保留意图」，其余才清 want。
      // 而保护窗在拖动后能留 1.5~6 秒，用户在这个窗口里从通知中心按暂停时
      // want 还是 true，紧接着底层为「流被打断」补发一个 ended，handleFakeEnded
      // 就按 want 把声音拉起来 —— 界面「暂停 → 播放 → 又暂停」，正是用户报的回弹。
      // **时间窗不能当意图判据**，它只能当「别乱判假的」的判据。
      //
      // ⚠️ 也不能一律清 want：iOS 拖动进度条时会先派一次 pause，清了就是「拖完没声」。
      // 真正的区别是「这次暂停后面有没有跟着一次 seek」—— 拖动有，按暂停没有。
      // 所以这里只看 seek 的现场证据：我们刚发起的 seek，或者系统拖动的 seeking 阶段。
      // ⚠️ 特意**不**把「onSeeked 之后 200ms 内」也算作 seek 现场 ——
      // 用户拖完马上在通知中心按暂停是这个 App 最常见的操作序列，
      // 把它算成「拖动引起的暂停」就又把 want 保住了，ended 一来照样回弹。
      const byApiPause = apiPauseAt > 0 && Date.now() - apiPauseAt < 500;
      const bySeek = !byApiPause && (
        isOwnSeek() ||
        (seeking && Date.now() - seekingAt < 2000)
      );
      if (bySeek) {
        // 意图保留，seek 落地之后由 resumeIfWanted() 把声音接回来
        wantLatch = want;
        return;
      }

      // 用户 / 系统要求暂停 → 必须清掉 want。
      // 不清的后果：暂停打断了还没落地的流，底层把它当成「播完」补发一个 ended，
      // 位置判据全过 → handleFakeEnded 600ms 后按 want 把声音拉起来。
      wantLatch = want;
      want = false;
      pausedAt = Date.now();
      // 给 onPlay 一个「这是刚暂停，别再响」的判据（见 onPlay 里的拦截）
      pauseIntentAt = pausedAt;
    });

    bgm.onStop(function () {
      trace('onStop');
      // 控制中心 / 通知栏点了「停止」：语义等同关闭本次播放。
      // ⚠️ stop 之后 play() 无效（必须重设 src），所以这里直接清空曲目，
      // 让下一次播放走 loadAndPlay 而不是空转的 play()。
      currentId = '';
      playing = false;
      want = false;
      pauseIntentAt = Date.now();
      emitState();
    });

    bgm.onEnded(function () { onEnded(); });

    /**
     * 系统代劳的 seek（锁屏 / 控制中心拖动进度条）。
     * 进入这个回调时进度正在变，但 UI 不知道 —— 期间一律不广播位置，
     * 否则拖动中会看到秒数来回乱跳。
     */
    listen('onSeeking', function () {
      // 暂停紧跟一次 seek = 这次暂停是拖动引起的（iOS 常见），把意图还原，
      // 否则「拖完就没声」。用户主动暂停后不会再跟 seek，所以不会误还原。
      restoreWant();
      trace('onSeeking');
      seeking = true;
      seekingAt = Date.now();
      // ⚠️ 这里是「拖动后回到起始位置播放」的第一道闸门。
      // 系统拖动进度条会顺带派一个「时间并没到末尾」的假 ended，而这次 seek
      // 完全不经过我们的 seek()，markSeek 永远轮不到执行 —— 保护窗必须是 0，
      // 假 ended 就一路走到 onEnded 的单曲循环分支（seek(0) + play()）。
      // 拖动可能持续好几秒，所以窗口要按「一次完整拖动」的量级给。
      seekGuardUntil = Date.now() + SEEK_GUARD_DRAG_MS;
    });

    /**
     * seek 完成。
     * ⚠️ 这里是「位置回跳」的根因所在，改之前把整段读完：
     * 系统发起的 seek（锁屏 / 控制中心拖动）我们手里**没有任何可信的目标位置**——
     *   · onSeeked 不带参数；
     *   · currentTime 在 Android 的 onSeeked 里还是跳转前的值（iOS 才是新的）；
     *   · 官方明确 onTimeUpdate「只有小程序在前台时会回调」，锁屏期间根本没人报位置。
     * 上一版在这里拿 currentTime 回推、再 260ms 后读一次纠正，两次都可能读到旧值，
     * 于是 UI 先跳到旧位置、回前台又跳回来 —— 就是用户看到的「位置回跳」。
     * 现在只回推**我们自己发起**的那次 seek（目标位置已知），系统 seek 一律不猜：
     * 等回前台的第一帧 timeupdate / `refreshState()` 去对齐，那里拿到的才是真位置。
     */
    listen('onSeeked', function () {
      // onSeeking 没派发时（部分机型）还能在这里认领那次「拖动引起的暂停」
      restoreWant();
      trace('onSeeked');
      seeking = false;
      seekingAt = Date.now();
      // 松手之后假 ended 还会迟到一小段（部分机型在 seek 落地那一帧才派）
      seekGuardUntil = Date.now() + SEEK_GUARD_TAIL_MS;
      const own = (pendingSeek >= 0 && Date.now() - pendingSeekAt < 3000) ? pendingSeek : -1;
      if (own >= 0) emitProgress(own, (bgm && bgm.duration) || 0);
      ownSeekAt = 0;

      // ⚠️ 这里**不要急着 play()**，更不许在 seek 途中 play()。
      // 真机日志（2026-10-27 #15~#21）：iOS 在 seek 期间自己会把 paused 置 1，
      // 系统落地后又会自己置回 0；我们原来在这中间插了一次 play()，
      // 反而把还没落地的 seek 打断，解码从旧位置（甚至 0）重来 —— 那就是「跳跃」。
      // 现在只在「确实停在暂停态、且用户还想听」时补这一次（典型场景：
      // 拖动前系统先 pause 且不自动恢复，不清 want 就会「拖完没声」）。
      resumeIfWanted();
    });

    bgm.onTimeUpdate(function () {
      if (!bgm) return;
      const duration = bgm.duration || 0;
      const t = bgm.currentTime || 0;
      // 诊断：seek 期间每帧都留，平时 4 秒一条，避免把 240 条环形缓冲刷掉
      if (seeking || pendingSeek >= 0 || Math.abs(t - lastTraceSec) >= 4) {
        lastTraceSec = t;
        trace('time');
      }

      // ① 拖动中：位置在来回乱跳，一帧都不能报，否则秒数跳来跳去。
      //    ⚠️ 自愈不能只按时间算：一次拖动常常超过 800ms，可 onSeeking 只在开头派一次，
      //    时间一到就放行会让后半程重新开始乱跳。所以「位置还在大幅跳变」
      //    也当作拖动仍在进行，并把自愈时限往后推。
      if (seeking) {
        const jumping = lastPos > 0 && Math.abs(t - lastPos) > 1.5;
        if (jumping) {
          lastPos = t;
          seekingAt = Date.now();
          return;
        }
        if (Date.now() - seekingAt <= 800) return;
        // 自愈：onSeeked 个别环境不派发（开发者工具就不走），标志不能永久卡住
        seeking = false;
      }

      // ② 有未兑现的 seek 时同样**一帧都不报**。
      // 音频跳到新位置需要时间（云文件还得重新拉流），这段时间来的帧全是旧位置，
      // 报出去就是「拖完弹回去」。等着就好 —— UI 仍停在我们 seek 时填的目标位置上，
      // 位置真正到位才继续播报。超时兜底是为了 seek 失败时别让进度条永久冻住。
      if (pendingSeek >= 0) {
        if (Math.abs(t - pendingSeek) <= 1.5) pendingSeek = -1;              // 到位
        else if (Date.now() - pendingSeekAt < SEEK_SETTLE_MS) return;        // 还在路上
        else pendingSeek = -1;                                              // 超时认命，按真位置报
      }
      lastPos = t;
      lastPosAt = Date.now();
      // 取最大值：同一首的时长会随着缓冲慢慢长上来，但绝不会缩水。
      // 缩水说明刚重新拉过流（见 isFakeEnded 的第 ⑤ 条判据）。
      if (duration > lastDuration) lastDuration = duration;
      emitProgress(t, duration);
    });

    bgm.onError(function (err) {
      trace('onError', (err && (err.errMsg || err.errCode)) || '');
      console.warn('[诗韵] 音频播放失败', currentId, err);
      // 出错时别把音量永久留在 0（静音过渡中失败的情况）—— 否则下次播放没声
      playing = false;
      want = false;
      pauseIntentAt = Date.now();
      emitState();
    });

    // 锁屏 / 控制中心的上一首、下一首。按可播放序列的物理顺序走，
    // 与页面里的上下一首一致；随机循环模式下也走顺序 —— 锁屏按钮上按「下一首」
    // 跳到随机一首会让人以为点错了。
    bgm.onNext(function () { trace('onNext'); stepBy(1); });
    bgm.onPrev(function () { trace('onPrev'); stepBy(-1); });
  }

  function stepBy(delta) {
    const ids = playableIds();
    if (!ids.length) return;
    const idx = ids.indexOf(currentId);
    if (idx < 0) { loadAndPlay(ids[0]); return; }
    loadAndPlay(ids[(idx + delta + ids.length) % ids.length]);
  }

  /**
   * 判断这次 ended 是不是「拖动进度条附带的假播完」。
   * 真播完必然停在末尾，所以下面三条任一条成立就可以判为假：
   *   ① 系统 seek 正在进行（onSeeking 已到、onSeeked 还没到）；
   *   ② 处在保护窗内（拖动由 onSeeking 把窗口拉长到 6 秒）；
   *   ③ 位置明显不在末尾 —— 拿不到时长（重缓冲时 duration 会是 0）也算。
   * ⚠️ 只靠 ② 是不够的：上一版只有 seek()（页面内）会设 400ms 的窗口，
   * 锁屏拖动根本不经过它，于是假 ended 一路走到单曲循环的 seek(0)。
   */
  function isFakeEnded() {
    if (!bgm) return false;
    if (seeking) return true;
    if (Date.now() < seekGuardUntil) return true;
    // ended 之后 duration 可能已被重置成 0，用记忆里的时长兜住正常循环
    const curDur = bgm.duration || 0;
    const dur = curDur || lastDuration || 0;
    const cur = bgm.currentTime || 0;
    if (dur <= 0) return true;
    // ⑤ 时长比记忆里短了一大截 → 底层刚重新拉过流，此刻的 duration 是
    //    「已缓冲片段」的长度，拿它跟 currentTime 比对毫无意义。
    //    seek 到远端之后最容易出现，判错了就是「暂停一下从头播」。
    if (lastDuration > 0 && curDur > 0 && curDur + 3 < lastDuration) return true;
    if (cur > 0 && cur < dur - 2) return true;
    // ④ 物理上不可能：从最后一次已知位置到末尾还差 (dur - lastPos) 秒，
    //    而墙钟只过去了 elapsed 秒。差得远就说明根本没播到末尾。
    //    这条不依赖任何事件，专门兜住「onSeeking 没派发、currentTime 又被重置成 0」
    //    这种最坏组合 —— 那时前面的判据全部失效，只有它还能认出来。
    if (lastPos > 0 && lastPosAt > 0) {
      const elapsed = (Date.now() - lastPosAt) / 1000;
      if (dur - lastPos - elapsed > 3) return true;
    }
    return false;
  }

  /**
   * 假 ended 之后只做一件事：把声音接回来。
   * **绝不能 seek，也不能重设 src** —— 系统那次 seek 还在飞，此刻任何
   * 「回到起点」的动作都会让用户真的从头听一遍。上一版单曲循环在这里
   * seek(0)+play()，正是「拖动后回到起始位置播放」的来源。
   */
  function handleFakeEnded(tries) {
    const n = tries || 0;
    trace('fakeEnded->wait', 'try=' + n);
    if (resumeTimer) clearTimeout(resumeTimer);
    // 等系统 seek 落地再决定要不要续播：seek 进行中 paused 是正常中间态，
    // 这时候 play() 会打断 seek，反而把自己送回起点。
    resumeTimer = setTimeout(function () {
      resumeTimer = 0;
      if (!bgm || !currentId) return;
      // ⚠️ seeking 可能卡住：暂停状态下没有 timeupdate，那里的自愈轮不到执行。
      if (seeking && Date.now() - seekingAt > 800) seeking = false;
      if (seeking && n < 3) { handleFakeEnded(n + 1); return; }   // 还在拖 / 还在 seek，再等一轮
      // ⚠️ 只在「确实有一次 seek 在飞」时才续播。want 可能被迟到的事件重新点亮，
      // 光靠它会把用户刚按下的暂停又拉起来 —— 这正是「点暂停，按钮回弹」的另一条路。
      const seekEvidence = pendingSeek >= 0 || Date.now() < seekGuardUntil;
      if (!want) { trace('fakeEnded->drop(want=0)'); return; }
      if (!bgm.paused) { trace('fakeEnded->still-playing'); return; }
      if (seekEvidence) {
        trace('fakeEnded->resume');
        try { bgm.play(); } catch (e) {}
      } else {
        // 没有 seek 作证，说明这次暂停不是拖动引起的：别硬拉起来，
        // 但要承认「现在是暂停」，否则按钮显示在播、其实没声。
        trace('fakeEnded->drop(no-seek)');
        syncPlaying(false);
      }
    }, 600);
  }

  /**
   * 位置是否真的在末尾。
   * 只用来判「自然播完」—— 部分机型在播到尾时会先派 pause 再派 ended，
   * 而 onPause 会把 want 清掉，那一下若不放行，连播和单曲循环就全断了。
   */
  function atTrackEnd() {
    if (!bgm) return false;
    const dur = bgm.duration || lastDuration || 0;
    const cur = bgm.currentTime || 0;
    if (dur <= 0) return false;
    return cur >= dur - 1.5;
  }

  function onEnded() {
    trace('onEnded');
    // ⚠️ 第一道闸门必须是「用户到底想不想听」，而不是任何位置/时长判断。
    // 锁屏拖动之后，`bgm.pause()` 很容易让底层补发一个 ended（seek 未落地就被打断，
    // 播放器把它当成到达流末尾）。此时若继续走下面的单曲循环分支，
    // `seek(0) + play()` 会立刻把刚暂停的音频从头播起来 ——
    // 用户看到的就是「点暂停，按钮闪一下暂停，然后从头播」。
    // ⚠️ 唯一的例外：位置确实在末尾。那是自然播完（部分机型先派 pause 再派 ended），
    // 不放行就会「播完一首就再也不走了」。位置在中间的一律算假 ended。
    if (!want) {
      if (!atTrackEnd()) { trace('ended->ignore(want=0)'); return; }
      want = true;
    }

    if (isFakeEnded()) { trace('ended->fake'); handleFakeEnded(); return; }

    if (loopMode === 'single') {
      if (!bgm || !currentId) return;
      // BackgroundAudioManager 没有 loop 属性，只能手动回到起点再播。
      // 不用重设 src：同一首重设会导致封面/标题闪一下，且要等重新起播。
      const repeatId = currentId;
      // ended 回调里 src 可能已被系统清空，此时 seek/play 都是空转 —— 直接重设
      if (!bgm.src) {
        loadAndPlay(repeatId);
        return;
      }
      try {
        // 先记目标位置再 seek：seek(0) 之后队列里还会压着几帧「末尾」的旧位置，
        // 不挡就会看到进度条从 100% 弹回 0。
        markSeek(0);
        bgm.seek(0);
        bgm.play();
      } catch (e) {
        // 个别机型 ended 之后 seek + play 不生效，退回重设 src
        loadAndPlay(repeatId);
        return;
      }
      // ⚠️ seek + play 是异步的，上面的 catch 抓不到「静默失败」。
      // 700ms 后仍停在暂停态就退回重设 src，否则表现为「循环到第二遍就没声了」。
      // ⚠️ 但这段兜底自己也会变成 bug：若此刻有 seek 在飞（拖动刚结束），
      // 重设 src 会打断它并把播放位置归零 —— 表现就是「过几秒又从头播一段」。
      setTimeout(function () {
        if (!bgm || currentId !== repeatId) return;
        if (seeking || Date.now() < seekGuardUntil) return;
        if (want && bgm.paused) loadAndPlay(repeatId);
      }, 700);
      return;
    }
    // 顺序 / 随机。
    // ⚠️ 必须在「可播放序列」里走，与页面/悬浮条的上下一首保持一致 ——
    // 否则一旦有诗词没音频，自动连播会跳到一个播不了的条目上，声音就断了。
    const ids = playableIds();
    if (!ids.length) return;
    const idx = ids.indexOf(currentId);
    let next;
    if (loopMode === 'order') {
      next = idx < 0 ? 0 : (idx + 1) % ids.length;
    } else {
      next = Math.floor(Math.random() * ids.length);
    }
    loadAndPlay(ids[next]);
  }

  /** 清空曲目并停播（无音频、或外部要求关闭时用） */
  function stopAll() {
    if (bgm) {
      try { bgm.stop(); } catch (e) {}
    }
    currentId = '';
    playing = false;
    want = false;
    wantLatch = false;
    ownSeekAt = 0;
    pausedAt = 0;
    pauseIntentAt = 0;
    apiPauseAt = 0;
    emitState();
  }

  /**
   * @param {string} id 诗词 id
   * @param {boolean} expandAfter 起播后是否展开悬浮播放器（页面内播放入口用）
   */
  function loadAndPlay(id, expandAfter) {
    const poem = POEMS.find(function (p) { return p.id === id; });
    if (!hasAudio(poem)) {
      // 无音频：停掉当前、清空当前曲目，避免下次 toggle 误播上一首，
      // 也避免悬浮条出现一个根本播不了的条目
      stopAll();
      return;
    }
    if (!bgm) return;

    // 上一首的假 ended 续播定时器要作废，否则它会在新曲目上按旧现场补一次 play()
    if (resumeTimer) { clearTimeout(resumeTimer); resumeTimer = 0; }

    bindOnce();
    currentId = id;
    trace('api.play', id);

    // ⚠️ 这里是新旧实现最大的差异：BackgroundAudioManager 的 src 是「赋值即播」，
    // 没有「先加载、暂不播」的中间态，所以切歌就等于重设 src。
    // title 必须设，否则 iOS 控制中心不显示且可能报错；singer/cover 是加分项。
    //
    // ⚠️ 「切歌后锁屏内容不更新」的修法在这三行清空上：
    // 锁屏卡片只在**属性发生变化**时才重建 nowPlayingInfo，而微信内部做了脏值比较。
    // 同一个 BAM 实例连着换歌时，某些机型就停在第一次那份信息上。
    // 先清空再赋值，强制制造一次变更（同步连续赋值，中间的空值不会被渲染出来）。
    bgm.title = '';
    bgm.singer = '';
    bgm.epname = '';

    bgm.title = poem.title;
    bgm.singer = (poem.author || '') + (poem.dynasty ? ' · ' + poem.dynasty : '');
    // epname 原来是固定常量「诗韵 · 标准朗读」。锁屏/通知栏的副行在部分机型上读的就是它，
    // 那样切歌后那一行永远不动 —— 用户看到的就是「锁屏内容没变化」。让 epname 也随诗走。
    bgm.epname = '诗韵 · ' + poem.title;
    // 锁屏封面只认网络地址（cloud:// 或 https），包内本地图在锁屏上显示不出来，
    // 设了也只会静默落空。当前 40 首里只有 p001 带图且是 /assets/ 本地路径，
    // 所以实际上不会设封 —— 锁屏显示微信默认图。
    // TODO 图片上云 stor 后要补：切到「无封面」的诗时，上一首的 coverImgUrl 会残留，
    //      需要在上面那组清空里一并置 ''。
    if (poem.img && (poem.img.indexOf('cloud://') === 0 || /^https?:\/\//.test(poem.img))) {
      bgm.coverImgUrl = poem.img;
    }
    // ⚠️ 必须在设 src 之前把「要播」的意图立起来，并把「刚暂停」的拦截窗口清掉。
    // src 是**同步起播**的：onPlay 会在这一行内就回调进来，那时若 want 还是 false
    // （上一首刚 stop / 刚 pause 过），会被 onPlay 里的「系统多余起播」拦截直接压回去 ——
    // 表现是「切歌之后点了没反应」。
    want = true;
    pauseIntentAt = 0;
    bgm.src = resolveSrc(poem.audioUrl);

    // 先假定在播：src 赋值是异步起播，若等 onPlay 才广播，
    // 悬浮条会有一段「按了没反应」的空窗。
    // ⚠️ 这里必须「无条件」广播，不能图省事走 setPlaying(true) ——
    // 切歌时 playing 本来往往就是 true，带守卫的写法会把广播吃掉，
    // 于是 currentId 已变却没人收到通知（「切歌后诗名不更新」的根因）。
    want = true;
    playing = true;
    // 新曲目从 0 开始，把上一首的 seek 记录清掉，否则保护窗口会误伤新曲的首帧
    pendingSeek = -1;
    seekGuardUntil = 0;
    seeking = false;
    lastPos = 0;
    lastPosAt = 0;
    lastDuration = 0;
    ownSeekAt = 0;
    wantLatch = false;
    pausedAt = 0;
    pauseIntentAt = 0;
    apiPauseAt = 0;
    // 页面入口发起的播放要「亮出来」给人看。在广播前改好展开态，
    // 这一次 emitState 就同时带上新曲目与新展开态。
    if (expandAfter) expanded = true;
    emitState();
    db.addBrowseHistory(id);
  }

  /** 悬浮播放器的展开态也挂在单例上，保证跨页面一致 */
  function setExpanded(v) {
    if (expanded === v) return;
    expanded = v;
    emitState();
  }

  function unbind(arr, fn) {
    return function () {
      const i = arr.indexOf(fn);
      if (i !== -1) arr.splice(i, 1);
    };
  }

  return {
    /**
     * 播放指定诗词。
     * opts.expand = true 时同步展开悬浮播放器 —— 供**页面内的播放入口**使用；
     * 悬浮条内部的上下一首、详情页切诗走默认（保持用户当前的展开/收起意愿）。
     */
    play: function (id, opts) {
      loadAndPlay(id, !!(opts && opts.expand));
    },
    resume: function () {
      // 没有曲目说明已 stop 过，play() 无效，必须重新设 src
      if (!bgm || playing) return;
      if (!currentId) return;
      trace('api.resume');
      want = true;
      pauseIntentAt = 0;
      apiPauseAt = 0;
      playing = true;
      emitState();
      try { bgm.play(); } catch (e) {}
    },
    pause: function () {
      if (!bgm) return;
      // ⚠️ 不能像以前那样「playing 已是 false 就直接 return」。
      // 锁屏拖动之后内部 playing 和真实状态会脱钩（onPause 来了、onSeeked 里的
      // play() 又没触发 onPlay），这时用户点暂停会被这一条挡掉 —— 表现为
      // 「点暂停没反应」，紧接着再来一个假 ended 就变成「从头播」。
      // 真正的暂停永远执行，状态广播按变化来。
      trace('api.pause');
      want = false;
      pausedAt = Date.now();
      pauseIntentAt = pausedAt;
      // 给 onPause 一个「这肯定是用户按的」的判据：宁可把 seek 判据压掉，
      // 也不能让「点暂停」被当成拖动引起的中间态而保留 want。
      apiPauseAt = pausedAt;
      // 假 ended 排着的续播定时器也要撤掉，否则 600ms 后它会按旧现场把声音拉起来
      if (resumeTimer) { clearTimeout(resumeTimer); resumeTimer = 0; }
      try { bgm.pause(); } catch (e) {}
      if (playing) {
        playing = false;
        emitState();
      }
    },
    /**
     * 播放/暂停切换。
     * 曲目为空（从未播过 / 已 stop / 已关闭）、或要切到另一首时，都先重设 src 再播，
     * 否则只会空转。
     * opts.expand 同 play()：续播路径不走 loadAndPlay，需在这里单独展开。
     * 返回切换后是否处于播放中。
     */
    toggle: function (id, opts) {
      const target = id || currentId;
      if (!target) return false;
      const expand = !!(opts && opts.expand);
      if (!currentId || (id && id !== currentId)) {
        loadAndPlay(target, expand);
        return playing;
      }
      if (playing) this.pause(); else this.resume();
      // 只在「确实在播」时展开：点了暂停不该弹面板出来打扰
      if (expand && playing) setExpanded(true);
      return playing;
    },
    seek: function (progressPct) {
      if (!bgm || !currentId) return;
      const dur = bgm.duration || 0;
      if (!dur) return;
      // ⚠️ 不允许落到 duration 上：那样会立刻触发 ended，连锁成「拖到底 → 直接跳下一首
      // 或从头开始」。留 2.5 秒尾巴 —— 这个余量必须大于 onEnded 里判假 ended 的阈值，
      // 否则「页面里拖到最右」会被自己判成真播完。
      const t = Math.max(0, Math.min(Math.max(0, dur - 2.5), (progressPct / 100) * dur));
      trace('api.seek', 'pct=' + Math.round(progressPct) + ' -> ' + t.toFixed(1));
      ownSeekAt = Date.now();
      markSeek(t);
      try { bgm.seek(t); } catch (e) {}
      // 拖动后立刻回推一次，不等下一个 onTimeUpdate
      emitProgress(t, dur);
      // ⚠️ 这里**不许补 play()**，也不许调音量（BAM 没有 volume）。
      // 真机日志 #15~#21 的现场：seek 之后 iOS 自己把 paused 从 1 置回 0，
      // 位置也准时落地（seek-check OK）。我们原来在这中间插的那下 play()
      // 才是把「跳跃 / 重播一小段」引出来的东西。补播统一留给 onSeeked。
      // 600ms 后验一次：位置还在目标附近 → 这次 seek 落地了；
      // 掉头往回收（cur 比目标小一大截）→ iOS 把它当成「从头播」了，补一次 seek 拉回来。
      // ⚠️ 只补一次，且只在「还在播、已经不在 seek 中」时补 —— 反复 seek 本身就是噪音。
      // ⚠️ 这段不能塞进 TRACE_ON：TRACE 是诊断开关，关掉它就等于关掉自愈。
      const target = t;
      const seekId = currentId;
      let retried = false;
      setTimeout(function () {
        if (!bgm || currentId !== seekId) return;
        const cur = bgm.currentTime || 0;
        const behind = cur < target - 2;
        if (TRACE_ON) {
          trace('seek-check', 'target=' + num(target) + ' cur=' + num(cur)
            + (Math.abs(cur - target) <= 2 ? ' OK' : ' MISS'));
        }
        if (behind && !retried && want && !seeking) {
          retried = true;
          if (TRACE_ON) trace('seek-retry', 'target=' + num(target));
          markSeek(target);
          try { bgm.seek(target); } catch (e) {}
        }
      }, 600);
    },
    setLoopMode: function (mode) {
      loopMode = mode || 'single';
      emitState();
    },
    /** 关闭悬浮播放器：停止播放并清空当前曲目，收起后不再出现 */
    close: function () {
      trace('api.close');
      if (bgm) {
        try { bgm.stop(); } catch (e) {}
      }
      currentId = '';
      playing = false;
      want = false;
      expanded = false;
      pendingSeek = -1;
      seekGuardUntil = 0;
      seeking = false;
      lastPos = 0;
      lastPosAt = 0;
      lastDuration = 0;
      ownSeekAt = 0;
      wantLatch = false;
      pausedAt = 0;
      pauseIntentAt = 0;
      apiPauseAt = 0;
      if (resumeTimer) { clearTimeout(resumeTimer); resumeTimer = 0; }
      // 状态可能本来就没变（例如已是暂停），必须强制广播一次让悬浮条收起
      emitState();
    },
    setExpanded: function (v) { setExpanded(!!v); },
    getExpanded: function () { return expanded; },
    /** 有曲目在手（播放中或暂停）就该显示悬浮条 */
    isActive: function () { return !!currentId; },
    /**
     * 回前台时用后台音频的真实状态校正一次。
     * 锁屏拖动进度条、被抢音频焦点这类系统行为不一定派发事件，
     * 内部 playing 可能已经和 bgm.paused 不一致（按钮还显示在播，其实早停了）。
     * ⚠️ 只校正**播放态**，不碰进度：刚回前台时 currentTime 可能还没同步过来，
     * 在这里广播位置反而会制造一次「回跳」。位置一律交给 timeupdate
     * （官方口径：onTimeUpdate 只有小程序在前台时才回调，回前台必然会有）。
     * ⚠️ 也不自动恢复播放：被电话打断后回小程序突然自己响起来是最差体感。
     */
    refresh: function () {
      if (!bgm) return;
      const actual = !bgm.paused;
      trace('api.refresh', 'actual=' + (actual ? 1 : 0));
      // ⚠️ 只允许**降级**（认定为暂停），绝不把暂停改回播放。
      // 刚回前台时 bgm.paused 可能还没同步（读到 false），若据此 upgrade，
      // 用户就会看到「暂停 → 一闪播放 → 又暂停」—— 那一下回弹就是我们自己造的。
      // 真正的「恢复了播放」有 onPlay 事件兜着，不需要这里补。
      if (!actual && playing) {
        playing = false;
        emitState();
      }
    },
    getLoopMode: function () { return loopMode; },
    getCurrentId: function () { return currentId; },
    isPlaying: function () { return playing; },
    /** 取诊断日志（最近 240 条），排查真机问题时用它换一份现场 */
    trace: function () { return traceBuf.slice(); },
    hasAudio: function (poem) { return hasAudio(poem); },
    /** 订阅后返回取消订阅函数，页面 onUnload 必须调用，否则回调会永久堆积在单例上 */
    onProgress: function (fn) {
      listeners.progress.push(fn);
      return unbind(listeners.progress, fn);
    },
    onState: function (fn) {
      listeners.state.push(fn);
      return unbind(listeners.state, fn);
    },
    /**
     * ⚠️ 本项目从不 destroy 播放器（单例跨页存活）。
     * BackgroundAudioManager 的事件监听无法单个移除，destroy 后再建新播放器会叠回调，
     * 所以这个方法只供测试收尾用，业务代码不要调。
     */
    destroy: function () {
      if (bgm) { try { bgm.stop(); } catch (e) {} }
      currentId = ''; playing = false; expanded = false; want = false;
      pendingSeek = -1; seekGuardUntil = 0; seeking = false; lastPos = 0; lastPosAt = 0; lastDuration = 0;
      ownSeekAt = 0; wantLatch = false; pausedAt = 0; pauseIntentAt = 0; apiPauseAt = 0;
      if (resumeTimer) { clearTimeout(resumeTimer); resumeTimer = 0; }
    }
  };
}

// 全局单例
let _player = null;
function getAudioPlayer() {
  if (!_player) _player = createPlayer();
  return _player;
}

/** 有音频的诗词 id 序列，切歌只在这个序列里走，避免切到播不了的条目 */
function playableIds() {
  return POEMS.filter(hasAudio).map(function (p) { return p.id; });
}

/**
 * 回前台校正播放器状态（供 app.js:onShow 调用）。
 * 只在播放器**已存在**时动作 —— 不能为了校正去 new 一个后台音频实例，
 * 那会让每次冷启动都占用一个播放会话。
 */
function refreshState() {
  if (_player && typeof _player.refresh === 'function') _player.refresh();
}

module.exports = { getAudioPlayer: getAudioPlayer, playableIds: playableIds, refreshState: refreshState };
