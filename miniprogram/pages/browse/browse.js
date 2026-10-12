const db = require('../../utils/db.js');
const { POEMS, filterPoems } = require('../../data/poems.js');

/** 作者选项由数据推导，避免硬编码后与库内容脱节 */
function authorOptions() {
  const set = [];
  POEMS.forEach(function (p) {
    if (set.indexOf(p.author) === -1) set.push(p.author);
  });
  return ['全部'].concat(set);
}

/** 配图兜底：按 id 生成稳定的远山渐变，保证同一首诗每次同色 */
const COVERS = [
  'linear-gradient(160deg, #2c4b59 0%, #243f4f 100%)',
  'linear-gradient(160deg, #4f7a5d 0%, #3d6248 100%)',
  'linear-gradient(160deg, #304e5b 0%, #1c2b24 100%)',
  'linear-gradient(160deg, #8a6f4a 0%, #5f4a2f 100%)'
];

function coverOf(poem) {
  if (poem.img) return 'url(' + poem.img + ')';
  const n = parseInt(poem.id.slice(1), 10);
  if (n >= 1 && n <= 12) return 'url(/assets/figma-browse/poem-' + n + '.png)';
  return COVERS[n % COVERS.length];
}

Page({
  data: {
    groups: [
      { key: 'stage', label: '学段', options: ['全部', '小学', '初中', '高中'], value: '全部' },
      { key: 'genre', label: '体裁', options: ['全部', '唐诗', '宋词', '宋诗', '元曲'], value: '全部' },
      { key: 'author', label: '作者', options: authorOptions(), value: '全部' }
    ],
    list: []
  },

  onLoad(options) {
    if (options && options.genre) {
      this.applyFilter('genre', decodeURIComponent(options.genre));
    }
  },

  onShow() {
    // 首页四宫格跳过来时消费 genre（switchTab 不能带 query）
    const pending = wx.getStorageSync('browseGenre');
    if (pending) {
      wx.removeStorageSync('browseGenre');
      this.applyFilter('genre', pending);
      return;
    }
    this.refresh();
  },

  applyFilter(key, value) {
    const groups = this.data.groups.map(function (g) {
      return g.key === key ? Object.assign({}, g, { value: value }) : g;
    });
    this.setData({ groups: groups }, this.refresh);
  },

  onFilter(e) {
    const { key, value } = e.currentTarget.dataset;
    // 点已选中的芯片则复位为「全部」
    const cur = this.data.groups.filter(function (g) {
      return g.key === key;
    })[0];
    this.applyFilter(key, cur && cur.value === value ? '全部' : value);
  },

  /** 三组 AND 逻辑过滤（设计文档 §4.3） */
  refresh() {
    const picked = {};
    this.data.groups.forEach(function (g) {
      picked[g.key] = g.value === '全部' ? 'all' : g.value;
    });

    const favs = db.getFavorites();
    const list = filterPoems(picked.stage, picked.genre, picked.author).map(function (p) {
      return Object.assign({}, p, {
        fav: favs.indexOf(p.id) > -1,
        coverBg: coverOf(p)
      });
    });

    this.setData({ list: list });
  },

  toggleFav(e) {
    const id = e.currentTarget.dataset.id;
    db.toggleFavorite(id);
    this.refresh();
    wx.showToast({
      title: db.isFavorite(id) ? '已收藏' : '已取消',
      icon: 'none',
      duration: 1200
    });
  },

  goPoem(e) {
    wx.navigateTo({ url: '/pages/poem/poem?id=' + e.currentTarget.dataset.id });
  }
});
