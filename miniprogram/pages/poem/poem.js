const db = require('../../utils/db.js');
const { toastReciteSoon } = require('../../utils/toast.js');
const { getPoemById, POEMS } = require('../../data/poems.js');
const { getAudioPlayer, playableIds } = require('../../utils/audio.js');

/** 开标点挂下一字、闭标点挂上一字，避免行首/单独成行 */
const OPEN_PUNCT = /[「『《（【〖〈“‘]/;
const HANZI = /[\u4e00-\u9fff]/;

/** 汉字才配对拼音；标点挂靠相邻汉字，拼音留空 */
function parseLinePinyin(line, pyStr) {
  const chars = [...(line || '')];
  const pys = pyStr ? pyStr.trim().split(/\s+/).filter(Boolean) : [];
  let pi = 0;
  const out = [];
  let pendingOpen = '';

  chars.forEach(function (c) {
    if (HANZI.test(c)) {
      const pinyin = pys[pi] || '';
      pi += 1;
      out.push({ char: c, prefix: pendingOpen, suffix: '', pinyin: pinyin });
      pendingOpen = '';
      return;
    }
    if (OPEN_PUNCT.test(c)) {
      pendingOpen += c;
      return;
    }
    if (out.length) {
      out[out.length - 1].suffix += c;
    } else {
      pendingOpen += c;
    }
  });

  if (pendingOpen) {
    if (out.length) {
      out[out.length - 1].suffix += pendingOpen;
    } else {
      out.push({ char: '', prefix: pendingOpen, suffix: '', pinyin: '' });
    }
  }
  return out;
}

function fmt(sec) {
  sec = sec || 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
}

function knBodyOf(poem, tab) {
  if (tab === '注释') return poem.annotation || '暂无注释';
  if (tab === '赏析') return poem.appreciation || '暂无赏析';
  return poem.translation || '暂无译文';
}

Page({
  data: {
    poem: {},
    id: '',
    safeAreaBottom: 0,
    showPinyin: true,
    fav: false,
    playing: false,
    hasAudio: false,
    audioProgress: 0,
    audioTime: '00:00',
    audioEnd: '00:00',
    knTabs: ['译文', '注释', '赏析'],
    knTab: '译文',
    knBody: '',
    loopMode: 'single',
    poemIndex: 0,
    poemList: [],
    titleChars: [],
    authorChars: [],
    lineChars: []
  },

  onLoad(options) {
    const id = (options && options.id) || 'p001';
    const poem = getPoemById(id) || getPoemById('p001');
    // 本页当前「跟随」的曲目，供 _followTrack 判断单例是不是在替本页续播
    this._lastPoemId = '';
    let safeAreaBottom = 0;
    try {
      const info = wx.getSystemInfoSync();
      const bottom = info.safeAreaInsets ? info.safeAreaInsets.bottom : 0;
      safeAreaBottom = Math.round((bottom / info.screenWidth) * 750);
    } catch (e) {}

    const titleChars = parseLinePinyin(poem.title, poem.titlePinyin || '');
    const authorChars = parseLinePinyin(poem.author, poem.authorPinyin || '');
    const lineChars = (poem.lines || []).map(function (line, i) {
      return parseLinePinyin(line, (poem.pinyin && poem.pinyin[i]) || '');
    });

    const poemList = POEMS;
    const poemIndex = poemList.findIndex(function (p) { return p.id === id; });

    this.setData({
      id: id,
      poem: poem,
      safeAreaBottom: safeAreaBottom,
      fav: db.isFavorite(id),
      titleChars: titleChars,
      authorChars: authorChars,
      lineChars: lineChars,
      knBody: knBodyOf(poem, '译文'),
      poemList: poemList,
      poemIndex: poemIndex < 0 ? 0 : poemIndex
    });
    db.addBrowseHistory(id);
    wx.setNavigationBarTitle({ title: poem.title });
    this._initAudio(poem);
  },

  onShow() {
    // 从其他页返回时把按钮状态拉回真实播放态
    if (!this.player) return;
    this.setData({
      playing: this.player.isPlaying() && this.player.getCurrentId() === this.data.id,
      loopMode: this.player.getLoopMode()
    });
  },

  onUnload() {
    // 只解绑回调，不暂停也不销毁单例：退出本页后由悬浮播放器接着播
    this._unsubAudio();
  },

  /** 初始化全局播放器；音频创建失败不影响页面渲染 */
  _initAudio(poem) {
    this._subs = [];
    try {
      this.player = getAudioPlayer();
    } catch (e) {
      this.player = null;
      console.warn('[诗韵] 播放器初始化失败，降级无音频', e);
      return;
    }
    const that = this;
    const s = wx.getStorageSync('settings') || {};
    this.player.setLoopMode(s.loopMode || 'single');
    this.setData({ loopMode: s.loopMode || 'single' });

    this._subs.push(this.player.onProgress(function (data) {
      that.setData({
        audioProgress: data.progress,
        audioTime: fmt(data.time),
        audioEnd: fmt(data.duration)
      });
    }));

    this._subs.push(this.player.onState(function (data) {
      that.setData({ playing: data.playing, loopMode: data.loopMode });
      // 曲目也可能被单例自己换掉（自动连播、悬浮条里的上下首），正文要跟着换
      that._followTrack(data.poemId);
    }));

    this.setData({ hasAudio: this.player.hasAudio(poem) });

    if (s.autoRead && this.player.hasAudio(poem)) {
      this.player.play(poem.id);
    }
  },

  _unsubAudio() {
    (this._subs || []).forEach(function (off) {
      if (typeof off === 'function') off();
    });
    this._subs = [];
  },

  togglePinyin() {
    this.setData({ showPinyin: !this.data.showPinyin });
  },

  toggleFav() {
    const on = db.toggleFavorite(this.data.id);
    this.setData({ fav: on });
    wx.showToast({ title: on ? '已收藏' : '已取消收藏', icon: 'none', duration: 1200 });
  },

  toggleAudio() {
    if (!this.data.hasAudio) {
      wx.showToast({ title: '暂无标准朗读', icon: 'none', duration: 1200 });
      return;
    }
    this.player.toggle(this.data.id);
  },

  seekAudio(e) {
    if (!this.data.hasAudio) return;
    const that = this;
    wx.createSelectorQuery()
      .select('.progress-bar-wrap')
      .boundingClientRect(function (rect) {
        if (!rect) return;
        const x = (e.detail && e.detail.x) || 0;
        const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
        that.player.seek(pct);
      })
      .exec();
  },

  switchKn(e) {
    const knTab = e.currentTarget.dataset.tab;
    this.setData({ knTab: knTab, knBody: knBodyOf(this.data.poem, knTab) });
  },

  prevTrack() {
    this._stepTrack(-1);
  },

  nextTrack() {
    this._stepTrack(1);
  },

  _stepTrack(dir) {
    if (!this.data.hasAudio) return;
    const ids = playableIds();
    if (!ids.length) return;
    const loop = this.player.getLoopMode();
    if (loop === 'single') {
      this.player.seek(0);
      return;
    }
    const idx = ids.indexOf(this.data.id);
    let next;
    if (loop === 'order') next = (idx + dir + ids.length) % ids.length;
    else next = Math.floor(Math.random() * ids.length);
    this._switchToPoem(ids[next]);
  },

  /**
   * 跟着播放器换正文。
   *
   * 自动连播（上一首放完 → 下一首）与悬浮条里的上下首都是**单例自己发起**的，
   * 页面不知道，于是会出现「音频已经是下一首、正文还停在上一首」。
   *
   * 「本页是否在跟随」用上一次广播的曲目 == 本页当前曲目 来判定：
   * 只有播放器原本就停在**本页这首诗**上，才认为它是在替本页续播；
   * 否则（比如用户在首页播着另一首、再点进本页看某首诗）一律不动，
   * 免得把用户主动打开的那首诗顶掉。
   */
  _followTrack(poemId) {
    const prev = this._lastPoemId;
    this._lastPoemId = poemId || '';
    if (!poemId || poemId === this.data.id) return;
    if (prev !== this.data.id) return;
    this._switchToPoem(poemId);
  },

  _switchToPoem(id) {
    const target = getPoemById(id);
    if (!target) return;
    if (!this.player) return;
    const idx = this.data.poemList.findIndex(function (p) { return p.id === id; });
    this.setData({
      id: id,
      poem: target,
      fav: db.isFavorite(id),
      audioProgress: 0,
      audioTime: '00:00',
      audioEnd: '00:00',
      knBody: knBodyOf(target, this.data.knTab || '译文'),
      poemIndex: idx < 0 ? 0 : idx,
      titleChars: parseLinePinyin(target.title, target.titlePinyin || ''),
      authorChars: parseLinePinyin(target.author, target.authorPinyin || ''),
      lineChars: (target.lines || []).map(function (line, i) {
        return parseLinePinyin(line, (target.pinyin && target.pinyin[i]) || '');
      }),
      hasAudio: this.player.hasAudio(target)
    });
    db.addBrowseHistory(id);
    wx.setNavigationBarTitle({ title: target.title });
    // 显式记下来：本页现在跟的就是这一首，后续单例续播才不会丢方向
    this._lastPoemId = id;
    this.player.play(id);
  },

  cycleLoop() {
    const modes = ['single', 'order', 'random'];
    const cur = this.player ? this.player.getLoopMode() : 'single';
    const next = modes[(modes.indexOf(cur) + 1) % modes.length];
    if (this.player) this.player.setLoopMode(next);
    this.setData({ loopMode: next });
    const labels = { single: '单曲循环', order: '顺序循环', random: '随机播放' };
    wx.showToast({ title: labels[next], icon: 'none', duration: 800 });
    try {
      const s = wx.getStorageSync('settings') || {};
      wx.setStorageSync('settings', Object.assign(s, { loopMode: next }));
    } catch (e) {}
  },

  toggleMusicNote() {
    toastReciteSoon();
  },

  goPractice() {
    toastReciteSoon();
  },

  goRecite() {
    wx.navigateTo({ url: '/pages/recite/recite?id=' + this.data.id });
  },

  sharePoem() {
    wx.showToast({ title: '分享功能即将上线', icon: 'none', duration: 1200 });
  }
});
