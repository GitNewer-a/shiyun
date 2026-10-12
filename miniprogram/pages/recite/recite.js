const { getPoemById, POEMS } = require('../../data/poems.js');

const MODES = [
  { id: 'write', name: '全文默写' },
  { id: 'blank', name: '填空默写' }
];

const GUIDE = {
  write: '请根据记忆，默写下这首诗的全文。',
  blank: '请根据上下文，填写诗句中缺失的文字。'
};

const CTA = {
  write: '开始默写',
  blank: '提交填空'
};

const THEME_MAP = {
  静夜思: '思乡',
  春晓: '惜春',
  望岳: '登高',
  将进酒: '豪放',
  登鹳雀楼: '登高'
};

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
      blankLines: []
    };

    if (mode === 'blank') {
      this._blankDraft = {};
      patch.blankLines = buildBlankLines(lines);
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

  /** 填空输入：组拼音期间不 setData、不截断，避免打断手机输入法 */
  onBlankInput(e) {
    const line = e.currentTarget.dataset.line;
    const part = e.currentTarget.dataset.part;
    if (!this._blankDraft) this._blankDraft = {};
    this._blankDraft[line + '_' + part] = e.detail.value || '';
  },

  onBlankBlur(e) {
    const line = e.currentTarget.dataset.line;
    const part = e.currentTarget.dataset.part;
    this.commitBlankSlot(line, part, e.detail.value);
  },

  /** 将输入归一为答案字数内的汉字；纯拼音未上屏则保留草稿不强制清空显示 */
  commitBlankSlot(line, partIdx, raw) {
    const lines = this.data.blankLines || [];
    const part = lines[line] && lines[line].parts && lines[line].parts[partIdx];
    if (!part || part.type !== 'blank') return;

    const draftKey = line + '_' + partIdx;
    const draft = this._blankDraft || {};
    let val = raw != null ? String(raw) : (draft[draftKey] || part.value || '');
    val = val.trim();

    const hans = val.match(/[\u4e00-\u9fff]/g);
    const len = part.len || 1;
    let next = '';
    if (hans && hans.length) {
      next = hans.join('').slice(0, len);
    } else if (!val) {
      next = '';
    } else {
      // 仍在输入拼音或未选字：暂不回写受控 value，避免打断；提交时再判空
      draft[draftKey] = val;
      this._blankDraft = draft;
      return;
    }

    if (draft[draftKey] !== undefined) delete draft[draftKey];
    this._blankDraft = draft;
    if (part.value === next) return;
    const key = 'blankLines[' + line + '].parts[' + partIdx + '].value';
    this.setData({ [key]: next });
  },

  /** 提交前把各空草稿收成汉字 */
  flushBlankDrafts() {
    const lines = this.data.blankLines || [];
    const draft = this._blankDraft || {};
    const patch = {};
    let i;
    let j;
    for (i = 0; i < lines.length; i++) {
      const parts = lines[i].parts || [];
      for (j = 0; j < parts.length; j++) {
        const p = parts[j];
        if (p.type !== 'blank') continue;
        const dk = i + '_' + j;
        const raw = draft[dk] != null ? draft[dk] : p.value;
        const hans = String(raw || '').match(/[\u4e00-\u9fff]/g);
        const next = hans ? hans.join('').slice(0, p.len || 1) : '';
        if (p.value !== next) {
          patch['blankLines[' + i + '].parts[' + j + '].value'] = next;
        }
        if (draft[dk] !== undefined) delete draft[dk];
      }
    }
    this._blankDraft = draft;
    if (Object.keys(patch).length) this.setData(patch);
  },

  onShowHint() {
    const mode = this.data.activeMode;
    const lines = this._lines || [];
    let tip = '';
    if (mode === 'write') {
      tip = '共 ' + lines.length + ' 句，首字为「' + (lines[0] || '').charAt(0) + '」';
    } else if (mode === 'blank') {
      tip = '空格处各填一字，注意上下文连贯';
    }
    wx.showToast({ title: tip || '暂无提示', icon: 'none', duration: 2200 });
  },

  onStartTrain() {
    const mode = this.data.activeMode;
    let ok = false;
    let msg = '';

    if (mode === 'write') {
      const result = this.judgeFullText(this.data.writeText);
      ok = result.ok;
      msg = result.msg;
    } else if (mode === 'blank') {
      this.flushBlankDrafts();
      const result = this.judgeBlank();
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
      recentList: this.buildRecent(poem.id)
    });
    this.setupMode(this.data.activeMode);
    wx.pageScrollTo({ scrollTop: 0, duration: 240 });
  }
});
