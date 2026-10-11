const { getPoemById, POEMS } = require('../../data/poems.js');

const MODES = [
  { id: 'write', name: '全文默写' },
  { id: 'blank', name: '填空默写' },
  { id: 'hint', name: '关键词提示' },
  { id: 'chain', name: '首句接龙' },
  { id: 'order', name: '诗句排序' }
];

const GUIDE = {
  write: '请根据记忆，默写下这首诗的全文。',
  blank: '请根据上下文，填写诗句中缺失的文字。',
  hint: '参考关键词，回忆并默写出这首诗。',
  chain: '根据上一句，写出紧接的下一句。',
  order: '将打乱的诗句重新排列为正确顺序。'
};

const CTA = {
  write: '开始默写',
  blank: '提交填空',
  hint: '开始默写',
  chain: '确认本句',
  order: '提交排序'
};

const THEME_MAP = {
  静夜思: '思乡',
  春晓: '惜春',
  望岳: '登高',
  将进酒: '豪放',
  登鹳雀楼: '登高'
};

/** 从诗句中抽取关键词（取每句末字 / 关键名词） */
function pickKeywords(lines) {
  const pool = [];
  (lines || []).forEach(function (line) {
    if (!line) return;
    const chars = line.replace(/[，。！？、；：\s]/g, '');
    if (chars.length >= 2) pool.push(chars.slice(-2));
    else if (chars.length) pool.push(chars);
  });
  return pool.slice(0, 4);
}

/** 生成填空：每隔若干字挖空 */
function buildBlankLines(lines) {
  return (lines || []).map(function (line) {
    const chars = line.split('');
    const parts = [];
    let buf = '';
    chars.forEach(function (ch, i) {
      const isBlank = i % 3 === 1 && /[\u4e00-\u9fff]/.test(ch);
      if (isBlank) {
        if (buf) {
          parts.push({ type: 'text', value: buf });
          buf = '';
        }
        parts.push({ type: 'blank', value: '', answer: ch, len: 1 });
      } else {
        buf += ch;
      }
    });
    if (buf) parts.push({ type: 'text', value: buf });
    return { parts: parts };
  });
}

/** Fisher–Yates 打乱 */
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

Page({
  data: {
    modes: MODES,
    activeMode: 'write',
    fadeClass: '',
    poem: {},
    themeTag: '思乡',
    guideText: GUIDE.write,
    ctaLabel: CTA.write,
    writeText: '',
    blankLines: [],
    keywords: [],
    chainIndex: 0,
    chainAnswer: '',
    orderPool: [],
    orderPicked: [],
    practiceCount: 0,
    recentList: []
  },

  onLoad(options) {
    const id = (options && options.id) || 'p001';
    let mode = (options && options.type) || 'write';
    if (mode === 'recite') mode = 'write';
    const valid = MODES.some(function (m) { return m.id === mode; });
    if (!valid) mode = 'write';

    const poem = getPoemById(id) || getPoemById('p001') || POEMS[0];
    this._poem = poem;
    this._lines = poem.lines || [];

    const recentList = this.buildRecent(poem.id);

    this.setData({
      poem: poem,
      themeTag: THEME_MAP[poem.title] || '经典',
      activeMode: mode,
      guideText: GUIDE[mode],
      ctaLabel: CTA[mode],
      recentList: recentList,
      practiceCount: 0
    });

    this.setupMode(mode);
  },

  buildRecent(currentId) {
    // 设计稿示例优先展示《春晓》
    const prefer = getPoemById('p002');
    const list = [];
    if (prefer && prefer.id !== currentId) {
      list.push({
        id: prefer.id,
        title: prefer.title,
        author: prefer.author,
        dynasty: prefer.dynasty,
        accuracy: 100
      });
    }
    POEMS.forEach(function (p) {
      if (list.length >= 2) return;
      if (p.id === currentId) return;
      if (list.some(function (x) { return x.id === p.id; })) return;
      list.push({
        id: p.id,
        title: p.title,
        author: p.author,
        dynasty: p.dynasty,
        accuracy: list.length === 0 ? 100 : 92
      });
    });
    return list;
  },

  setupMode(mode) {
    const lines = this._lines || [];
    const patch = {
      writeText: '',
      chainIndex: 0,
      chainAnswer: '',
      blankLines: [],
      keywords: [],
      orderPool: [],
      orderPicked: []
    };

    if (mode === 'blank') {
      patch.blankLines = buildBlankLines(lines);
    } else if (mode === 'hint') {
      patch.keywords = pickKeywords(lines);
    } else if (mode === 'order') {
      const pool = shuffle(lines.map(function (text, i) {
        return { uid: 'o' + i + '-' + text, text: text, picked: false, origin: i };
      }));
      patch.orderPool = pool;
      patch.orderPicked = [];
    }

    this.setData(patch);
  },

  onSwitchMode(e) {
    const id = e.currentTarget.dataset.id;
    if (!id || id === this.data.activeMode) return;

    this.setData({ fadeClass: 'is-fading' });
    setTimeout(() => {
      this.setData({
        activeMode: id,
        guideText: GUIDE[id],
        ctaLabel: CTA[id],
        fadeClass: ''
      });
      this.setupMode(id);
    }, 160);
  },

  onWriteInput(e) {
    this.setData({ writeText: e.detail.value || '' });
  },

  onBlankInput(e) {
    const line = e.currentTarget.dataset.line;
    const part = e.currentTarget.dataset.part;
    const val = (e.detail.value || '').slice(0, 1);
    const key = 'blankLines[' + line + '].parts[' + part + '].value';
    this.setData({ [key]: val });
  },

  onChainInput(e) {
    this.setData({ chainAnswer: e.detail.value || '' });
  },

  onPickLine(e) {
    const uid = e.currentTarget.dataset.uid;
    const pool = this.data.orderPool;
    const item = pool.filter(function (p) { return p.uid === uid; })[0];
    if (!item || item.picked) return;

    const orderPool = pool.map(function (p) {
      return p.uid === uid ? Object.assign({}, p, { picked: true }) : p;
    });
    const orderPicked = this.data.orderPicked.concat([Object.assign({}, item)]);
    this.setData({ orderPool: orderPool, orderPicked: orderPicked });
  },

  onUnpickLine(e) {
    const uid = e.currentTarget.dataset.uid;
    const orderPicked = this.data.orderPicked.filter(function (p) { return p.uid !== uid; });
    const orderPool = this.data.orderPool.map(function (p) {
      return p.uid === uid ? Object.assign({}, p, { picked: false }) : p;
    });
    this.setData({ orderPool: orderPool, orderPicked: orderPicked });
  },

  onShowHint() {
    const mode = this.data.activeMode;
    const lines = this._lines || [];
    let tip = '';
    if (mode === 'write' || mode === 'hint') {
      tip = '共 ' + lines.length + ' 句，首字为「' + (lines[0] || '').charAt(0) + '」';
    } else if (mode === 'blank') {
      tip = '空格处各填一字，注意上下文连贯';
    } else if (mode === 'chain') {
      const i = this.data.chainIndex;
      tip = i < lines.length ? '本句共 ' + lines[i].length + ' 字' : '已完成全部接龙';
    } else if (mode === 'order') {
      tip = '第一句以「' + (lines[0] || '').charAt(0) + '」开头';
    }
    wx.showToast({ title: tip || '暂无提示', icon: 'none', duration: 2200 });
  },

  onStartTrain() {
    const mode = this.data.activeMode;
    let ok = false;
    let msg = '';

    if (mode === 'write' || mode === 'hint') {
      const result = this.judgeFullText(this.data.writeText);
      ok = result.ok;
      msg = result.msg;
    } else if (mode === 'blank') {
      const result = this.judgeBlank();
      ok = result.ok;
      msg = result.msg;
    } else if (mode === 'chain') {
      const result = this.judgeChain();
      if (result.advance) {
        this.setData({
          chainIndex: result.nextIndex,
          chainAnswer: '',
          practiceCount: this.data.practiceCount + (result.done ? 1 : 0)
        });
        wx.showToast({
          title: result.done ? '接龙完成！' : '正确，继续下一句',
          icon: result.done ? 'success' : 'none'
        });
        return;
      }
      ok = false;
      msg = result.msg;
    } else if (mode === 'order') {
      const result = this.judgeOrder();
      ok = result.ok;
      msg = result.msg;
    }

    if (ok) {
      this.setData({ practiceCount: this.data.practiceCount + 1 });
      wx.showToast({ title: msg || '完成！', icon: 'success' });
    } else {
      wx.showToast({ title: msg || '再试一次', icon: 'none' });
    }
  },

  normalize(text) {
    return (text || '')
      .replace(/[《》「」『』\s\n\r，。！？、；：,.!?;:'"\-—…·]/g, '')
      .trim();
  },

  judgeFullText(input) {
    const expect = this.normalize((this._lines || []).join(''));
    const got = this.normalize(input);
    if (!got) return { ok: false, msg: '请先输入内容' };
    if (got === expect) return { ok: true, msg: '默写正确' };
    const ratio = this.similarity(got, expect);
    if (ratio >= 0.85) return { ok: true, msg: '基本正确（' + Math.round(ratio * 100) + '%）' };
    return { ok: false, msg: '还有出入，正确率约 ' + Math.round(ratio * 100) + '%' };
  },

  similarity(a, b) {
    if (!a || !b) return 0;
    let hit = 0;
    const len = Math.max(a.length, b.length);
    const min = Math.min(a.length, b.length);
    for (let i = 0; i < min; i++) {
      if (a[i] === b[i]) hit++;
    }
    return hit / len;
  },

  judgeBlank() {
    const lines = this.data.blankLines || [];
    let total = 0;
    let correct = 0;
    lines.forEach(function (line) {
      (line.parts || []).forEach(function (p) {
        if (p.type !== 'blank') return;
        total++;
        if ((p.value || '') === p.answer) correct++;
      });
    });
    if (!total) return { ok: false, msg: '暂无填空题' };
    if (correct === total) return { ok: true, msg: '全部正确' };
    return { ok: false, msg: '答对 ' + correct + '/' + total + '，再检查一下' };
  },

  judgeChain() {
    const lines = this._lines || [];
    const i = this.data.chainIndex;
    if (i >= lines.length) return { advance: true, done: true, nextIndex: i, msg: '已完成' };
    const expect = this.normalize(lines[i]);
    const got = this.normalize(this.data.chainAnswer);
    if (!got) return { advance: false, msg: '请输入下一句' };
    if (got !== expect) return { advance: false, msg: '不对哦，再想想' };
    const next = i + 1;
    return { advance: true, done: next >= lines.length, nextIndex: next };
  },

  judgeOrder() {
    const lines = this._lines || [];
    const picked = this.data.orderPicked || [];
    if (picked.length < lines.length) {
      return { ok: false, msg: '请排完所有诗句（' + picked.length + '/' + lines.length + '）' };
    }
    const ok = picked.every(function (p, i) { return p.text === lines[i]; });
    return ok
      ? { ok: true, msg: '顺序正确' }
      : { ok: false, msg: '顺序有误，点击已选项可撤回' };
  },

  onViewMore() {
    wx.navigateTo({ url: '/pages/progress/progress' });
  },

  onOpenRecent(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    const poem = getPoemById(id);
    if (!poem) return;
    this._poem = poem;
    this._lines = poem.lines || [];
    this.setData({
      poem: poem,
      themeTag: THEME_MAP[poem.title] || '经典',
      writeText: '',
      chainIndex: 0,
      chainAnswer: '',
      recentList: this.buildRecent(poem.id)
    });
    this.setupMode(this.data.activeMode);
    wx.pageScrollTo({ scrollTop: 0, duration: 240 });
  }
});
