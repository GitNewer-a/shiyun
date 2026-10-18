/** 我的收藏 —— Figma 59:2 */
const db = require('../../utils/db.js');
const { POEMS } = require('../../data/poems.js');
const { toastReciteSoon } = require('../../utils/toast.js');

const STAGE_LABEL = {
  小学: '小学必背',
  初中: '初中必读',
  高中: '高中推荐'
};

/** 快捷筛选由诗库数据推导：库里没有的体裁 / 学段不会出现空桶
    （原先写死了「宋词」「高中」，诗库调整后会点出空列表） */
function buildFilters() {
  const out = [{ key: 'all', label: '全部' }];
  const genres = [];
  const stages = [];
  POEMS.forEach(function (p) {
    if (genres.indexOf(p.genre) === -1) genres.push(p.genre);
    if (stages.indexOf(p.stage) === -1) stages.push(p.stage);
  });
  genres.forEach(function (g) {
    out.push({ key: 'genre:' + g, label: g });
  });
  stages.forEach(function (s) {
    out.push({ key: 'stage:' + s, label: STAGE_LABEL[s] || s });
  });
  return out;
}

const FILTERS = buildFilters();

const THEME_RULES = [
  { re: /故乡|乡思|思乡|低头思/, theme: '思乡' },
  { re: /春眠|春晓|花落|惜春|春风/, theme: '惜春' },
  { re: /婵娟|千里|怀人|相思/, theme: '怀人' },
  { re: /愁|瘦|消魂|西风/, theme: '愁思' },
  { re: /悠悠|怆然|孤|独/, theme: '孤寂' },
  { re: /山水|山|江|湖|舟/, theme: '山水' },
  { re: /花|鸟|物/, theme: '咏物' }
];

function pad2(n) {
  return n < 10 ? '0' + n : '' + n;
}

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatFavTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  if (sameDay(d, now)) {
    return '今天 ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }
  const yest = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (sameDay(d, yest)) {
    return '昨天 ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }
  return d.getMonth() + 1 + '月' + d.getDate() + '日';
}

function sealOf(title) {
  if (!title) return '诗';
  if (title.length === 3) return title.charAt(1);
  if (title.length === 2) return title.charAt(1);
  if (title.length > 3) return title.charAt(Math.floor(title.length / 2));
  return title.charAt(0);
}

function themeOf(poem) {
  const text = poem.title + (poem.lines || []).join('');
  for (let i = 0; i < THEME_RULES.length; i++) {
    if (THEME_RULES[i].re.test(text)) return THEME_RULES[i].theme;
  }
  return '经典';
}

function quoteOf(poem) {
  const lines = poem.lines || [];
  let a = (lines[0] || '').trim();
  let b = (lines[1] || '').trim();
  if (a && !/[，,。．！？;；]$/.test(a)) a += '，';
  if (b && !/[。．！？]$/.test(b)) b += '。';
  return (a + b).trim();
}

function matchFilter(poem, filter) {
  if (!filter || filter === 'all') return true;
  if (filter.indexOf('genre:') === 0) return poem.genre === filter.slice(6);
  if (filter.indexOf('stage:') === 0) return poem.stage === filter.slice(6);
  return true;
}

Page({
  data: {
    statusBarHeight: 20,
    navOffset: 64,
    filters: FILTERS,
    filter: 'all',
    sort: 'time',
    sortTimeIcon: '/assets/figma-favorites/sort-time-on.svg',
    sortTitleIcon: '/assets/figma-favorites/sort-title-off.svg',
    stats: { count: 0, authors: 0, dynasties: 0 },
    list: []
  },

  onLoad() {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const statusBarHeight = info.statusBarHeight || 20;
    this.setData({
      statusBarHeight: statusBarHeight,
      navOffset: statusBarHeight + 44
    });
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const entries = db.getFavoriteEntries();
    const atMap = {};
    entries.forEach(function (e) {
      atMap[e.id] = e.at || 0;
    });

    const all = POEMS.filter(function (p) {
      return atMap[p.id] !== undefined;
    }).map(function (p) {
      return Object.assign({}, p, {
        seal: sealOf(p.title),
        quote: quoteOf(p),
        theme: themeOf(p),
        stageLabel: STAGE_LABEL[p.stage] || p.stage,
        favAt: atMap[p.id],
        timeLabel: formatFavTime(atMap[p.id])
      });
    });

    const authorSet = {};
    const dynastySet = {};
    all.forEach(function (p) {
      authorSet[p.author] = 1;
      dynastySet[p.dynasty] = 1;
    });

    const filter = this.data.filter;
    const sort = this.data.sort;
    let list = all.filter(function (p) {
      return matchFilter(p, filter);
    });

    if (sort === 'title') {
      list = list.slice().sort(function (a, b) {
        return a.title.localeCompare(b.title, 'zh');
      });
    } else {
      list = list.slice().sort(function (a, b) {
        return (b.favAt || 0) - (a.favAt || 0);
      });
    }

    this.setData({
      stats: {
        count: all.length,
        authors: Object.keys(authorSet).length,
        dynasties: Object.keys(dynastySet).length
      },
      sortTimeIcon:
        '/assets/figma-favorites/sort-time-' + (sort === 'time' ? 'on' : 'off') + '.svg',
      sortTitleIcon:
        '/assets/figma-favorites/sort-title-' + (sort === 'title' ? 'on' : 'off') + '.svg',
      list: list
    });
  },

  onFilter(e) {
    const key = e.currentTarget.dataset.key;
    if (!key || key === this.data.filter) return;
    this.setData({ filter: key }, this.refresh);
  },

  onSort(e) {
    const sort = e.currentTarget.dataset.sort;
    if (!sort || sort === this.data.sort) return;
    this.setData({ sort: sort }, this.refresh);
  },

  toggleFav(e) {
    db.toggleFavorite(e.currentTarget.dataset.id);
    this.refresh();
  },

  onPlay() {
    toastReciteSoon();
  },

  goPoem(e) {
    wx.navigateTo({ url: '/pages/poem/poem?id=' + e.currentTarget.dataset.id });
  },

  goSearch() {
    wx.navigateTo({ url: '/pages/search/search' });
  },

  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) wx.navigateBack();
    else wx.switchTab({ url: '/pages/profile/profile' });
  }
});
