/**
 * 记忆训练记录层
 * ------------------------------------------------------------------
 * 目前项目未接云数据库的默写记录，这里用本地缓存落盘，接口形态按云集合设计，
 * 将来接云时只需替换内部实现（保持 getRecent / getStats / countPassed 签名不变）。
 *
 * 存储结构：
 *   memoryRecords: [{ poemId, title, author, dynasty, type, score, correct,
 *                     total, at }]   最多保留 50 条，最新在前
 *   memoryDrafts:  { '<poemId>_<type>': { poemId, type, writeText,
 *                                         blankDraft, percent, at } }
 */

const KEY_RECORDS = 'memoryRecords';
const KEY_DRAFTS = 'memoryDrafts';
const MAX_RECORDS = 50;

function readRecords() {
  try {
    const v = wx.getStorageSync(KEY_RECORDS);
    return Array.isArray(v) ? v : [];
  } catch (e) {
    return [];
  }
}

function writeRecords(list) {
  try {
    wx.setStorageSync(KEY_RECORDS, list.slice(0, MAX_RECORDS));
  } catch (e) {}
}

function readDrafts() {
  try {
    const v = wx.getStorageSync(KEY_DRAFTS);
    return v && typeof v === 'object' ? v : {};
  } catch (e) {
    return {};
  }
}

function writeDrafts(map) {
  try {
    wx.setStorageSync(KEY_DRAFTS, map);
  } catch (e) {}
}

/**
 * 记录一次练习结果。
 * @param {Object} r { poemId, title, author, dynasty, type, score, correct, total }
 */
function addRecord(r) {
  if (!r || !r.poemId) return;
  const list = readRecords().filter(function (x) {
    // 同一首诗同一题型只保留最新一条，避免列表被刷屏
    return !(x.poemId === r.poemId && x.type === r.type);
  });
  list.unshift({
    poemId: r.poemId,
    title: r.title || '',
    author: r.author || '',
    dynasty: r.dynasty || '',
    type: r.type || 'write',
    score: typeof r.score === 'number' ? r.score : 0,
    correct: r.correct || 0,
    total: r.total || 0,
    at: Date.now()
  });
  writeRecords(list);
}

/** 最近练习记录，最新在前 */
function getRecent(n) {
  const list = readRecords();
  return typeof n === 'number' ? list.slice(0, n) : list;
}

/**
 * 统计：每题型的通过数（正确率 >= 80% 记一次通过）+ 总掌握数。
 * 掌握口径：两种题型任一达到 80% 即视为这首诗「会默」。
 */
function countPassed(type) {
  const seen = {};
  readRecords().forEach(function (r) {
    if (type && r.type !== type) return;
    if (r.score < 80) return;
    seen[r.poemId] = true;
  });
  return Object.keys(seen).length;
}

function getStats(total) {
  const seen = {};
  readRecords().forEach(function (r) {
    if (r.score >= 80) seen[r.poemId] = true;
  });
  const mastered = Object.keys(seen).length;
  return {
    mastered: mastered,
    total: total || 0,
    percent: total ? Math.round((mastered / total) * 100) : 0
  };
}

/** 草稿：存未写完的默写内容，退出后可续 */
function saveDraft(poemId, type, payload) {
  if (!poemId) return;
  const map = readDrafts();
  map[poemId + '_' + type] = Object.assign({ poemId: poemId, type: type, at: Date.now() }, payload || {});
  writeDrafts(map);
}

/**
 * 某题型下每首诗的最新成绩。
 * 返回 { <poemId>: { score, at, correct, total } }。
 * 记录层本身按 (poemId,type) 去重只留最新一条，所以直接铺开即可。
 */
function getScoreMap(type) {
  const map = {};
  readRecords().forEach(function (r) {
    if (type && r.type !== type) return;
    map[r.poemId] = { score: r.score, at: r.at || 0, correct: r.correct || 0, total: r.total || 0 };
  });
  return map;
}

function getDraft(poemId, type) {
  const map = readDrafts();
  return map[poemId + '_' + type] || null;
}

function getDrafts() {
  return readDrafts();
}

function clearDraft(poemId, type) {
  const map = readDrafts();
  delete map[poemId + '_' + type];
  writeDrafts(map);
}

module.exports = {
  addRecord: addRecord,
  getRecent: getRecent,
  countPassed: countPassed,
  getStats: getStats,
  getScoreMap: getScoreMap,
  saveDraft: saveDraft,
  getDraft: getDraft,
  getDrafts: getDrafts,
  clearDraft: clearDraft
};
