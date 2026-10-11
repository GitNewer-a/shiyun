/** 学习中心 —— 对应 Figma node 10:499 Chinese Poetry Learning UI
 * 版式（393x852）：标题栏 / 成长卡 / 学习模块(2) / 今日学习 / 最近学习
 * 数据优先读本地 progress，空态时用设计稿演示值（35/18/7天/51%）保证与稿一致。
 */
const db = require('../../utils/db.js');
const { POEMS, getPoemById } = require('../../data/poems.js');

function getByTitle(t) {
  const f = POEMS.filter(function (p) { return p.title === t; });
  return f[0] || POEMS[0];
}

Page({
  data: {
    growth: { percent: 51, learned: 35, mastered: 18, streak: 7, remain: 7, nextLevel: '诗词学徒', levelTag: '诗词初学者' },
    ringStyle: '',
    today: [
      { id: 'td1', title: '阅读《静夜思》', sub: '唐 · 李白', done: false, poem: '静夜思' },
      { id: 'td2', title: '完成填空默写', sub: '记忆训练 · 春晓', done: false, poem: '春晓' },
      { id: 'td3', title: '复习昨日诗词', sub: '《登鹳雀楼》', done: false, poem: '登鹳雀楼' }
    ],
    todayPercent: 0,
    recent: [
      { id: 'p001', mark: '夜', title: '《静夜思》', sub: '李白 · 唐', status: '已学习' },
      { id: 'p002', mark: '晓', title: '《春晓》', sub: '孟浩然 · 唐', status: '学习中' }
    ]
  },

  onShow() {
    this.renderGrowth();
    this.renderTodayPercent();
  },

  renderGrowth() {
    const p = db.getProgress();
    let g = { percent: 51, learned: 35, mastered: 18, streak: 7, remain: 7, nextLevel: '诗词学徒', levelTag: '诗词初学者' };
    if (p && (p.learned > 0 || p.recited > 0 || p.streak > 0)) {
      const learned = p.learned || 0;
      const mastered = p.recited || 0;
      const streak = p.streak || 0;
      const total = 50;
      const percent = Math.min(99, Math.round(((mastered) / total) * 100));
      g = {
        percent: percent,
        learned: learned,
        mastered: mastered,
        streak: streak,
        remain: Math.max(0, 25 - mastered),
        nextLevel: mastered >= 25 ? '诗词学徒' : '诗词学徒',
        levelTag: mastered >= 25 ? '诗词学徒' : '诗词初学者'
      };
    }
    const ratio = (g.percent / 100).toFixed(2);
    this.setData({
      growth: g,
      ringStyle: 'conic-gradient(#E8B870 0turn ' + ratio + 'turn, rgba(255,255,255,.22) ' + ratio + 'turn 1turn)'
    });
  },

  renderTodayPercent() {
    const done = this.data.today.filter(function (t) { return t.done; }).length;
    this.setData({ todayPercent: Math.round((done / this.data.today.length) * 100) });
  },

  toggleToday(e) {
    const id = e.currentTarget.dataset.id;
    const today = this.data.today.map(function (t) {
      return t.id === id ? Object.assign({}, t, { done: !t.done }) : t;
    });
    this.setData({ today: today });
    this.renderTodayPercent();
  },

  goTodayDetail(e) {
    const poemName = e.currentTarget.dataset.poem;
    const poem = getByTitle((poemName || '').replace(/[《》]/g, ''));
    if (poem) wx.navigateTo({ url: '/pages/poem/poem?id=' + poem.id });
  },

  goContinue() {
    const firstTodo = this.data.today.filter(function (t) { return !t.done; })[0] || this.data.today[0];
    const poem = getByTitle((firstTodo.poem || '').replace(/[《》]/g, ''));
    wx.navigateTo({ url: '/pages/poem/poem?id=' + (poem ? poem.id : 'p001') });
  },

  goRank() {
    wx.navigateTo({ url: '/pages/achieve/achieve' });
  },

  goUnderstand() {
    wx.switchTab({ url: '/pages/browse/browse' });
  },

  goRecite(e) {
    const type = e.currentTarget.dataset.type || 'recite';
    wx.navigateTo({ url: '/pages/recite/recite?type=' + type });
  },

  goRecent(e) {
    const id = e.currentTarget.dataset.id;
    if (id) wx.navigateTo({ url: '/pages/poem/poem?id=' + id });
  },

  goAllRecords() {
    wx.navigateTo({ url: '/pages/progress/progress' });
  }
});
