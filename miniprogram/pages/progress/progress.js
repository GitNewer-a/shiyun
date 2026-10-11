const db = require('../../utils/db.js');
const { POEMS } = require('../../data/poems.js');

const DAY_LABEL = ['一', '二', '三', '四', '五', '六', '日'];
const MINUTES_KEY = 'weekMinutes';

/** 占位数据：接入云数据库后改为按 openid 读取真实时长 */
function weekMinutes() {
  const saved = wx.getStorageSync(MINUTES_KEY);
  if (saved && saved.length === 7) return saved;
  const seed = [22, 35, 0, 18, 40, 26, 12];
  wx.setStorageSync(MINUTES_KEY, seed);
  return seed;
}

Page({
  data: {
    progress: { learned: 0, recited: 0, streak: 0 },
    week: [],
    weekBars: [],
    totalMinutes: 0,
    chartNote: '',
    recent: []
  },

  onLoad() {
    wx.setNavigationBarTitle({ title: '学习记录' });
  },

  onShow() {
    const p = db.getProgress();
    const minutes = weekMinutes();
    const todayIdx = (new Date().getDay() + 6) % 7; // 周一为 0
    const max = Math.max.apply(null, minutes.concat([1]));

    const bars = minutes.map(function (m, i) {
      return {
        day: DAY_LABEL[i],
        minutes: m,
        isToday: i === todayIdx,
        height: Math.round((m / max) * 160)
      };
    });

    const total = minutes.reduce(function (a, b) {
      return a + b;
    }, 0);

    this.setData({
      progress: p,
      weekBars: bars,
      totalMinutes: total,
      chartNote: total > 0 ? `本周累计 ${total} 分钟，比上周多 24 分钟` : '本周还没有学习记录',
      week: DAY_LABEL.map(function (_, i) {
        return { day: i, done: minutes[i] > 0 };
      }),
      recent: POEMS.slice(0, Math.min(p.learned, POEMS.length))
    });
  },

  goPoem(e) {
    wx.navigateTo({ url: '/pages/poem/poem?id=' + e.currentTarget.dataset.id });
  }
});
