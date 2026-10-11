/**
 * 「我的」· 诗词成长中心
 * 数据说明：优先使用本地 Demo 数据保证视觉还原，onShow 时如本地有
 * 真实学习进度 / 收藏数则自动覆盖对应字段，后续接 API 只需替换 hydrateFromStore。
 */
const db = require('../../utils/db.js');
const { toastReciteSoon } = require('../../utils/toast.js');

Page({
  data: {
    userInfo: {
      nickname: '诗词小书生',
      level: 3,
      levelName: '诗词小书生',
      studyDays: 28
    },
    statistics: [
      { value: 35, label: '已学习（首）', cls: '' },
      { value: 18, label: '已掌握（首）', cls: '' },
      { value: 7, label: '连续学习（天）', cls: '' },
      { value: '—', label: '朗诵次数（次）', cls: 'is-soon', comingSoon: true }
    ],
    growth: {
      progress: 68,
      learned: 35,
      total: 50,
      barWidth: '70%',
      level: 3,
      levelName: '诗词小书生',
      badges: 6
    },
    ringStyle: 'conic-gradient(#3F7568 0 68%, #E8E6DE 68% 100%)',
    badgeList: [
      { name: '初读', char: '初', cls: 'badge-green' },
      { name: '晨诵', char: '晨', cls: 'badge-blue' },
      { name: '拾珠', char: '拾', cls: 'badge-gold' },
      { name: '夜思', char: '思', cls: 'badge-purple' },
      { name: '登高', char: '登', cls: 'badge-teal' },
      { name: '未启', char: '待', cls: 'badge-gray' }
    ],
    contents: [
      { title: '我的收藏', desc: '收藏的诗词 12 首', iconText: '藏', iconCls: 'icon-book', url: '/pages/favorites/favorites' },
      { title: '浏览历史', desc: '最近浏览 5 首', iconText: '览', iconCls: 'icon-calendar', url: '/pages/browse/browse' },
      { title: '朗诵记录', desc: '已录制 6 条', iconText: '录', iconCls: 'icon-mic', comingSoon: true }
    ],
    weeklyData: [2, 4, 3, 5, 4, 3, 6],
    barList: [],
    learnSummary: [
      { value: 7, label: '学习诗词（首）' },
      { value: 3, label: '朗诵次数（次）' },
      { value: 5, label: '学习天数（天）' }
    ]
  },

  onLoad() {
    this.buildBars();
    this.buildRing();
  },

  onShow() {
    this.hydrateFromStore();
  },

  buildBars() {
    const max = 6;
    const barList = this.data.weeklyData.map(function (v, i) {
      return { value: v, day: ['一', '二', '三', '四', '五', '六', '日'][i], height: Math.max(12, Math.round((v / max) * 120)) + 'rpx' };
    });
    this.setData({ barList: barList });
  },

  buildRing() {
    const p = this.data.growth.progress || 68;
    this.setData({
      ringStyle: 'conic-gradient(#3F7568 0 ' + p + '%, #E8E6DE ' + p + '% 100%)'
    });
  },

  hydrateFromStore() {
    try {
      const p = db.getProgress();
      if (!p || (!p.learned && !p.recited && !p.streak)) return;
      const learned = p.learned || 35;
      const mastered = p.recited || 18;
      const streak = p.streak || 7;
      const favs = db.getFavorites();
      const favCount = favs.length || 12;
      this.setData({
        statistics: [
          { value: learned, label: '已学习（首）', cls: '' },
          { value: mastered, label: '已掌握（首）', cls: '' },
          { value: streak, label: '连续学习（天）', cls: '' },
          { value: '—', label: '朗诵次数（次）', cls: 'is-soon', comingSoon: true }
        ],
        'growth.learned': learned,
        'contents[0].desc': '收藏的诗词 ' + favCount + ' 首'
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
    if (item.url) wx.navigateTo({ url: item.url });
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
