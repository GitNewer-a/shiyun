/* 数据访问层
   云开发可用时走云数据库，不可用时自动降级到本地 data/poems.js，
   保证无云环境也能跑通全部页面（设计文档 §7「状态」一条）。
   ------------------------------------------------------------------ */

const local = require('../data/poems.js');

function cloudReady() {
  const app = getApp();
  return !!(app && app.globalData && app.globalData.cloudReady && wx.cloud);
}

/** 诗词集合（云开发未就绪时返回 null，调用方自行兜底） */
function poemsCollection() {
  if (!cloudReady()) return null;
  return wx.cloud.database().collection('poems');
}

/**
 * 取诗词列表
 * @param {{stage?:string, genre?:string, author?:string}} filter
 * @returns {Promise<Array>}
 */
function getPoems(filter) {
  filter = filter || {};
  const localList = local.filterPoems(filter.stage, filter.genre, filter.author);
  const col = poemsCollection();

  if (!col) return Promise.resolve(localList);

  const where = {};
  if (filter.stage && filter.stage !== 'all') where.stage = filter.stage;
  if (filter.genre && filter.genre !== 'all') where.genre = filter.genre;
  if (filter.author && filter.author !== 'all') where.author = filter.author;

  return col
    .where(where)
    .limit(50)
    .get()
    .then(function (res) {
      return (res.data && res.data.length) ? res.data : localList;
    })
    .catch(function (err) {
      console.warn('[诗韵] 云端诗词读取失败，降级本地数据', err);
      return localList;
    });
}

/**
 * 取单首诗词
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
function getPoem(id) {
  const localPoem = local.getPoemById(id);
  const col = poemsCollection();

  if (!col) return Promise.resolve(localPoem);

  return col
    .doc(id)
    .get()
    .then(function (res) {
      return res.data || localPoem;
    })
    .catch(function (err) {
      console.warn('[诗韵] 云端诗词详情读取失败，降级本地数据', err);
      return localPoem;
    });
}

/** 收藏条目：兼容旧版纯 id 字符串，新版为 { id, at } */
function normalizeFavoriteEntries(raw) {
  const list = raw || [];
  return list.map(function (item) {
    if (typeof item === 'string') return { id: item, at: 0 };
    if (item && item.id) return { id: item.id, at: item.at || 0 };
    return null;
  }).filter(Boolean);
}

function getFavoriteEntries() {
  return normalizeFavoriteEntries(wx.getStorageSync('favorites'));
}

/** 收藏 / 取消收藏；新收藏写入时间戳，供收藏页按时间排序 */
function toggleFavorite(poemId) {
  const list = getFavoriteEntries();
  let idx = -1;
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === poemId) {
      idx = i;
      break;
    }
  }
  if (idx > -1) list.splice(idx, 1);
  else list.push({ id: poemId, at: Date.now() });
  wx.setStorageSync('favorites', list);
  return idx === -1;
}

function getFavorites() {
  return getFavoriteEntries().map(function (item) {
    return item.id;
  });
}

function isFavorite(poemId) {
  return getFavorites().indexOf(poemId) > -1;
}

/** 浏览历史：最近查看的诗词 id，去重后最新在前 */
const BROWSE_HISTORY_KEY = 'browseHistory';
const BROWSE_HISTORY_MAX = 50;

function addBrowseHistory(poemId) {
  if (!poemId) return [];
  let list = wx.getStorageSync(BROWSE_HISTORY_KEY) || [];
  list = list.filter(function (id) { return id !== poemId; });
  list.unshift(poemId);
  if (list.length > BROWSE_HISTORY_MAX) list = list.slice(0, BROWSE_HISTORY_MAX);
  wx.setStorageSync(BROWSE_HISTORY_KEY, list);
  return list;
}

function getBrowseHistory() {
  return wx.getStorageSync(BROWSE_HISTORY_KEY) || [];
}

/** 学习进度：已学 / 已背诵 / 连续天数，落本地，待接入云数据库 */
const PROGRESS_KEY = 'progress';

function getProgress() {
  return wx.getStorageSync(PROGRESS_KEY) || {
    learned: 0,
    recited: 0,
    streak: 0,
    lastDate: ''
  };
}

function saveProgress(patch) {
  const cur = getProgress();
  const next = Object.assign({}, cur, patch);
  wx.setStorageSync(PROGRESS_KEY, next);
  return next;
}

module.exports = {
  getPoems: getPoems,
  getPoem: getPoem,
  toggleFavorite: toggleFavorite,
  getFavorites: getFavorites,
  getFavoriteEntries: getFavoriteEntries,
  isFavorite: isFavorite,
  addBrowseHistory: addBrowseHistory,
  getBrowseHistory: getBrowseHistory,
  getProgress: getProgress,
  saveProgress: saveProgress
};
