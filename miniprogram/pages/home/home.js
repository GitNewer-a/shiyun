const db = require('../../utils/db.js');
const { toastReciteSoon } = require('../../utils/toast.js');
const { POEMS } = require('../../data/poems.js');

Page({
  data: {
    dailyPoem: {},
    categories: [
      { name: '诗词学习', action: 'poem', color: '#e4eaf0', icon: '/assets/figma-home/icon-6.svg' },
      { name: '记忆训练', action: 'recite', color: '#f0e8e4', icon: '/assets/figma-home/icon-10.svg' },
      { name: '诗词库', action: 'browse', color: '#edf0de', icon: '/assets/figma-home/icon-2.svg' },
      { name: '学习计划', action: 'learn', color: '#ede8f0', icon: '/assets/figma-home/icon-1.svg' }
    ],
    resume: {
      id: '',
      mark: '诗',
      title: '',
      author: '',
      dynasty: '',
      lesson: 5,
      progress: 0,
      tip: ''
    },
    hotList: [],
    playingIndex: -1
  },

  onShow() {
    this.renderDaily();
    this.renderResume();
    this.renderHot();
  },

  /** 每日一诗：按日期取模，保证同一天不变 */
  renderDaily() {
    const day = Math.floor(Date.now() / 86400000);
    const poem = POEMS[day % POEMS.length];
    this.setData({ dailyPoem: poem });
  },

  renderResume() {
    const progress = db.getProgress();
    // 未开始时默认指向第一首，避免空态
    const target = POEMS[Math.min(progress.learned, POEMS.length - 1)];
    const remain = Math.max(POEMS.length - progress.learned, 0);
    this.setData({
      resume: {
        id: target.id,
        mark: target.title.charAt(0),
        title: target.title,
        author: target.author,
        dynasty: target.dynasty,
        lesson: Math.min(progress.learned + 1, POEMS.length),
        progress: Math.round((progress.learned / POEMS.length) * 100),
        tip: remain > 0 ? `还有 ${remain} 首待学，今天继续吧` : '已学完当前全部诗词'
      }
    });
  },

  renderHot() {
    // 播放次数为占位数据，接入云数据库后改为实时读取
    const plays = ['1.2万', '8,462'];
    const listeners = ['岚山', '清欢'];
    const marks = ['岚', '清'];
    const avatarColors = ['#58707d', '#b16a55'];
    const list = POEMS.slice(-2).map(function (p, i) {
      return Object.assign({}, p, {
        plays: plays[i],
        listener: listeners[i],
        mark: marks[i],
        avatarColor: avatarColors[i]
      });
    });
    this.setData({ hotList: list });
  },

  goDaily() {
    wx.navigateTo({ url: '/pages/poem/poem?id=' + this.data.dailyPoem.id });
  },

  goResume() {
    wx.navigateTo({ url: '/pages/poem/poem?id=' + this.data.resume.id });
  },

  goPoem(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: '/pages/poem/poem?id=' + id });
  },

  goShortcut(e) {
    const action = e.currentTarget.dataset.action;
    if (action === 'poem') this.goDaily();
    else if (action === 'recite') {
      wx.navigateTo({ url: '/pages/recite/recite?id=' + this.data.dailyPoem.id + '&type=recite' });
    } else if (action === 'browse') {
      wx.switchTab({ url: '/pages/browse/browse' });
    } else if (action === 'learn') {
      wx.switchTab({ url: '/pages/learn/learn' });
    }
  },

  togglePlay() {
    toastReciteSoon();
  }
});
