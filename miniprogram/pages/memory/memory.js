const { POEMS, getPoemById } = require('../../data/poems.js');
const db = require('../../utils/db.js');
const mem = require('../../utils/memory.js');

const TYPES = [
  {
    id: 'write',
    name: '全文默写',
    desc: '凭记忆写下整首，最考验熟练度',
    icon: '/assets/memory/ic-write.svg',
    bg: '#f3ece0'
  },
  {
    id: 'blank',
    name: '填空默写',
    desc: '按上下句补空，适合刚开始背',
    icon: '/assets/memory/ic-blank.svg',
    bg: '#e8eef2'
  }
];

/**
 * 选诗面板的筛选维度。
 * 刻意不做「学段/朝代」筛选：40 首里小学 38、初中 2，唐诗 39、宋诗 1，
 * 按这些维度筛等于没筛。真正有决策价值的是「练没练过 / 练得怎么样」。
 */
const FILTERS = [
  { id: 'recommend', name: '推荐' },
  { id: 'new', name: '未练习' },
  { id: 'weak', name: '最薄弱' },
  { id: 'done', name: '已掌握' }
];

/** 一个圆环的 conic-gradient 串，deg 由百分比换算 */
function ringStyle(percent, color) {
  const p = Math.max(0, Math.min(100, percent));
  return 'background: conic-gradient(' + color + ' 0deg ' + (p * 3.6).toFixed(1) + 'deg, #ece6d9 ' + (p * 3.6).toFixed(1) + 'deg 360deg)';
}

/** 成绩的语气色：>=80 竹青（过关），>=60 藤黄，<60 朱砂 */
function scoreTone(score) {
  if (score >= 80) return 'hi';
  if (score >= 60) return 'mid';
  return 'low';
}

/**
 * 量一次屏幕，算出面板底部的让位高度。
 * ------------------------------------------------------------------
 * 面板是 fixed + bottom:0，而原生 tabBar 由客户端绘制、**页面内容盖不住**，
 * 所以面板必须整体抬到 tabBar 上沿以上，否则最后一张诗卡会被 tabBar 压住。
 *
 * 微信没有 API 直读 tabBar 高度，各机型在 48~56px 之间。这里取 50px
 * （微信文档标注的默认值），只再留 12rpx 呼吸缝 —— 之前写死 128rpx
 * 相当于在 tabBar 之上又空出小半屏，这才是「抬得太高」的原因。
 *
 * 代价：若某机型 tabBar 高于 50px，底部会露出几 px 的诗卡；
 * 用 scroll-view 内部滚动 + 底部 padding 兜住，不会真的被压住内容。
 */
const TAB_BAR_PX = 50;

/**
 * 量一次屏幕，算出面板底部的让位高度。
 * ------------------------------------------------------------------
 * 面板是 fixed + bottom:0，而原生 tabBar 由客户端绘制、**页面内容盖不住**，
 * 所以面板必须整体抬到 tabBar 上沿以上，否则最后一张诗卡会被 tabBar 压住。
 *
 * 关键：让位量必须是「px」而不是「rpx」。
 * rpx 随屏宽缩放，而 tabBar 高度是固定的 50px —— 在 iPad / 大屏上，
 * 换算回去的 rpx 会小到盖不住 tabBar。所以这里直接算 px，内联时带 px 单位。
 *
 * 微信没有 API 直读 tabBar 高度，各机型在 48~56px 之间，取 50px（文档默认值），
 * 只再留 12rpx 呼吸缝 —— 原先写死 128rpx 相当于在 tabBar 上又空出小半屏，
 * 这才是「抬得太高」的原因。
 */
function measureSheet(hasTabBar) {
  let winW = 375;
  let winH = 0;
  let insetB = 0;
  try {
    const info = wx.getSystemInfoSync();
    winW = info.windowWidth || info.screenWidth || 375;
    winH = info.windowHeight || 0;
    insetB = (info.safeAreaInsets && info.safeAreaInsets.bottom) || 0;
  } catch (e) {}

  // 面板最大宽度 760rpx，对应 px 上限 380（560px 屏宽时按比例）
  const rpx = winW / 750;
  const gapPx = 12 * rpx;

  const liftPx = (hasTabBar ? TAB_BAR_PX : 0) + insetB + gapPx;

  // 矮屏（横屏、分屏）：可用高度本来就不够，压缩固定块与列表下限
  const tight = (winH || 600) < 520;
  const minList = tight ? 120 : 180;
  const usable = (winH || 600) * (tight ? 0.78 : 0.62);

  const headPx = (tight ? 96 : 150) * rpx;   // 抓手 + 标题 + 副标题
  const chipsPx = tight ? 48 * rpx : 120 * rpx; // 筛选片（+ 建议条，矮屏下折叠）
  const footPx = 24 * rpx;

  const remain = Math.round(usable - headPx - chipsPx - footPx - liftPx);

  return {
    sheetPadPx: Math.round(liftPx),
    sheetListPx: Math.max(minList, Math.min(420, remain)),
    tight: tight
  };
}

Page({
  data: {
    types: [],
    ringStyle: '',
    total: 0,
    mastered: 0,
    percent: 0,
    streak: 0,
    remain: 0,
    levelTag: '初',
    nextLevel: '小成',
    resume: null,
    recent: [],
    empty: true,

    // 选诗面板
    pickerOpen: false,
    pickerType: 'write',
    pickerTypeName: '全文默写',
    filters: FILTERS,
    activeFilter: 'recommend',
    pickerList: [],
    pickerCount: 0,
    pickerDoneCount: 0,
    pickerTip: '',

    // 面板让位：onLoad 量屏后写入。**必须用 px**，rpx 会随屏宽缩放而 tabBar 不缩放
    sheetStyle: 'padding-bottom:100px',
    listStyle: 'height:260px',
    tight: false
  },

  onLoad() {
    this.layoutSheet();
  },

  /** 量屏算面板让位；本页在 tabBar 里，所以必须让出 tabBar 高度 */
  layoutSheet() {
    const m = measureSheet(true);
    this.setData({
      sheetStyle: 'padding-bottom:' + m.sheetPadPx + 'px',
      listStyle: 'height:' + m.sheetListPx + 'px',
      tight: m.tight
    });
  },

  onShow() {
    this.render();
  },

  render() {
    const total = POEMS.length;
    const stats = mem.getStats(total);
    const progress = db.getProgress();

    // 两种题型各自的完成数
    const types = TYPES.map(function (t) {
      const done = mem.countPassed(t.id);
      return Object.assign({}, t, {
        done: done,
        total: total,
        percent: total ? Math.round((done / total) * 100) : 0
      });
    });

    // 继续上次：优先取草稿里没做完的，其次取第一条练习记录
    const resume = this.buildResume(progress);

    const recent = mem.getRecent(3).map(function (r) {
      return Object.assign({}, r, {
        key: r.poemId + '_' + r.type,
        typeName: r.type === 'blank' ? '填空默写' : '全文默写'
      });
    });
    const mastered = stats.mastered || progress.learned || 0;
    const percent = total ? Math.round((mastered / total) * 100) : 0;
    const levels = [
      { tag: '初', need: 0 },
      { tag: '小成', need: 20 },
      { tag: '熟', need: 32 },
      { tag: '通', need: total }
    ];
    let nextLevel = '通';
    let remain = Math.max(total - mastered, 0);
    for (let i = 0; i < levels.length; i++) {
      if (mastered < levels[i].need) {
        nextLevel = levels[i].tag;
        remain = levels[i].need - mastered;
        break;
      }
    }

    this.setData({
      types: types,
      ringStyle: ringStyle(percent, '#C94A4A'),
      total: total,
      mastered: mastered,
      percent: percent,
      streak: progress.streak || 0,
      remain: remain,
      nextLevel: nextLevel,
      resume: resume,
      recent: recent,
      empty: !resume && recent.length === 0
    });
  },

  buildResume(progress) {
    const drafts = mem.getDrafts();
    const keys = Object.keys(drafts || {});
    if (keys.length) {
      // 取最近改动的一条草稿
      let latestKey = keys[0];
      for (let i = 1; i < keys.length; i++) {
        if ((drafts[keys[i]].at || 0) > (drafts[latestKey].at || 0)) latestKey = keys[i];
      }
      const d = drafts[latestKey];
      const poem = getPoemById(d.poemId);
      if (poem) {
        return {
          poemId: poem.id,
          title: poem.title,
          author: poem.author,
          dynasty: poem.dynasty,
          type: d.type || 'write',
          typeName: d.type === 'blank' ? '填空默写' : '全文默写',
          percent: d.percent || 0,
          resumeText: '继续未完成的默写'
        };
      }
    }

    const recent = mem.getRecent(1);
    if (recent.length) {
      const r = recent[0];
      return {
        poemId: r.poemId,
        title: r.title,
        author: r.author,
        dynasty: r.dynasty,
        type: r.type,
        typeName: r.type === 'blank' ? '填空默写' : '全文默写',
        percent: r.score || 0,
        resumeText: '再练一遍'
      };
    }

    // 全新用户：指向第一首
    const first = POEMS[0];
    const learned = (progress && progress.learned) || 0;
    const target = POEMS[Math.min(learned, POEMS.length - 1)] || first;
    return {
      poemId: target.id,
      title: target.title,
      author: target.author,
      dynasty: target.dynasty,
      type: 'blank',
      typeName: '填空默写',
      percent: 0,
      resumeText: '从这里开始'
    };
  },

  /* ---------------- 选诗面板 ---------------- */

  /**
   * 点题型卡 → 打开选诗面板。
   * 这是本页唯一的「进入答题」入口：不让用户在不知道练哪首的情况下被直接扔进答题框。
   */
  openPicker(e) {
    const type = e.currentTarget.dataset.type;
    if (type !== 'write' && type !== 'blank') return;

    const meta = TYPES.filter(function (t) { return t.id === type; })[0] || TYPES[0];
    const map = mem.getScoreMap(type);
    const doneCount = Object.keys(map).filter(function (k) { return map[k].score >= 80; }).length;

    this.setData({
      pickerOpen: true,
      pickerType: type,
      pickerTypeName: meta.name,
      activeFilter: 'recommend',
      pickerDoneCount: doneCount,
      pickerTip: this.buildTip(type, map)
    });
    this.applyFilter('recommend');
  },

  /** 首次进入某题型时给一句「从哪首开始」的建议 */
  buildTip(type, map) {
    const practiced = Object.keys(map).length;
    if (!practiced) {
      return type === 'blank'
        ? '还没练过填空。建议从《静夜思》开始——四句短，只有 6 个空。'
        : '还没练过全文默写。建议从《静夜思》开始，20 个字，两口气写完。';
    }
    // 全部达标才说「都掌握了」；只要还有未掌握的就指向最低那首
    const passing = Object.keys(map).filter(function (id) { return map[id].score >= 80; }).length;
    if (practiced === POEMS.length && passing === practiced) {
      return '这个题型已经全部掌握，可以挑一首巩固。';
    }
    const weak = this.sortedIds(map, 'weak')[0];
    if (weak && map[weak].score < 80) {
      const p = getPoemById(weak);
      if (p) {
        return '上次「' + p.title + '」只拿到 ' + map[weak].score + ' 分，先把它补上。';
      }
    }
    // 练过的都达标，但还有没练的
    return '已练的 ' + practiced + ' 首都过关了，接着试试没练过的。';
  },

  /**
   * 排序口径：未练习永远在前（新东西优先），其次按分数从低到高。
   * 返回 poemId 数组。
   */
  sortedIds(map, filter) {
    const ids = POEMS.map(function (p) { return p.id; });
    const scored = ids.filter(function (id) { return !!map[id]; });
    const newIds = ids.filter(function (id) { return !map[id]; });

    if (filter === 'new') return newIds;
    if (filter === 'done') {
      return scored
        .filter(function (id) { return map[id].score >= 80; })
        .sort(function (a, b) { return map[b].score - map[a].score; });
    }

    // weak / recommend
    const sorted = scored.slice().sort(function (a, b) {
      return map[a].score - map[b].score || map[a].at - map[b].at;
    });
    if (filter === 'weak') return sorted;
    return newIds.concat(sorted);
  },

  applyFilter(filter) {
    const type = this.data.pickerType;
    const map = mem.getScoreMap(type);
    const ids = this.sortedIds(map, filter);
    const lastResume = this.data.resume;

    const list = ids.map(function (id, i) {
      const p = getPoemById(id);
      if (!p) return null;
      const s = map[id];
      const item = {
        id: id,
        key: id + '_' + (s ? 'scored' : 'new'),
        title: p.title,
        author: p.author,
        dynasty: p.dynasty,
        lineCount: (p.lines || []).length,
        first: i === 0,
        isNew: !s,
        score: s ? s.score : 0,
        tone: s ? scoreTone(s.score) : '',
        met: !!s && s.score >= 80,
        isResume: !!(lastResume && lastResume.poemId === id && lastResume.type === type)
      };
      // 「继续上次」的草稿优先并入推荐态，让用户看到未完成的那首
      return item;
    }).filter(Boolean);

    this.setData({ pickerList: list, activeFilter: filter, pickerCount: list.length });
  },

  onFilter(e) {
    const id = e.currentTarget.dataset.id;
    if (!id || id === this.data.activeFilter) return;
    this.applyFilter(id);
  },

  closePicker() {
    this.setData({ pickerOpen: false });
  },

  /** 空态与遮罩都走这里；面板本体用 catchtap 阻断冒泡 */
  noop() {},

  pickPoem(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    const type = this.data.pickerType;
    // 关面板再跳，避免返回时面板仍是展开态
    this.setData({ pickerOpen: false });
    wx.navigateTo({ url: '/pages/recite/recite?id=' + id + '&type=' + type });
  },

  goResume() {
    const r = this.data.resume;
    if (!r) return;
    wx.navigateTo({ url: '/pages/recite/recite?id=' + r.poemId + '&type=' + r.type });
  },

  goRecent(e) {
    const id = e.currentTarget.dataset.id;
    const type = e.currentTarget.dataset.type || 'write';
    if (!id) return;
    wx.navigateTo({ url: '/pages/recite/recite?id=' + id + '&type=' + type });
  },

  goAll() {
    wx.navigateTo({ url: '/pages/progress/progress' });
  }
});
