const { getPoemById } = require('../../data/poems.js');
const { toastReciteSoon } = require('../../utils/toast.js');

Page({
  data: {
    poem: {}
  },

  onLoad(options) {
    const id = (options && options.id) || 'p001';
    const poem = getPoemById(id) || getPoemById('p001');
    this.setData({ poem: poem });
    wx.setNavigationBarTitle({ title: '朗读 · ' + poem.title });
    toastReciteSoon();
  }
});
