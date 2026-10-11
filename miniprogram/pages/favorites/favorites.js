const db = require('../../utils/db.js');
const { POEMS } = require('../../data/poems.js');

const COVERS = [
  'linear-gradient(160deg, #2c4b59 0%, #243f4f 100%)',
  'linear-gradient(160deg, #4f7a5d 0%, #3d6248 100%)',
  'linear-gradient(160deg, #304e5b 0%, #1c2b24 100%)',
  'linear-gradient(160deg, #8a6f4a 0%, #5f4a2f 100%)'
];

Page({
  data: {
    list: []
  },

  onLoad() {
    wx.setNavigationBarTitle({ title: '收藏' });
  },

  onShow() {
    const ids = db.getFavorites();
    const list = POEMS.filter(function (p) {
      return ids.indexOf(p.id) > -1;
    }).map(function (p) {
      return Object.assign({}, p, {
        coverBg: COVERS[p.id.charCodeAt(p.id.length - 1) % COVERS.length]
      });
    });
    this.setData({ list: list });
  },

  toggleFav(e) {
    db.toggleFavorite(e.currentTarget.dataset.id);
    this.onShow();
  },

  goPoem(e) {
    wx.navigateTo({ url: '/pages/poem/poem?id=' + e.currentTarget.dataset.id });
  }
});
