/**
 * 设置页
 * 账户卡 + 学习偏好（当前学段 / 每日目标 / 学习提醒）
 * + 阅读与朗读（诗文字号 / 拼音 / 音色 / 自动朗读 / 练习音效）
 * + 通用（夜读 / 清缓存 / 帮助 / 协议 / 关于）
 * 偏好落 storage，与首页学段筛选共用 settings.stage。
 */
const { toastReciteSoon } = require('../../utils/toast.js');

const SETTINGS_KEY = 'settings';

function loadSettings() {
  try {
    const saved = wx.getStorageSync(SETTINGS_KEY);
    if (saved && typeof saved === 'object') return saved;
  } catch (e) {}
  return {
    stage: 'junior',
    dailyGoal: 3,
    remind: true,
    fontSize: 'standard',
    pinyin: true,
    autoRead: false,
    sfx: true,
    nightMode: false
  };
}

function saveSettings(next) {
  try {
    wx.setStorageSync(SETTINGS_KEY, next);
  } catch (e) {}
}

Page({
  data: {
    account: {
      char: '知',
      name: '知行',
      sub: '账号 138****6021 · 诗童 Lv5'
    },
    stages: [
      { key: 'primary', label: '小学' },
      { key: 'junior', label: '初中' },
      { key: 'senior', label: '高中' },
      { key: 'lover', label: '爱好者' }
    ],
    fontSizes: [
      { key: 'small', label: '小' },
      { key: 'standard', label: '标准' },
      { key: 'large', label: '大' }
    ],
    fontPreviewSize: '18',
    settings: loadSettings()
  },

  applySettings(next) {
    saveSettings(next);
    this.setData({ settings: next });
  },

  onStageTap(e) {
    this.applySettings(Object.assign({}, this.data.settings, { stage: e.currentTarget.dataset.key }));
  },

  onGoalMinus() {
    const next = Math.max(1, this.data.settings.dailyGoal - 1);
    if (next === this.data.settings.dailyGoal) return;
    this.applySettings(Object.assign({}, this.data.settings, { dailyGoal: next }));
  },

  onGoalPlus() {
    const next = Math.min(10, this.data.settings.dailyGoal + 1);
    if (next === this.data.settings.dailyGoal) return;
    this.applySettings(Object.assign({}, this.data.settings, { dailyGoal: next }));
  },

  onFontSizeTap(e) {
    const sizeMap = { small: '14', standard: '18', large: '22' };
    const key = e.currentTarget.dataset.key;
    this.setData({ fontPreviewSize: sizeMap[key] });
    this.applySettings(Object.assign({}, this.data.settings, { fontSize: key }));
  },

  onSwitch(e) {
    const key = e.currentTarget.dataset.key;
    this.applySettings(Object.assign({}, this.data.settings, { [key]: !this.data.settings[key] }));
  },

  onCacheTap() {
    wx.showModal({
      title: '清除缓存',
      content: '将清除浏览历史与临时数据，收藏和学习进度不受影响。',
      confirmText: '清除',
      confirmColor: '#C94A4A',
      success: (res) => {
        if (!res.confirm) return;
        try {
          wx.removeStorageSync('browseHistory');
        } catch (e) {}
        wx.showToast({ title: '已清除', icon: 'success' });
      }
    });
  },

  onHelpTap() {
    toastReciteSoon();
  },

  onAgreementTap() {
    toastReciteSoon();
  },

  onAboutTap() {
    wx.navigateTo({ url: '/pages/about/about', fail: () => {} });
  },

  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出当前账号吗？',
      confirmText: '退出',
      confirmColor: '#C94A4A',
      success: (res) => {
        if (!res.confirm) return;
        try {
          wx.removeStorageSync('openid');
        } catch (e) {}
        wx.switchTab({ url: '/pages/home/home' });
      }
    });
  }
});
