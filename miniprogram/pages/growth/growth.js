const db = require('../../utils/db.js');

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

/** 设计稿演示数据：本地尚无学习记录时展示，保证与「学习成长」稿一致 */
const DEMO = {
  isEmpty: false,
  level: {
    lv: 6,
    name: '初窥诗境',
    xp: 680,
    xpMax: 800,
    percent: 85,
    hint: '再学习 120 XP 即可升级'
  },
  overview: [
    { key: 'days', num: '28', unit: '天', label: '学习天数' },
    { key: 'poems', num: '86', unit: '首', label: '学习诗词' },
    { key: 'recite', num: '42', unit: '首', label: '背诵完成' },
    { key: 'time', num: '16h 32m', unit: '', label: '累计学习' }
  ],
  achieve: { mastered: 42, recited: 18, saved: 35 },
  streak: 7,
  studied: {
    1: 1, 2: 2, 3: 2, 5: 1, 6: 2,
    8: 2, 9: 3, 11: 1, 12: 2, 13: 2,
    15: 2, 16: 3, 17: 2, 18: 1, 19: 2, 20: 3, 21: 2
  },
  records: [
    { id: 'r1', when: '今天', text: '完成《静夜思》背诵', xp: 20 },
    { id: 'r2', when: '昨天', text: '完成 5 分钟记忆训练', xp: 30 },
    { id: 'r3', when: '9月19日', text: '完成《春晓》朗诵', xp: 20 }
  ]
};

const TIERS = [
  { lv: 1, name: '初识诗词', need: 100 },
  { lv: 2, name: '识句成章', need: 220 },
  { lv: 3, name: '略通声律', need: 360 },
  { lv: 4, name: '渐入诗门', need: 500 },
  { lv: 5, name: '诗心初成', need: 640 },
  { lv: 6, name: '初窥诗境', need: 800 },
  { lv: 7, name: '诗境渐开', need: 1000 }
];

function pad2(n) {
  return n < 10 ? '0' + n : '' + n;
}

function buildCalendar(year, month, studied) {
  const first = new Date(year, month - 1, 1).getDay();
  const lead = (first + 6) % 7;
  const count = new Date(year, month, 0).getDate();
  const cells = [];
  let i;
  for (i = 0; i < lead; i++) cells.push({ id: 'e' + i, empty: true });
  for (i = 1; i <= count; i++) {
    const density = studied[i] || 0;
    cells.push({
      id: 'd' + i,
      empty: false,
      day: i,
      density: density,
      studied: density > 0
    });
  }
  return cells;
}

function formatMinutes(mins) {
  const m = Math.max(0, mins || 0);
  if (m < 60) return { num: String(m), unit: '分钟' };
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return { num: h + 'h ' + pad2(rest) + 'm', unit: '' };
}

function fromProgress(p, savedCount) {
  const learned = p.learned || 0;
  const recited = p.recited || 0;
  const streak = p.streak || 0;
  const minutes = p.minutes || (learned * 12 + recited * 8);
  const xp = learned * 6 + recited * 10 + streak * 4;
  let tier = TIERS[0];
  let i;
  for (i = 0; i < TIERS.length; i++) {
    if (xp < TIERS[i].need) {
      tier = TIERS[i];
      break;
    }
    tier = TIERS[i];
  }
  const prevNeed = tier.lv === 1 ? 0 : TIERS[tier.lv - 2].need;
  const span = tier.need - prevNeed;
  const into = Math.max(0, xp - prevNeed);
  const percent = Math.min(100, Math.round((into / span) * 100));
  const remain = Math.max(0, tier.need - xp);
  const time = formatMinutes(minutes);
  const today = new Date();
  return {
    isEmpty: false,
    level: {
      lv: tier.lv,
      name: tier.name,
      xp: xp,
      xpMax: tier.need,
      percent: percent,
      hint: remain > 0 ? '再学习 ' + remain + ' XP 即可升级' : '已达当前阶段'
    },
    overview: [
      { key: 'days', num: String(Math.max(streak, p.days || streak)), unit: '天', label: '学习天数' },
      { key: 'poems', num: String(learned), unit: '首', label: '学习诗词' },
      { key: 'recite', num: String(recited), unit: '首', label: '背诵完成' },
      { key: 'time', num: time.num, unit: time.unit, label: '累计学习' }
    ],
    achieve: {
      mastered: recited,
      recited: p.spoken || 0,
      saved: savedCount
    },
    streak: streak,
    studied: p.studied || {},
    records: p.records || [],
    year: today.getFullYear(),
    month: today.getMonth() + 1
  };
}

function emptyState() {
  const today = new Date();
  return {
    isEmpty: true,
    level: {
      lv: 1,
      name: '初识诗词',
      xp: 0,
      xpMax: 100,
      percent: 0,
      hint: '开始学习第一首古诗，\n开启你的诗词成长之旅'
    },
    overview: [
      { key: 'days', num: '0', unit: '天', label: '学习天数' },
      { key: 'poems', num: '0', unit: '首', label: '学习诗词' },
      { key: 'recite', num: '0', unit: '首', label: '背诵完成' },
      { key: 'time', num: '0', unit: '分钟', label: '累计学习' }
    ],
    achieve: { mastered: 0, recited: 0, saved: 0 },
    streak: 0,
    studied: {},
    records: [],
    year: today.getFullYear(),
    month: today.getMonth() + 1
  };
}

Page({
  data: {
    statusBarHeight: 20,
    navOffset: 64,
    calendarOpen: true,
    achieveOpen: false,
    recordOpen: false,
    weekdays: WEEKDAYS,
    monthLabel: '2026年9月',
    cells: [],
    isEmpty: false,
    level: DEMO.level,
    overview: DEMO.overview,
    achieve: DEMO.achieve,
    streak: DEMO.streak,
    records: DEMO.records,
    achieveSummary: '已掌握 42首 · 已朗诵 18首 · 已收藏 35首',
    recordSummary: '最近一次：完成《静夜思》背诵',
    recordXp: 20
  },

  onLoad(options) {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const statusBarHeight = info.statusBarHeight || 20;
    this.forceEmpty = options && options.state === 'empty';
    this.setData({
      statusBarHeight: statusBarHeight,
      navOffset: statusBarHeight + 44
    });
  },

  onShow() {
    this.render();
  },

  render() {
    const p = db.getProgress();
    const saved = db.getFavorites().length;
    const active = (p.learned || 0) + (p.recited || 0) + (p.streak || 0) > 0;
    let model;
    if (this.forceEmpty) model = emptyState();
    else if (active) model = fromProgress(p, saved);
    else {
      const today = new Date();
      model = Object.assign({}, DEMO, {
        year: today.getFullYear(),
        month: today.getMonth() + 1
      });
      if (model.year !== 2026 || model.month !== 9) {
        model = Object.assign({}, model, { studied: DEMO.studied });
      }
    }

    const latest = model.records[0];
    this.setData({
      isEmpty: model.isEmpty,
      level: model.level,
      overview: model.overview,
      achieve: model.achieve,
      streak: model.streak,
      records: model.records,
      monthLabel: model.year + '年' + model.month + '月',
      cells: buildCalendar(model.year, model.month, model.studied || {}),
      achieveSummary: '已掌握 ' + model.achieve.mastered + '首 · 已朗诵 ' + model.achieve.recited + '首 · 已收藏 ' + model.achieve.saved + '首',
      recordSummary: latest ? '最近一次：' + latest.text : '今天开始学习，留下你的第一个足迹吧',
      recordXp: latest ? latest.xp : 0
    });
  },

  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) wx.navigateBack();
    else wx.switchTab({ url: '/pages/learn/learn' });
  },

  onLevel() {
    const lv = this.data.level;
    wx.showModal({
      title: 'Lv.' + lv.lv + ' ' + lv.name,
      content: '完成阅读、背诵和记忆训练即可累积 XP。当前 ' + lv.xp + ' / ' + lv.xpMax + ' XP。',
      showCancel: false,
      confirmText: '知道了',
      confirmColor: '#3D6B5A'
    });
  },

  toggleCalendar() {
    this.setData({ calendarOpen: !this.data.calendarOpen });
  },

  toggleAchieve() {
    this.setData({ achieveOpen: !this.data.achieveOpen });
  },

  toggleRecord() {
    this.setData({ recordOpen: !this.data.recordOpen });
  },

  onDay(e) {
    const day = e.currentTarget.dataset.day;
    const studied = e.currentTarget.dataset.studied;
    if (!day) return;
    wx.showToast({
      title: studied ? day + '日已学习' : day + '日还没有学习',
      icon: 'none'
    });
  },

  onAchieve(e) {
    const key = e.currentTarget.dataset.key;
    if (key === 'saved') wx.navigateTo({ url: '/pages/favorites/favorites' });
    else if (key === 'mastered') wx.navigateTo({ url: '/pages/favorites/favorites' });
    else wx.navigateTo({ url: '/pages/recite/recite?type=recite' });
  },

  goAllRecords() {
    wx.navigateTo({ url: '/pages/progress/progress' });
  }
});
