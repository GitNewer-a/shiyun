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
  if (/^(https?:)?\/\//.test(raw) || raw.indexOf('wxfile://') === 0) return raw;
  if (!ensureDir()) return raw;
  const dest = AUDIO_DIR + '/' + raw.split('/').pop();
  try {
    const fs = wx.getFileSystemManager();
    try {
      fs.accessSync(dest);
      return dest;
    } catch (e) {}
    fs.copyFileSync(raw, dest);
    return dest;
  } catch (e) {
    console.warn('[诗韵] 音频拷贝到用户目录失败，回退包内路径', raw, e);
    return raw;
  }
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
    // 顺序 / 随机
    const idx = POEMS.findIndex(function (p) { return p.id === currentId; });
    let next;
    if (loopMode === 'order') {
      next = (idx + 1) % POEMS.length;
    } else {
      next = Math.floor(Math.random() * POEMS.length);
    }
    loadAndPlay(POEMS[next].id);
  }

  function loadAndPlay(id) {
    currentId = id;
    if (!hasAudio(POEMS.find(function (p) { return p.id === id; }))) {
      // 无音频：停掉当前、清空 src 与当前曲目，避免下次 toggle 误播上一首，
      // 也避免悬浮条出现一个根本播不了的条目
      if (ctx) {
        try { ctx.stop(); } catch (e) {}
        ctx.src = '';
      }
      currentId = '';
      setPlaying(false);
      emitState();
      return;
    }
    buildCtx();
    ctx.play();
    started = true;
    setPlaying(true);
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
    play: function (id) {
      loadAndPlay(id);
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
     * 返回切换后是否处于播放中。
     */
    toggle: function (id) {
      const target = id || currentId;
      if (!target) return false;
      if (!ctx || !ctx.src || (id && id !== currentId)) {
        loadAndPlay(target);
        return playing;
      }
      if (playing) this.pause(); else this.resume();
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
