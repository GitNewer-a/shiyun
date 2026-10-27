/**
 * 全文默写 · 逐字比对
 * ------------------------------------------------------------------
 * 核心问题：用户漏写一个字，如果按「第 i 个字对第 i 个字」比，
 * 后面整段都会错位，一次漏字能报出十几个「写错了」，订正清单全是噪音。
 *
 * 解法：全局序列对齐（Needleman–Wunsch / 带跳步的动态规划）。
 * 把「原文的汉字序列」与「用户的汉字序列」做一次最优对齐：
 *   - 匹配（可跳步）→ 判 ok，但跳过的原文位记漏写
 *   - 原文位无对应输入 → 漏写
 *   - 输入位无对应原文 → 多写（不扣分，单独计数）
 * 因为是一次全局对齐，错位不会向后蔓延：漏一个字就只报那一处。
 *
 * 为什么不用 LCS 后再逐段自比：
 *   分段贪心会被「远处的未来匹配」带偏（首字漏写时第一句可能整段错配）。
 *   一次全局对齐没有分段边界，也就不存在边界误判。
 *
 * 判分口径：分母 = 原文汉字总数；分子 = 对齐后判 ok 的原文位数。
 * 多写的字不扣分，但会通过 multi 提示「多写了 N 个字」。
 */

const PUNCT = /[\s\n\r，。！？、；：,.!?;:'"“”‘’（）()《》「」『』\-—…·|]/;

/** 对齐允许跳步：原文位与输入位之间最多错开 3 格，再多就不是「漏字」而是「整段没写」 */
const BAND = 3;

/** 代价：漏写比换字轻，鼓励把「漏」判成漏写而不是笔误 */
const COST_GAP = 1.0;
const COST_SUB = 1.4;
const COST_MULTI = 1.1;

const OP_OK = 0;
const OP_GAP = 1;   // 原文有、输入无 → 漏写
const OP_SUB = 2;   // 原文与输入都有但不同 → 笔误
const OP_MULTI = 3; // 原文无、输入有 → 多写

function hans(s) {
  const out = [];
  String(s || '').split('').forEach(function (ch) {
    if (!PUNCT.test(ch)) out.push(ch);
  });
  return out;
}

/** 原诗打平：汉字序列 + 每句在序列中的区间 */
function flatten(lines) {
  const chars = [];
  const spans = [];
  (lines || []).forEach(function (line, li) {
    const start = chars.length;
    hans(line).forEach(function (ch, i) {
      chars.push({ ch: ch, line: li, pos: i + 1 });
    });
    spans.push({ line: li, start: start, end: chars.length });
  });
  return { chars: chars, spans: spans };
}

/**
 * 全局对齐。返回逐「原文位」的操作，以及多写的次数。
 * 用两行滚动 + 回溯表太重，这里字数只有 20~100，直接开全表。
 */
function align(expect, got) {
  const n = expect.length;
  const m = got.length;

  // dp[i][j] = expect[0..i) 与 got[0..j) 的最小代价
  const dp = [];
  for (let i = 0; i <= n; i++) dp.push(new Float64Array(m + 1));
  for (let i = 1; i <= n; i++) dp[i][0] = dp[i - 1][0] + COST_GAP;
  for (let j = 1; j <= m; j++) dp[0][j] = dp[0][j - 1] + COST_MULTI;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const same = expect[i - 1] === got[j - 1];
      let best = dp[i - 1][j - 1] + (same ? 0 : COST_SUB);
      const gap = dp[i - 1][j] + COST_GAP;
      if (gap < best) best = gap;
      const mlt = dp[i][j - 1] + COST_MULTI;
      if (mlt < best) best = mlt;
      dp[i][j] = best;
    }
  }

  // 回溯
  const ops = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const same = expect[i - 1] === got[j - 1];
      const diag = dp[i - 1][j - 1] + (same ? 0 : COST_SUB);
      if (Math.abs(dp[i][j] - diag) < 1e-9) {
        ops.push({ type: same ? OP_OK : OP_SUB, i: i - 1, input: got[j - 1] });
        i--;
        j--;
        continue;
      }
    }
    if (i > 0 && Math.abs(dp[i][j] - (dp[i - 1][j] + COST_GAP)) < 1e-9) {
      ops.push({ type: OP_GAP, i: i - 1, input: '' });
      i--;
      continue;
    }
    ops.push({ type: OP_MULTI, i: -1, input: got[j - 1] });
    j--;
  }
  ops.reverse();

  // 按原文位拉平成 states
  const states = expect.map(function () { return { state: 'gap', input: '' }; });
  let multi = 0;
  ops.forEach(function (op) {
    if (op.type === OP_OK) states[op.i] = { state: 'ok', input: op.input };
    else if (op.type === OP_SUB) states[op.i] = { state: 'bad', input: op.input };
    else if (op.type === OP_MULTI) multi++;
    // OP_GAP 已默认 gap
  });

  return { states: states, multi: multi };
}

/**
 * 逐字比对
 * @param {string[]} lines 正确诗句
 * @param {string}   input 用户输入（可能含换行/标点）
 * @returns {{
 *   rows: Array<{line:number, chars: Array<{ch:string, state:'ok'|'bad'|'gap', input:string}>}>,
 *   correct:number, total:number, score:number, multi:number,
 *   fixes: Array<{line:number, pos:number, expect:string, got:string, kind:'wrong'|'missing'}>,
 *   empty:boolean
 * }}
 */
function compare(lines, input) {
  const flat = flatten(lines);
  const got = hans(input);
  const empty = got.length === 0;

  const expect = flat.chars.map(function (c) { return c.ch; });
  const res = align(expect, got);
  const states = res.states;

  let correct = 0;
  states.forEach(function (s) { if (s.state === 'ok') correct++; });

  // 按句分组
  const rows = [];
  flat.spans.forEach(function (sp) {
    const chars = [];
    for (let k = sp.start; k < sp.end; k++) {
      chars.push({ ch: expect[k], state: states[k].state, input: states[k].input });
    }
    rows.push({ line: sp.line, chars: chars });
  });

  // 订正清单
  const fixes = [];
  states.forEach(function (s, k) {
    if (s.state === 'ok') return;
    const e = flat.chars[k];
    fixes.push({
      line: e.line + 1,
      pos: e.pos,
      expect: e.ch,
      got: s.input,
      kind: s.state === 'gap' ? 'missing' : 'wrong'
    });
  });

  const total = expect.length;
  const score = total ? Math.round((correct / total) * 100) : 0;

  return {
    rows: rows,
    correct: correct,
    total: total,
    score: score,
    fixes: fixes,
    multi: res.multi,
    empty: empty
  };
}

/**
 * 填空判定：空格就地判色。
 */
function compareBlanks(blankLines) {
  let total = 0;
  let correct = 0;
  const rows = (blankLines || []).map(function (line, li) {
    const parts = (line.parts || []).map(function (p, pi) {
      if (p.type !== 'blank') return Object.assign({}, p, { pi: pi });
      total++;
      const val = String(p.value || '').trim();
      let state = 'gap';
      if (val) state = val === p.answer ? 'ok' : 'bad';
      if (state === 'ok') correct++;
      return Object.assign({}, p, { pi: pi, state: state });
    });
    return { line: li, parts: parts };
  });

  return {
    rows: rows,
    correct: correct,
    total: total,
    score: total ? Math.round((correct / total) * 100) : 0
  };
}

module.exports = {
  compare: compare,
  compareBlanks: compareBlanks,
  // 内部件，供单测使用
  _align: align,
  _hans: hans
};
