const db = require('../../utils/db.js');
const { toastReciteSoon } = require('../../utils/toast.js');
const { getPoemById } = require('../../data/poems.js');

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
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
}

function knBodyOf(poem, tab) {
  if (tab === '注释') return poem.annotation || '暂无注释';
  if (tab === '赏析') return poem.appreciation || '暂无赏析';
  return poem.translation || '暂无译文';
}

const TOTAL_SEC = 32;

Page({
  data: {
    poem: {},
    id: '',
    safeAreaBottom: 0,
    showPinyin: true,
    fav: false,
    playing: false,
    audioProgress: 0,
    audioTime: '00:00',
    audioEnd: fmt(TOTAL_SEC),
    knTabs: ['译文', '注释', '赏析'],
    knTab: '译文',
    knBody: '',
    speedLabel: '1x',
    titleChars: [],
    authorChars: [],
    lineChars: []
  },

  onLoad(options) {
    const id = (options && options.id) || 'p001';
    const poem = getPoemById(id) || getPoemById('p001');
    let safeAreaBottom = 0;
    try {
      const info = wx.getSystemInfoSync();
      const bottom = info.safeAreaInsets ? info.safeAreaInsets.bottom : 0;
      safeAreaBottom = Math.round((bottom / info.screenWidth) * 750);
    } catch (e) {}

    const titleChars = parseLinePinyin(poem.title, poem.titlePinyin || '');
    const authorChars = parseLinePinyin(poem.author, poem.authorPinyin || '');
    const lineChars = (poem.lines || []).map((line, i) =>
      parseLinePinyin(line, (poem.pinyin && poem.pinyin[i]) || '')
    );

    this.setData({
      id, poem, safeAreaBottom,
      fav: db.isFavorite(id),
      titleChars, authorChars, lineChars,
      knBody: knBodyOf(poem, '译文')
    });
    db.addBrowseHistory(id);
    wx.setNavigationBarTitle({ title: poem.title });
  },

  onUnload() { this.stopTimer(); },
  onHide() { this.stopTimer(); },

  togglePinyin() {
    this.setData({ showPinyin: !this.data.showPinyin });
  },

  toggleFav() {
    const on = db.toggleFavorite(this.data.id);
    this.setData({ fav: on });
    wx.showToast({ title: on ? '已收藏' : '已取消收藏', icon: 'none', duration: 1200 });
  },

  toggleAudio() {
    toastReciteSoon();
  },

  startTimer() {
    this.setData({ playing: true });
    const speedMap = { '0.5x': 0.5, '1x': 1, '1.25x': 1.25, '1.5x': 1.5, '2x': 2 };
    const rate = speedMap[this.data.speedLabel] || 1;
    this.timer = setInterval(() => {
      const next = this.data.audioProgress + (100 / TOTAL_SEC) * 0.5 * rate;
      if (next >= 100) {
        this.setData({ audioProgress: 100, audioTime: fmt(TOTAL_SEC), playing: false });
        this.stopTimer();
        return;
      }
      this.setData({ audioProgress: next, audioTime: fmt((next / 100) * TOTAL_SEC) });
    }, 500);
  },

  stopTimer() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.setData({ playing: false });
  },

  seekAudio() {
    toastReciteSoon();
  },

  switchKn(e) {
    const knTab = e.currentTarget.dataset.tab;
    this.setData({ knTab, knBody: knBodyOf(this.data.poem, knTab) });
  },

  prevTrack() {
    toastReciteSoon();
  },

  nextTrack() {
    toastReciteSoon();
  },

  toggleMusicNote() {
    toastReciteSoon();
  },

  cycleSpeed() {
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
