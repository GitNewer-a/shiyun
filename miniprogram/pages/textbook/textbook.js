const { POEMS } = require('../../data/poems.js');

const COVERS = [
  'linear-gradient(160deg, #57747a 0%, #2c4b59 100%)',
  'linear-gradient(160deg, #6b8e6b 0%, #3d6248 100%)',
  'linear-gradient(160deg, #a08050 0%, #6b5030 100%)',
  'linear-gradient(160deg, #7a6b8a 0%, #4a3d5a 100%)',
  'linear-gradient(160deg, #5a7a8a 0%, #2d4a5a 100%)'
];

Page({
  data: {
    activeGrade: '小学',
    grades: ['小学', '初中', '高中'],
    allPoems: [],
    filteredPoems: []
  },

  onLoad() {
    this._filter('小学');
  },

  _filter(stage) {
    const list = POEMS.filter(function (p) { return p.stage === stage; }).map(function (p, i) {
      return Object.assign({}, p, { coverBg: COVERS[i % COVERS.length] });
    });
    this.setData({ filteredPoems: list });
  },

  switchGrade(e) {
    const grade = e.currentTarget.dataset.idx;
    this.setData({ activeGrade: this.data.grades[grade] });
    this._filter(this.data.grades[grade]);
  },

  goPoem(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/poem/poem?id=' + id });
  }
});