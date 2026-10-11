const { searchPoems } = require('../../data/poems.js');

Page({
  data: {
    keyword: '',
    result: []
  },

  onLoad() {
    wx.setNavigationBarTitle({ title: '搜索' });
  },

  onInput(e) {
    this.setData({ keyword: e.detail.value }, this.doSearch);
  },

  doSearch() {
    this.setData({ result: searchPoems(this.data.keyword) });
  },

  goPoem(e) {
    wx.navigateTo({ url: '/pages/poem/poem?id=' + e.currentTarget.dataset.id });
  }
});
