const { getPoemById, POEMS } = require('../../data/poems.js');
const judge = require('../../utils/judge.js');
const mem = require('../../utils/memory.js');

const MODES = [
  { id: 'write', name: '全文默写' },
  { id: 'blank', name: '填空默写' }
];

const GUIDE = {
  write: '凭记忆写下整首，不必打标点。判定后逐字对照，错字标朱砂。',
  blank: '每空填一个字，填完点「提交」。判定后就地标色。'
};

const CTA = {
  write: '提交默写',
  blank: '提交填空'
};

const THEME_MAP = {
  静夜思: '思乡',
  春晓: '惜春',
  望岳: '登高',
  将进酒: '豪放',
  登鹳雀楼: '登高'
};

/** 字数口径与 judge.flatten 一致：只数汉字，标点不计 */
function countHans(s) {
  const m = String(s || '').match(/[\u4e00-\u9fff]/g);
  return m ? m.length : 0;
}

/** 判定语。80% 是「过关线」，与 utils/memory.js 的 countPassed 保持一致 */
function verdictOf(percent) {
  if (percent >= 95) return { verdict: '默写无误', tip: '一字不差，可以换一首了' };
  if (percent >= 80) return { verdict: '基本过关', tip: '错字不多，订正后再默一遍' };
  if (percent >= 60) return { verdict: '记了一半', tip: '对半错，建议先填空再全文' };
  return { verdict: '还很生疏', tip: '先读几遍原文，再来默写' };
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
        parts.push({ type: 'blank', value: '', answer: ch });
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
    themeTag: '唐诗',
    guideText: GUIDE.write,
    ctaLabel: CTA.write,

    // 全文默写
    writeText: '',
    writeChars: 0,
    writeLimit: 200,

    // 填空
    blankLines: [],
    blankTotal: 0,
    blankFilled: 0,
    blankPercent: 0,

    // 判定结果
    result: null,
    resultMode: '',
    showResult: false,
    scoreStyle: '',
    verdict: '',
    verdictTip: '',
    wrongCount: 0,
    missingCount: 0
  },

  onShow() {
    // 默写时不该有朗读声
    try {
      const { getAudioPlayer } = require('../../utils/audio.js');
      getAudioPlayer().pause();
    } catch (e) {}
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

    // 输入长度上限：按正文字数放宽，留给错字与重复书写
    const hans = this._lines.reduce(function (s, l) { return s + countHans(l); }, 0);
    const limit = Math.max(60, Math.round(hans * 1.6));

    wx.setNavigationBarTitle({ title: mode === 'blank' ? '填空默写' : '全文默写' });

    this.setData({
      poem: poem,
      themeTag: THEME_MAP[poem.title] || '唐诗',
      activeMode: mode,
      guideText: GUIDE[mode],
      ctaLabel: CTA[mode],
      writeLimit: limit
    });

    this.setupMode(mode);
  },

  onUnload() {
    this.saveDraftNow();
  },

  onHide() {
    this.saveDraftNow();
  },

  saveDraftNow() {
    const poem = this.data.poem;
    if (!poem || !poem.id) return;
    const mode = this.data.activeMode;
    if (mode === 'write') {
      const text = this.data.writeText;
      if (!text) return;
      mem.saveDraft(poem.id, 'write', { writeText: text });
    } else {
      const lines = this.data.blankLines || [];
      const values = [];
      lines.forEach(function (l) {
        (l.parts || []).forEach(function (p) {
          if (p.type === 'blank') values.push(p.value || '');
        });
      });
      if (!values.some(function (v) { return v; })) return;
      mem.saveDraft(poem.id, 'blank', { blankValues: values });
    }
  },

  setupMode(mode) {
    const lines = this._lines || [];
    const poemId = this.data.poem.id || (this._poem && this._poem.id);
    const draft = poemId ? mem.getDraft(poemId, mode) : null;
    const patch = {
      writeText: '',
      writeChars: 0,
      blankLines: [],
      blankTotal: 0,
      blankFilled: 0,
      blankPercent: 0,
      result: null,
      showResult: false
    };

    if (mode === 'write') {
      if (draft && draft.writeText) {
        patch.writeText = draft.writeText;
        patch.writeChars = countHans(draft.writeText);
      }
    } else {
      const built = buildBlankLines(lines);
      // 回填草稿
      if (draft && Array.isArray(draft.blankValues) && draft.blankValues.length) {
        let idx = 0;
        built.forEach(function (l) {
          (l.parts || []).forEach(function (p) {
            if (p.type !== 'blank') return;
            if (draft.blankValues[idx]) p.value = draft.blankValues[idx];
            idx++;
          });
        });
      }
      patch.blankLines = built;
      let total = 0;
      let filled = 0;
      built.forEach(function (l) {
        (l.parts || []).forEach(function (p) {
          if (p.type !== 'blank') return;
          total++;
          if (p.value) filled++;
        });
      });
      patch.blankTotal = total;
      patch.blankFilled = filled;
      patch.blankPercent = total ? Math.round((filled / total) * 100) : 0;
    }

    this._blankDraft = {};
    this.setData(patch);
  },

  onSwitchMode(e) {
    const id = e.currentTarget.dataset.id;
    if (!id || id === this.data.activeMode) return;

    this.saveDraftNow();
    this.setData({ fadeClass: 'is-fading' });
    setTimeout(() => {
      this.setData({
        activeMode: id,
        guideText: GUIDE[id],
        ctaLabel: CTA[id],
        fadeClass: ''
      });
      this.setupMode(id);
      wx.setNavigationBarTitle({ title: id === 'blank' ? '填空默写' : '全文默写' });
    }, 140);
  },

  onWriteInput(e) {
    const v = e.detail.value || '';
    this.setData({ writeText: v, writeChars: countHans(v), showResult: false });
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
    const val = (raw != null ? String(raw) : (draft[draftKey] || part.value || '')).trim();

    const hans = val.match(/[\u4e00-\u9fff]/g);
    let next = '';
    if (hans && hans.length) {
      next = hans.join('').slice(0, 1);
    } else if (!val) {
      next = '';
    } else {
      // 仍在输入拼音：暂不回写受控 value，避免打断
      draft[draftKey] = val;
      this._blankDraft = draft;
      return;
    }

    if (draft[draftKey] !== undefined) delete draft[draftKey];
    this._blankDraft = draft;
    if (part.value === next) return;
    const key = 'blankLines[' + line + '].parts[' + partIdx + '].value';
    const patch = { [key]: next, showResult: false };
    this.setData(patch);
    this.refreshBlankCount();
  },

  refreshBlankCount() {
    let filled = 0;
    const lines = this.data.blankLines || [];
    lines.forEach(function (l) {
      (l.parts || []).forEach(function (p) {
        if (p.type === 'blank' && p.value) filled++;
      });
    });
    const total = this.data.blankTotal || 0;
    const patch = { blankFilled: filled, blankPercent: total ? Math.round((filled / total) * 100) : 0 };
    this.setData(patch);
  },

  /** 提交前把各空草稿收成汉字 */
  flushBlankDrafts() {
    const lines = this.data.blankLines || [];
    const draft = this._blankDraft || {};
    const patch = {};
    for (let i = 0; i < lines.length; i++) {
      const parts = lines[i].parts || [];
      for (let j = 0; j < parts.length; j++) {
        const p = parts[j];
        if (p.type !== 'blank') continue;
        const dk = i + '_' + j;
        const raw = draft[dk] != null ? draft[dk] : p.value;
        const hans = String(raw || '').match(/[\u4e00-\u9fff]/g);
        const next = hans ? hans.join('').slice(0, 1) : '';
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
      tip = '共 ' + lines.length + ' 句，首句「' + (lines[0] || '').slice(0, 2) + '…」';
    } else {
      tip = '空格处各填一字，注意上下文连贯';
    }
    wx.showToast({ title: tip || '暂无提示', icon: 'none', duration: 2200 });
  },

  /** 统一的提交入口 */
  onSubmit() {
    const mode = this.data.activeMode;
    if (mode === 'write') this.submitWrite();
    else this.submitBlank();
  },

  submitWrite() {
    const poem = this.data.poem;
    const res = judge.compare(this._lines, this.data.writeText);

    if (res.empty) {
      wx.showToast({ title: '请先写下内容', icon: 'none' });
      return;
    }

    // 空串按「漏写」算在 fixes 里，这里补上稳定 key 供 wx:key 用
    let wrong = 0;
    let missing = 0;
    res.fixes.forEach(function (f, i) {
      f.key = f.line + '_' + f.pos + '_' + i;
      if (f.kind === 'missing') missing++;
      else wrong++;
    });

    const v = verdictOf(res.score);
    this.setData({
      result: res,
      resultMode: 'write',
      showResult: true,
      scoreStyle: this.buildRing(res.score),
      verdict: v.verdict,
      verdictTip: v.tip,
      wrongCount: wrong,
      missingCount: missing
    });

    // 多写的字不扣分，但要让用户知道，否则会以为「多写没事」
    if (res.multi) {
      wx.showToast({ title: '比原文多写了 ' + res.multi + ' 个字', icon: 'none', duration: 2000 });
    }

    mem.addRecord({
      poemId: poem.id,
      title: poem.title,
      author: poem.author,
      dynasty: poem.dynasty,
      type: 'write',
      score: res.score,
      correct: res.correct,
      total: res.total
    });
    if (res.score >= 80) mem.clearDraft(poem.id, 'write');
    wx.pageScrollTo({ scrollTop: 0, duration: 260 });
  },

  submitBlank() {
    const poem = this.data.poem;
    this.flushBlankDrafts();
    const res = judge.compareBlanks(this.data.blankLines);

    if (!res.total) {
      wx.showToast({ title: '暂无填空题', icon: 'none' });
      return;
    }
    if (!res.correct) {
      // 一个都没对：多半是还没填，别急着判
      const anyFilled = (this.data.blankLines || []).some(function (l) {
        return (l.parts || []).some(function (p) { return p.type === 'blank' && p.value; });
      });
      if (!anyFilled) {
        wx.showToast({ title: '先填几个空再提交', icon: 'none' });
        return;
      }
    }

    // 填空的订正清单：逐条列出错空与空着的空
    let wrong = 0;
    let missing = 0;
    res.rows.forEach(function (row) {
      (row.parts || []).forEach(function (p) {
        if (p.type !== 'blank') return;
        if (p.state === 'bad') wrong++;
        else if (p.state === 'gap') missing++;
      });
    });

    const v = verdictOf(res.score);
    this.setData({
      result: res,
      resultMode: 'blank',
      showResult: true,
      scoreStyle: this.buildRing(res.score),
      verdict: v.verdict,
      verdictTip: v.tip,
      wrongCount: wrong,
      missingCount: missing
    });

    mem.addRecord({
      poemId: poem.id,
      title: poem.title,
      author: poem.author,
      dynasty: poem.dynasty,
      type: 'blank',
      score: res.score,
      correct: res.correct,
      total: res.total
    });
    if (res.score >= 80) mem.clearDraft(poem.id, 'blank');
    wx.pageScrollTo({ scrollTop: 0, duration: 260 });
  },

  buildRing(percent) {
    const p = Math.max(0, Math.min(100, percent));
    const deg = (p * 3.6).toFixed(1);
    const color = p >= 80 ? '#4F7A5D' : (p >= 60 ? '#C9975A' : '#C94A4A');
    return 'background: conic-gradient(' + color + ' 0deg ' + deg + 'deg, #ece6d9 ' + deg + 'deg 360deg)';
  },

  onRetry() {
    // 回到作答态但保留这次写的内容，方便对照着改
    this.setData({ showResult: false, result: null });
    wx.pageScrollTo({ scrollTop: 0, duration: 220 });
  },

  onViewOriginal() {
    const id = this.data.poem.id;
    wx.navigateTo({ url: '/pages/poem/poem?id=' + id });
  },

  onBack() {
    wx.navigateBack({ delta: 1 });
  }
});
