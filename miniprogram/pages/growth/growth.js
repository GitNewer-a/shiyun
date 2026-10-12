/** 学习成长 / 学习记录 —— Figma node 58:2 */
const db = require('../../utils/db.js');
const { POEMS, getPoemById } = require('../../data/poems.js');

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const DAY_LABEL = ['一', '二', '三', '四', '五', '六', '日'];
const MINUTES_KEY = 'weekMinutes';
const HISTORY_KEY = 'weekMinutesHistory';
const BAR_MAX_RPX = 204;
const WEEK_HISTORY_WEEKS = 52;

/** 设计稿演示：本周时长 */
const DEMO_WEEK = [18, 25, 12, 34, 22, 41, 28];

function pad2(n) {
  return n < 10 ? '0' + n : '' + n;
}

function monthKey(year, month) {
  return year + '-' + pad2(month);
}

function dateKey(d) {
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

function mondayOf(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return d;
}

function addDays(date, n) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + n);
  return d;
}

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatMD(d) {
  return d.getMonth() + 1 + '月' + d.getDate() + '日';
}

function weekRangeLabel(monday, isCurrent) {
  if (isCurrent) return '本周学习时长';
  const sunday = addDays(monday, 6);
  if (monday.getMonth() === sunday.getMonth()) {
    return monday.getMonth() + 1 + '月' + monday.getDate() + '-' + sunday.getDate() + '日';
  }
  return formatMD(monday) + '-' + formatMD(sunday);
}

function hashSeed(str) {
  let h = 0;
  let i;
  for (i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

/** 无真实数据时，按周生成稳定演示值 */
function demoWeekFromKey(key) {
  const seed = hashSeed(key);
  return [0, 1, 2, 3, 4, 5, 6].map(function (i) {
    return 8 + ((seed >> (i * 3)) % 28);
  });
}

function readHistory() {
  return wx.getStorageSync(HISTORY_KEY) || {};
}

function writeHistory(map) {
  wx.setStorageSync(HISTORY_KEY, map);
}

function currentWeekMinutes() {
  const saved = wx.getStorageSync(MINUTES_KEY);
  if (saved && saved.length === 7) return saved.slice();
  return DEMO_WEEK.slice();
}

/** 确保当前周写入历史，便于回看 */
function syncCurrentWeekToHistory(today) {
  const mon = mondayOf(today);
  const key = dateKey(mon);
  const map = readHistory();
  map[key] = currentWeekMinutes();
  writeHistory(map);
}

function getWeekMinutes(monday, today, active) {
  const key = dateKey(monday);
  const thisMon = mondayOf(today);
  const isCurrent = sameDay(monday, thisMon);
  const hist = readHistory();

  if (hist[key] && hist[key].length === 7) return hist[key].slice();
  if (isCurrent) return currentWeekMinutes();
  if (!active) return demoWeekFromKey(key);
  return [0, 0, 0, 0, 0, 0, 0];
}

/** 可选最早年份：当前年往前 10 年 */
function pickerRange(today) {
  const cy = today.getFullYear();
  const cm = today.getMonth() + 1;
  return {
    start: cy - 10 + '-01',
    end: cy + '-' + pad2(cm)
  };
}

function weekPickerRange(today) {
  const end = today;
  const start = addDays(mondayOf(today), -7 * WEEK_HISTORY_WEEKS);
  return {
    start: dateKey(start),
    end: dateKey(end)
  };
}

function shiftMonth(year, month, delta) {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function isSameMonth(y1, m1, y2, m2) {
  return y1 === y2 && m1 === m2;
}

function isAfterMonth(y1, m1, y2, m2) {
  return y1 > y2 || (y1 === y2 && m1 > m2);
}

function buildCalendar(year, month, studied, todayDay) {
  const first = new Date(year, month - 1, 1).getDay();
  const count = new Date(year, month, 0).getDate();
  const cells = [];
  let i;
  for (i = 0; i < first; i++) {
    cells.push({ id: 'e' + i, empty: true });
  }
  for (i = 1; i <= count; i++) {
    const done = !!studied[i];
    cells.push({
      id: 'd' + i,
      empty: false,
      day: i,
      studied: done,
      isToday: todayDay > 0 && i === todayDay
    });
  }
  return cells;
}

function demoStudiedForMonth(year, month, today) {
  if (!isSameMonth(year, month, today.getFullYear(), today.getMonth() + 1)) {
    return {};
  }
  const map = {};
  const end = today.getDate();
  const start = Math.max(1, end - 20);
  let d;
  for (d = start; d <= end; d++) map[d] = 1;
  return map;
}

function studiedForMonth(year, month, progress, active, today) {
  const key = monthKey(year, month);
  const byMonth = (progress && progress.studiedByMonth) || {};
  if (byMonth[key]) return byMonth[key];
  if (
    active &&
    progress.studied &&
    isSameMonth(year, month, today.getFullYear(), today.getMonth() + 1)
  ) {
    return progress.studied;
  }
  if (!active) return demoStudiedForMonth(year, month, today);
  return {};
}

function longestDayNote(minutes, isCurrent) {
  let max = -1;
  let idx = 0;
  let i;
  for (i = 0; i < minutes.length; i++) {
    if (minutes[i] > max) {
      max = minutes[i];
      idx = i;
    }
  }
  if (max <= 0) {
    return isCurrent ? '本周还没有学习记录' : '这周还没有学习记录';
  }
  return '周' + DAY_LABEL[idx] + '学习最久，共 ' + max + ' 分钟';
}

function demoRecent() {
  const a = getPoemById('p002') || POEMS[1];
  const b = getPoemById('p001') || POEMS[0];
  return [
    {
      id: a.id,
      mark: a.title.slice(a.title.length - 1),
      title: '《' + a.title + '》',
      verse: (a.lines && a.lines.slice(0, 2).join('')) || '',
      meta: a.author + ' · ' + a.dynasty + ' · 今天 08:12'
    },
    {
      id: b.id,
      mark: b.title.slice(b.title.length - 1),
      title: '《' + b.title + '》',
      verse: (b.lines && b.lines.slice(0, 2).join('')) || '',
      meta: b.author + ' · ' + b.dynasty + ' · 昨天 21:04'
    }
  ];
}

function buildWeekBars(minutes, monday, today) {
  const thisMon = mondayOf(today);
  const isCurrent = sameDay(monday, thisMon);
  const todayIdx = isCurrent ? (today.getDay() + 6) % 7 : 6;
  const clamped = minutes.map(function (m, i) {
    return i > todayIdx ? 0 : m;
  });
  const max = Math.max.apply(null, clamped.concat([1]));
  const weekBars = clamped.map(function (m, i) {
    const future = i > todayIdx;
    return {
      day: DAY_LABEL[i],
      minutes: future ? '' : m,
      isToday: isCurrent && i === todayIdx,
      isFuture: future,
      height: future ? 0 : Math.max(m > 0 ? 8 : 0, Math.round((m / max) * BAR_MAX_RPX))
    };
  });
  const total = clamped.reduce(function (a, b) {
    return a + b;
  }, 0);
  return {
    weekBars: weekBars,
    total: total,
    note: longestDayNote(clamped, isCurrent),
    isCurrent: isCurrent
  };
}

Page({
  data: {
    statusBarHeight: 20,
    navOffset: 64,
    streak: 21,
    streakHint: '本月已坚持 21 天，继续保持',
    streakDots: [
      { id: 's0', on: 1 }, { id: 's1', on: 1 }, { id: 's2', on: 1 },
      { id: 's3', on: 1 }, { id: 's4', on: 1 }, { id: 's5', on: 1 }, { id: 's6', on: 0 }
    ],
    learned: 120,
    weekMinutesTotal: 180,
    viewYear: 2026,
    viewMonth: 10,
    monthLabel: '',
    pickerValue: '',
    pickerStart: '2016-01',
    pickerEnd: '',
    canGoNext: false,
    weekLabel: '本周学习时长',
    weekPickerValue: '',
    weekPickerStart: '',
    weekPickerEnd: '',
    canGoNextWeek: false,
    weekdays: WEEKDAYS,
    cells: [],
    weekBars: [],
    chartNote: '',
    recent: []
  },

  onLoad() {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const statusBarHeight = info.statusBarHeight || 20;
    const today = new Date();
    const range = pickerRange(today);
    const wRange = weekPickerRange(today);
    this.viewYear = today.getFullYear();
    this.viewMonth = today.getMonth() + 1;
    this.viewWeekStart = mondayOf(today);
    this.setData({
      statusBarHeight: statusBarHeight,
      navOffset: statusBarHeight + 44,
      viewYear: this.viewYear,
      viewMonth: this.viewMonth,
      pickerStart: range.start,
      pickerEnd: range.end,
      pickerValue: monthKey(this.viewYear, this.viewMonth),
      weekPickerStart: wRange.start,
      weekPickerEnd: wRange.end,
      weekPickerValue: dateKey(today)
    });
  },

  onShow() {
    this.render();
  },

  renderCalendar() {
    const today = new Date();
    const cy = today.getFullYear();
    const cm = today.getMonth() + 1;
    const year = this.viewYear;
    const month = this.viewMonth;
    const p = db.getProgress();
    const active = (p.learned || 0) + (p.recited || 0) + (p.streak || 0) > 0;
    const studied = studiedForMonth(year, month, p, active, today);
    const todayDay = isSameMonth(year, month, cy, cm) ? today.getDate() : 0;
    const canGoNext = isAfterMonth(cy, cm, year, month);

    const range = pickerRange(today);
    this.setData({
      viewYear: year,
      viewMonth: month,
      monthLabel: year + ' 年 ' + month + ' 月',
      pickerValue: monthKey(year, month),
      pickerStart: range.start,
      pickerEnd: range.end,
      canGoNext: canGoNext,
      cells: buildCalendar(year, month, studied, todayDay)
    });
  },

  renderWeekChart() {
    const today = new Date();
    const p = db.getProgress();
    const active = (p.learned || 0) + (p.recited || 0) + (p.streak || 0) > 0;
    syncCurrentWeekToHistory(today);

    if (!this.viewWeekStart) this.viewWeekStart = mondayOf(today);
    const monday = this.viewWeekStart;
    const thisMon = mondayOf(today);
    const isCurrent = sameDay(monday, thisMon);
    const earliest = addDays(thisMon, -7 * WEEK_HISTORY_WEEKS);
    if (monday < earliest) {
      this.viewWeekStart = earliest;
    }
    if (monday > thisMon) {
      this.viewWeekStart = thisMon;
    }

    const viewMon = this.viewWeekStart;
    const minutes = getWeekMinutes(viewMon, today, active);
    const chart = buildWeekBars(minutes, viewMon, today);
    const wRange = weekPickerRange(today);

    // 顶部「本周学习时长」始终显示当前周合计
    const currentMins = getWeekMinutes(thisMon, today, active);
    const currentChart = buildWeekBars(currentMins, thisMon, today);

    this.setData({
      weekLabel: weekRangeLabel(viewMon, chart.isCurrent),
      weekPickerValue: dateKey(addDays(viewMon, chart.isCurrent ? (today.getDay() + 6) % 7 : 0)),
      weekPickerStart: wRange.start,
      weekPickerEnd: wRange.end,
      canGoNextWeek: !chart.isCurrent,
      weekBars: chart.weekBars,
      chartNote: chart.note,
      weekMinutesTotal: currentChart.total
    });
  },

  render() {
    const p = db.getProgress();
    const active = (p.learned || 0) + (p.recited || 0) + (p.streak || 0) > 0;
    const today = new Date();
    const streak = active ? p.streak || 0 : 21;
    const learned = active ? p.learned || 0 : 120;

    const filled = !active
      ? 6
      : Math.min(7, Math.max(0, streak % 7 || (streak > 0 ? 7 : 0)));
    const streakDots = [0, 1, 2, 3, 4, 5, 6].map(function (i) {
      return { id: 's' + i, on: i < filled ? 1 : 0 };
    });

    let recent = demoRecent();
    if (active && p.learned > 0) {
      recent = POEMS.slice(0, Math.min(2, p.learned)).map(function (poem) {
        return {
          id: poem.id,
          mark: poem.title.slice(poem.title.length - 1),
          title: '《' + poem.title + '》',
          verse: (poem.lines && poem.lines.slice(0, 2).join('')) || '',
          meta: poem.author + ' · ' + poem.dynasty
        };
      });
    }

    this.setData({
      streak: streak,
      streakHint: streak > 0 ? '本月已坚持 ' + streak + ' 天，继续保持' : '今天开始学习，留下你的第一个足迹吧',
      streakDots: streakDots,
      learned: learned,
      recent: recent
    });
    this.renderCalendar();
    this.renderWeekChart();
  },

  prevMonth() {
    const next = shiftMonth(this.viewYear, this.viewMonth, -1);
    const today = new Date();
    const earliest = today.getFullYear() - 10;
    if (next.year < earliest || (next.year === earliest && next.month < 1)) return;
    this.viewYear = next.year;
    this.viewMonth = next.month;
    this.renderCalendar();
  },

  nextMonth() {
    const today = new Date();
    const next = shiftMonth(this.viewYear, this.viewMonth, 1);
    if (isAfterMonth(next.year, next.month, today.getFullYear(), today.getMonth() + 1)) {
      return;
    }
    this.viewYear = next.year;
    this.viewMonth = next.month;
    this.renderCalendar();
  },

  onMonthPick(e) {
    const value = e.detail.value || '';
    const parts = value.split('-');
    if (parts.length < 2) return;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    if (!year || !month) return;
    const today = new Date();
    if (isAfterMonth(year, month, today.getFullYear(), today.getMonth() + 1)) return;
    this.viewYear = year;
    this.viewMonth = month;
    this.renderCalendar();
  },

  prevWeek() {
    const today = new Date();
    const earliest = addDays(mondayOf(today), -7 * WEEK_HISTORY_WEEKS);
    const next = addDays(this.viewWeekStart || mondayOf(today), -7);
    if (next < earliest) return;
    this.viewWeekStart = next;
    this.renderWeekChart();
  },

  nextWeek() {
    const today = new Date();
    const thisMon = mondayOf(today);
    const next = addDays(this.viewWeekStart || thisMon, 7);
    if (next > thisMon) return;
    this.viewWeekStart = next;
    this.renderWeekChart();
  },

  onWeekPick(e) {
    const value = e.detail.value || '';
    const parts = value.split('-');
    if (parts.length < 3) return;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (!y || m < 0 || !d) return;
    const picked = new Date(y, m, d);
    const today = new Date();
    const thisMon = mondayOf(today);
    const earliest = addDays(thisMon, -7 * WEEK_HISTORY_WEEKS);
    let mon = mondayOf(picked);
    if (mon > thisMon) mon = thisMon;
    if (mon < earliest) mon = earliest;
    this.viewWeekStart = mon;
    this.renderWeekChart();
  },

  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) wx.navigateBack();
    else wx.switchTab({ url: '/pages/learn/learn' });
  },

  onDay(e) {
    const day = e.currentTarget.dataset.day;
    const studied = e.currentTarget.dataset.studied;
    if (!day) return;
    wx.showToast({
      title: studied ? day + ' 日已学习' : day + ' 日还没有学习',
      icon: 'none'
    });
  },

  goAll() {
    wx.navigateTo({ url: '/pages/progress/progress' });
  },

  goPoem(e) {
    const id = e.currentTarget.dataset.id;
    if (id) wx.navigateTo({ url: '/pages/poem/poem?id=' + id });
  }
});
