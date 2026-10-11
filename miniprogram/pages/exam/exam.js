const { POEMS } = require('../../data/poems.js');

const COVERS = [
  'linear-gradient(160deg, #57747a 0%, #2c4b59 100%)',
  'linear-gradient(160deg, #6b8e6b 0%, #3d6248 100%)',
  'linear-gradient(160deg, #a08050 0%, #6b5030 100%)',
  'linear-gradient(160deg, #7a6b8a 0%, #4a3d5a 100%)'
];

const PAGE_TITLE = { zhongkao: '中考篇', gokao: '高考篇' };

Page({
  data: {
    pageTitle: '',
    activeTag: 'all',
    poems: []
  },

  onLoad(options) {
    const pageTitle = PAGE_TITLE[options.type] || '诗词篇';
    wx.setNavigationBarTitle({ title: pageTitle });
    this.setData({ pageTitle });
    this._load(options.type || 'zhongkao');
  },

  _load(type) {
    const isZhongkao = type === 'zhongkao';
    const stageFilter = isZhongkao ? ['小学', '初中'] : ['初中', '高中'];
    const poems = POEMS
      .filter(function (p) { return stageFilter.indexOf(p.stage) !== -1; })
      .map(function (p, i) {
        return Object.assign({}, p, {
          coverBg: COVERS[i % COVERS.length],
          tags: isZhongkao ? ['必考', p.stage] : ['必考', p.genre]
        });
      });
    this.setData({ poems: poems });
  },

  switchTag(e) {
    this.setData({ activeTag: e.currentTarget.dataset.tag });
  },

  goPoem(e) {
    wx.navigateTo({ url: '/pages/poem/poem?id=' + e.currentTarget.dataset.id });
  }
});