/**
 * 「我的」· 诗词成长中心
 * 成长卡与学习页共用 utils/growth 快照；内容区数量来自本地存储。
 */
const db = require('../../utils/db.js');
const { getGrowthSnapshot } = require('../../utils/growth.js');
const { toastReciteSoon } = require('../../utils/toast.js');

Page({
  data: {
    userInfo: {
      nickname: '诗词小书生',
      level: 1,
      levelName: '诗词初学者',
      studyDays: 0
    },
    statistics: [
      { value: 0, label: '已学习（首）', cls: '' },
      { value: 0, label: '已掌握（首）', cls: '' },
      { value: 0, label: '连续学习（天）', cls: '' },
      { value: '—', label: '朗诵次数（次）', cls: 'is-soon', comingSoon: true }
    ],
    growth: {
      progress: 0,
      learned: 0,
      total: 0,
      barWidth: '0%',
      level: 1,
      levelName: '',
      badges: 0
    },
    ringStyle: 'conic-gradient(#3F7568 0 0%, #E8E6DE 0% 100%)',
    badgeList: [],
    contents: []
  },

  onShow() {
    this.hydrateFromStore();
  },

  hydrateFromStore() {
    try {
      const g = getGrowthSnapshot();
      const favCount = db.getFavorites().length;
      const histCount = db.getBrowseHistory().length;
      const reciteCount = 0;

      this.setData({
        userInfo: {
          nickname: this.data.userInfo.nickname,
          level: g.level,
          levelName: g.levelName,
          studyDays: g.streak
        },
        statistics: [
          { value: g.learned, label: '已学习（首）', cls: '' },
          { value: g.mastered, label: '已掌握（首）', cls: '' },
          { value: g.streak, label: '连续学习（天）', cls: '' },
          { value: '—', label: '朗诵次数（次）', cls: 'is-soon', comingSoon: true }
        ],
        growth: {
          progress: g.progress,
          learned: g.learned,
          total: g.total,
          barWidth: g.barWidth,
          level: g.level,
          levelName: g.levelName,
          badges: g.badges
        },
        ringStyle: 'conic-gradient(#3F7568 0 ' + g.progress + '%, #E8E6DE ' + g.progress + '% 100%)',
        badgeList: g.badgeList,
        contents: [
          { title: '我的收藏', desc: '收藏的诗词 ' + favCount + ' 首', iconText: '藏', iconCls: 'icon-book', url: '/pages/favorites/favorites' },
          { title: '浏览历史', desc: '最近浏览 ' + histCount + ' 首', iconText: '览', iconCls: 'icon-calendar', url: '/pages/browse/browse' },
          { title: '朗诵记录', desc: '已录制 ' + reciteCount + ' 条', iconText: '录', iconCls: 'icon-mic', comingSoon: true }
        ]
      });
    } catch (err) {}
  },

  onStatTap(e) {
    if (e.currentTarget.dataset.soon) toastReciteSoon();
  },

  onContentTap(e) {
    const idx = e.currentTarget.dataset.index;
    const item = this.data.contents[idx];
    if (!item) return;
    if (item.comingSoon) {
      toastReciteSoon();
      return;
    }
    if (!item.url) return;
    if (item.url.indexOf('/pages/browse/browse') === 0) {
      wx.switchTab({ url: item.url });
      return;
    }
    wx.navigateTo({ url: item.url });
  },

  onGrowthTap() {
    wx.navigateTo({ url: '/pages/growth/growth' });
  },

  onSettingsTap() {
    wx.navigateTo({ url: '/pages/settings/settings' });
  },

  onAboutTap() {
    wx.navigateTo({ url: '/pages/about/about' });
  }
});
