/**
 * 成长数据快照：学习页 / 我的页共用同一套计算，避免各算各的。
 */
const db = require('./db.js');
const { POEMS } = require('../data/poems.js');

const LEVELS = [
  { level: 1, name: '诗词初学者', minMastered: 0 },
  { level: 2, name: '诗词小书生', minMastered: 10 },
  { level: 3, name: '诗词学徒', minMastered: 25 },
  { level: 4, name: '诗词行者', minMastered: 40 },
  { level: 5, name: '诗词达人', minMastered: 60 }
];

const BADGE_DEFS = [
  { name: '初读', char: '初', cls: 'badge-green', check: function (p) { return p.learned >= 1; } },
  { name: '晨诵', char: '晨', cls: 'badge-blue', check: function (p) { return p.streak >= 3; } },
  { name: '拾珠', char: '拾', cls: 'badge-gold', check: function (p) { return p.learned >= 10; } },
  { name: '夜思', char: '思', cls: 'badge-purple', check: function (p) { return p.mastered >= 5; } },
  { name: '登高', char: '登', cls: 'badge-teal', check: function (p) { return p.streak >= 7; } },
  { name: '博览', char: '博', cls: 'badge-gray', check: function (p) { return p.learned >= 30; } }
];

function resolveLevel(mastered) {
  let cur = LEVELS[0];
  let next = LEVELS[1] || null;
  for (let i = 0; i < LEVELS.length; i++) {
    if (mastered >= LEVELS[i].minMastered) {
      cur = LEVELS[i];
      next = LEVELS[i + 1] || null;
    }
  }
  return { cur: cur, next: next };
}

/** @returns {object} 两端页面可直接拆字段使用的成长快照 */
function getGrowthSnapshot() {
  const p = db.getProgress() || {};
  const learned = p.learned || 0;
  const mastered = p.recited || 0;
  const streak = p.streak || 0;
  const total = POEMS.length || 1;
  const progress = Math.min(100, Math.round((learned / total) * 100));
  const masteredPercent = Math.min(100, Math.round((mastered / total) * 100));
  const lv = resolveLevel(mastered);
  const remain = lv.next ? Math.max(0, lv.next.minMastered - mastered) : 0;

  const metrics = { learned: learned, mastered: mastered, streak: streak };
  const badgeList = BADGE_DEFS.map(function (b) {
    const got = !!b.check(metrics);
    return {
      name: b.name,
      char: got ? b.char : '待',
      cls: got ? b.cls : 'badge-gray',
      got: got
    };
  });
  const badges = badgeList.filter(function (b) { return b.got; }).length;

  return {
    learned: learned,
    mastered: mastered,
    streak: streak,
    total: total,
    progress: progress,
    masteredPercent: masteredPercent,
    percent: masteredPercent,
    level: lv.cur.level,
    levelName: lv.cur.name,
    levelTag: lv.cur.name,
    nextLevel: lv.next ? lv.next.name : lv.cur.name,
    remain: remain,
    barWidth: progress + '%',
    badges: badges,
    badgeList: badgeList
  };
}

module.exports = {
  getGrowthSnapshot: getGrowthSnapshot,
  LEVELS: LEVELS
};
