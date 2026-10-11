const { toastReciteSoon } = require('../../utils/toast.js');

const TASK_KEY = 'todayTasks';
const TASK_DATE_KEY = 'todayTasksDate';

function todayKey() {
  const d = new Date();
  return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
}

const DEFAULT_TASKS = [
  { id: 't1', name: '背诵 5 首诗词', desc: '今日已完成 0/5', done: false, color: 'rgba(36,63,79,.10)', icon: '/assets/figma-learn/icon-9.svg' },
  { id: 't2', name: '完成 1 篇赏析', desc: '今日已完成 0/1', done: false, color: 'rgba(79,122,93,.12)', icon: '/assets/figma-learn/icon-4.svg' },
  { id: 't3', name: '收听 1 篇朗诵', desc: '今日已完成 0/1', done: false, color: 'rgba(201,74,74,.10)', icon: '/assets/figma-learn/icon-7.svg' },
  { id: 't4', name: '分享 1 首诗词', desc: '今日已完成 0/1', done: false, color: 'rgba(201,151,90,.14)', icon: '/assets/figma-learn/icon-1.svg' }
];

Page({
  data: {
    dailyDone: false,
    tasks: []
  },

  onLoad() {
    this._loadTasks();
  },

  _loadTasks() {
    let tasks = wx.getStorageSync(TASK_KEY);
    if (!tasks || wx.getStorageSync(TASK_DATE_KEY) !== todayKey()) {
      tasks = DEFAULT_TASKS.map(function (t) { return Object.assign({}, t); });
      wx.setStorageSync(TASK_KEY, tasks);
      wx.setStorageSync(TASK_DATE_KEY, todayKey());
    }
    const dailyDone = tasks.some(function (t) { return t.id === 't1' && t.done; });
    this.setData({ tasks: tasks, dailyDone: dailyDone });
  },

  toggleTask(e) {
    const id = e.currentTarget.dataset.id;
    if (id === 't3') {
      toastReciteSoon();
      return;
    }
    const tasks = this.data.tasks.map(function (t) {
      return t.id === id ? Object.assign({}, t, { done: !t.done }) : t;
    });
    wx.setStorageSync(TASK_KEY, tasks);
    wx.setStorageSync(TASK_DATE_KEY, todayKey());
    const dailyDone = tasks.some(function (t) { return t.id === 't1' && t.done; });
    this.setData({ tasks: tasks, dailyDone: dailyDone });
  },

  doDailyCheck() {
    const tasks = this.data.tasks.map(function (t) {
      return t.id === 't1' ? Object.assign({}, t, { done: true }) : t;
    });
    wx.setStorageSync(TASK_KEY, tasks);
    wx.setStorageSync(TASK_DATE_KEY, todayKey());
    this.setData({ tasks: tasks, dailyDone: true });
    wx.showToast({ title: '打卡成功！', icon: 'success' });
  }
});