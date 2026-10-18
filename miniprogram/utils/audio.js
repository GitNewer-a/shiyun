/**
 * 全局标准朗读播放器
 * 单例 InnerAudioContext，管理播放/暂停/seek/循环三态/上下一首。
 * 页面只消费进度与状态事件，不自算进度。
 * ------------------------------------------------------------------ */
const { POEMS } = require('../data/poems.js');
const db = require('./db.js');

function hasAudio(poem) {
  return !!(poem && poem.audioUrl);
}

function poemAudioUrl(id) {
  const p = POEMS.find(function (x) { return x.id === id; });
  return p ? p.audioUrl : '';
}

/**
 * 解析可播放地址。
 * 代码包内的音频（/assets/audio/x.mp3）在真机上 InnerAudioContext 常读不到，
 * 先拷到 wx.env.USER_DATA_PATH 再播；网络地址与已拷好的本地地址直接用。
 * 拷贝结果按文件名缓存，同一首不会重复拷贝。
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
  // 云存储 fileID：跨网络地址，不需要也不能拷贝到用户目录，直接交给播放器。
  // InnerAudioContext 原生支持 cloud:// 前缀，SDK 内部会换临时链接（基础库 2.2.3+，项目为 3.17.2）。
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
 * 播放器单例。
 * 用法：
 *   const a = getAudioPlayer();
 *   a.play(poemId) / a.pause() / a.resume()
 *   a.onProgress(fn)  fn({ progress, time, duration })
 *   a.onState(fn)     fn({ playing, poemId })
 *   a.setLoopMode('single' | 'order' | 'random')
 */
function createPlayer() {
  let ctx = null;
  let currentId = '';
  let playing = false;
  let loopMode = 'single';
  let listeners = { progress: [], state: [] };
  let started = false;
  let expanded = false;

  function buildCtx() {
    if (ctx) {
      try { ctx.destroy(); } catch (e) {}
      ctx = null;
    }
    ctx = wx.createInnerAudioContext();
    ctx.loop = false;
    ctx.src = currentId ? resolveSrc(poemAudioUrl(currentId)) : '';
    ctx.onError(function (err) {
      console.warn('[诗韵] 音频播放失败', currentId, ctx && ctx.src, err);
      setPlaying(false);
    });
    ctx.onPlay(function () {
      setPlaying(true);
    });
    ctx.onPause(function () {
      setPlaying(false);
    });
    ctx.onTimeUpdate(function () {
      if (!ctx) return;
      const duration = ctx.duration || 0;
      const t = ctx.currentTime || 0;
      const progress = duration > 0 ? (t / duration) * 100 : 0;
      listeners.progress.slice().forEach(function (fn) {
        fn({ progress: progress, time: t, duration: duration });
      });
    });
    ctx.onEnded(function () {
      onEnded();
    });
  }

  function onEnded() {
    if (loopMode === 'single') {
      // 单曲循环：从头再放
      ctx.seek(0);
      ctx.play();
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

  /**
   * @param {string} id 诗词 id
   * @param {boolean} expandAfter 起播后是否展开悬浮播放器（页面内播放入口用）
   */
  function loadAndPlay(id, expandAfter) {
    const poem = POEMS.find(function (p) { return p.id === id; });
    if (!hasAudio(poem)) {
      // 无音频：停掉当前、清空 src 与当前曲目，避免下次 toggle 误播上一首，
      // 也避免悬浮条出现一个根本播不了的条目
      if (ctx) {
        try { ctx.stop(); } catch (e) {}
        ctx.src = '';
      }
      currentId = '';
      playing = false;
      emitState();
      return;
    }
    currentId = id;
    buildCtx();
    ctx.play();
    started = true;
    // ⚠️ 这里必须「无条件」广播，不能图省事走 setPlaying(true)。
    // 切歌时 playing 本来往往就是 true，而 setPlaying 有「值没变就不广播」的守卫，
    // 会被直接吃掉 → currentId 已变却没人收到通知，悬浮条的诗名/作者就停在上一首
    //（音频却已经换了）。这是「切歌后播放器信息不更新」的根因。
    playing = true;
    // 页面入口发起的播放要「亮出来」给人看。在广播前改好展开态，
    // 这一次 emitState 就同时带上新曲目与新展开态，不会出现「先展开空面板再填内容」。
    if (expandAfter) expanded = true;
    emitState();
    db.addBrowseHistory(id);
  }

function emitState() {
  listeners.state.slice().forEach(function (fn) {
    fn({ playing: playing, poemId: currentId, loopMode: loopMode, expanded: expanded });
  });
}

/** 悬浮播放器的展开态也挂在单例上，保证跨页面一致 */
function setExpanded(v) {
  if (expanded === v) return;
  expanded = v;
  emitState();
}

/** 只在状态真变化时才广播，避免方法内手动更新与 onPlay/onPause 事件重复触发 */
function setPlaying(v) {
  if (playing === v) return;
  playing = v;
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
      if (ctx && ctx.src && !playing) {
        setPlaying(true);
        ctx.play();
      }
    },
    pause: function () {
      if (ctx && playing) {
        setPlaying(false);
        ctx.pause();
      }
    },
    /**
     * 播放/暂停切换。
     * ctx 还没建（从未播过）、或 src 为空、或要切到另一首时，都先加载再播，
     * 否则只会空转——这是详情页播放按钮点不动的根因。
     * opts.expand 同 play()：续播路径不走 loadAndPlay，需在这里单独展开。
     * 返回切换后是否处于播放中。
     */
    toggle: function (id, opts) {
      const target = id || currentId;
      if (!target) return false;
      const expand = !!(opts && opts.expand);
      if (!ctx || !ctx.src || (id && id !== currentId)) {
        loadAndPlay(target, expand);
        return playing;
      }
      if (playing) this.pause(); else this.resume();
      // 只在「确实在播」时展开：点了暂停不该弹面板出来打扰
      if (expand && playing) setExpanded(true);
      return playing;
    },
    seek: function (progressPct) {
      if (!ctx || !ctx.duration) return;
      const t = (progressPct / 100) * ctx.duration;
      ctx.seek(t);
      // 拖动后立刻回推一次，不等下一个 onTimeUpdate
      listeners.progress.slice().forEach(function (fn) {
        fn({ progress: progressPct, time: t, duration: ctx.duration });
      });
    },
    setLoopMode: function (mode) {
      loopMode = mode || 'single';
      emitState();
    },
    /** 关闭悬浮播放器：停止播放并清空当前曲目，收起后不再出现 */
    close: function () {
      if (ctx) {
        try { ctx.stop(); } catch (e) {}
        ctx.src = '';
      }
      currentId = '';
      playing = false;
      expanded = false;
      // 状态可能本来就没变（例如已是暂停），必须强制广播一次让悬浮条收起
      emitState();
    },
    setExpanded: function (v) { setExpanded(!!v); },
    getExpanded: function () { return expanded; },
    /** 有曲目在手（播放中或暂停）就该显示悬浮条 */
    isActive: function () { return !!currentId; },
    getLoopMode: function () { return loopMode; },
    getCurrentId: function () { return currentId; },
    isPlaying: function () { return playing; },
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
    destroy: function () {
      if (ctx) { try { ctx.destroy(); } catch (e) {} ctx = null; }
      currentId = ''; playing = false;
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

module.exports = { getAudioPlayer: getAudioPlayer, playableIds: playableIds };
