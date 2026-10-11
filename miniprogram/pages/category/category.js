const { toastReciteSoon } = require('../../utils/toast.js');

Page({
  data: {
    activeTab: 0,
    tabs: [
      { key: 'scene', label: '按场景' },
      { key: 'exam', label: '按考试' },
      { key: 'ability', label: '按能力' }
    ]
  },
  switchTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.idx });
  },
  toastReciteSoon: toastReciteSoon
});