const db = require('../../utils/db.js');

const BADGES = [
  { name: '初学乍练', desc: '累计学习 10 首诗词', got: false, threshold: 10 },
  { name: '勤学不辍', desc: '累计学习 50 首诗词', got: false, threshold: 50 },
  { name: '诗词达人', desc: '累计学习 100 首诗词', got: false, threshold: 100 },
  { name: '持之以恒', desc: '连续打卡 7 天', got: false, threshold: 7, streak: true },
  { name: '背诵高手', desc: '已背诵 30 首诗词', got: false, threshold: 30, recited: true }
];

Page({
  data: {
    progress: { learned: 0, recited: 0, streak: 0 },
    maxLearn: 100,
    favCount: 0,
    ringStyle: '',
    badges: []
  },

  onLoad() {
    this._render();
  },

  onShow() { this._render(); },

  _render() {
    const p = db.getProgress();
    const favCount = (wx.getStorageSync('favorites') || []).length;
    const exp = p.learned + p.recited * 2 + p.streak;
    const levels = [0, 30, 80, 160, 300];
    let level = 1;
    for (let i = 0; i < levels.length; i++) {
      if (exp >= levels[i]) level = i + 1;
    }
    const cur = levels[level - 1], next = levels[level] || 999;
    const percent = next === 999 ? 100 : Math.min(100, Math.round(((exp - cur) / (next - cur)) * 100));

    const badges = BADGES.map(function (b) {
      let achieved = false;
      if (b.streak) achieved = p.streak >= b.threshold;
      else if (b.recited) achieved = p.recited >= b.threshold;
      else achieved = p.learned >= b.threshold;
      return Object.assign({}, b, { got: achieved });
    });

    this.setData({
      progress: p,
      favCount: favCount,
      ringStyle: 'conic-gradient(#4f7a5d 0turn ' +
        (percent / 100).toFixed(2) + 'turn, rgba(200,200,200,.25) ' +
        (percent / 100).toFixed(2) + 'turn 1turn)',
      badges: badges
    });
  }
});