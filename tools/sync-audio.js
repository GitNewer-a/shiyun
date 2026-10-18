#!/usr/bin/env node
/**
 * 按 tools/audio-map.json 同步 poems.js 的 audioUrl。
 *
 * 为什么不再按文件名猜：素材集自己的序号（p01–p40）与诗库 id 虽已对齐，
 * 但素材原文件名带「诗名-作者」且格式不统一，靠猜容易错配。映射表是唯一事实源。
 *
 * audioSources 决定 audioUrl 的取值优先级，按顺序取第一个在 outDir 里真实存在的文件，
 * 模板里的 {id} 用诗库 id 展开（p001…p040）：
 *   1. "audio-{id}.m4a"  → 原始素材，本地直读（当前阶段）
 *   2. "audio-{id}.mp3"  → 压缩转码后的成品（后续瘦身 / 上 CDN 阶段）
 * audioUrl = urlPrefix + 命中的文件名；都不存在则置空（页面显示「暂无标准朗读」）。
 *
 * 用法：
 *   node tools/sync-audio.js           # 按现状回填 poems.js
 *   node tools/sync-audio.js --check   # 只体检不写文件
 * ------------------------------------------------------------------ */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const mapPath = path.join(root, 'tools', 'audio-map.json');
const poemsPath = path.join(root, 'miniprogram', 'data', 'poems.js');

const CHECK_ONLY = process.argv.indexOf('--check') > -1;

// ---------- 1. 读映射表并自检 ----------
if (!fs.existsSync(mapPath)) {
  console.error('找不到 ' + mapPath);
  process.exit(1);
}
const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
const items = map.items || [];
const outDir = path.resolve(root, map.outDir || 'miniprogram/assets/audio');
const urlPrefix = map.urlPrefix || '/assets/audio/';
const sources = map.audioSources || ['audio-{id}.m4a', 'audio-{id}.mp3'];

const POEMS = require(poemsPath).POEMS;

const fatal = [];
if (items.length !== POEMS.length) {
  fatal.push('映射表 ' + items.length + ' 条，诗库 ' + POEMS.length + ' 条，数量不符');
}
const seen = new Set();
const candidatesOf = {};    // id -> [候选文件名...]
items.forEach(function (it) {
  if (!it.id) { fatal.push('有条目缺 id'); return; }
  if (seen.has(it.id)) fatal.push('id 重复：' + it.id);
  seen.add(it.id);
  const poem = POEMS.filter(function (p) { return p.id === it.id; })[0];
  if (!poem) { fatal.push('映射表 id ' + it.id + ' 在诗库里没有'); return; }
  if (poem.title !== it.title) {
    fatal.push(it.id + ' 标题不符：映射表=' + it.title + ' 诗库=' + poem.title);
  }
  candidatesOf[it.id] = sources.map(function (s) {
    return String(s).replace('{id}', it.id);
  });
});
POEMS.forEach(function (p) {
  if (!seen.has(p.id)) fatal.push('诗库 id ' + p.id + '（' + p.title + '）在映射表里没有');
});
if (fatal.length) {
  console.error('映射表与诗库不一致，已中止：');
  fatal.forEach(function (s) { console.error('  - ' + s); });
  process.exit(1);
}

// ---------- 2. 看目录里实际有哪些文件，逐条解析命中的来源 ----------
let present = new Set();
if (fs.existsSync(outDir)) present = new Set(fs.readdirSync(outDir));

const resolvedOf = {};      // id -> 命中的文件名 | null
const hitCount = {};        // 来源模板 -> 命中数
Object.keys(candidatesOf).forEach(function (id) {
  let hit = null, from = null;
  for (let k = 0; k < sources.length; k++) {
    const f = candidatesOf[id][k];
    if (present.has(f)) { hit = f; from = sources[k]; break; }
  }
  resolvedOf[id] = hit;
  if (hit) hitCount[from] = (hitCount[from] || 0) + 1;
});

// ---------- 3. 逐行重写 poems.js 的 audioUrl ----------
const raw = fs.readFileSync(poemsPath, 'utf8');
const lines = raw.split('\n');
let filled = 0;
let cleared = 0;
const missing = [];
// 注意：audioUrl 行尾带逗号（如 `audioUrl: '',`），所以必须允许行尾逗号，
// 否则一条都匹配不上。前缀与行尾后缀（逗号）都要原样保留。
const RE_AUDIO = /^(\s*audioUrl:\s*)'(.*?)'(\s*,?\s*)$/;
const RE_ID = /^\s*id:\s*'(p\d+)'/;
for (let i = 0; i < lines.length; i++) {
  const aM = lines[i].match(RE_AUDIO);
  if (!aM) continue;
  let id = '';
  for (let j = i; j >= 0; j--) {
    const m2 = lines[j].match(RE_ID);
    if (m2) { id = m2[1]; break; }
  }
  if (!id || !(id in resolvedOf)) continue;
  const file = resolvedOf[id];
  lines[i] = aM[1] + (file ? "'" + urlPrefix + file + "'" : "''") + aM[3];
  if (file) filled++; else { cleared++; missing.push(id); }
}

if (!CHECK_ONLY) {
  fs.writeFileSync(poemsPath, lines.join('\n'), 'utf8');
}

// ---------- 4. 报告 ----------
console.log(CHECK_ONLY ? '体检模式（未写入任何文件）' : '同步完成');
console.log('  映射表 ' + items.length + ' 条 → 命中音频 ' + filled + ' 首，缺音频 ' + cleared + ' 首');
if (filled) {
  const parts = Object.keys(hitCount).map(function (k) { return k + ' × ' + hitCount[k]; });
  console.log('  命中来源：' + parts.join('，'));
  console.log('  优先级：' + sources.join('  >  '));
}
if (filled === 0) {
  console.log('  提示：' + map.outDir + ' 里没有 ' + sources.join(' 或 ') + ' 形式的文件，');
  console.log('        诗库 audioUrl 全部保持为空（页面显示「暂无标准朗读」）。');
} else if (missing.length) {
  console.log('  仍缺音频的 id：' + missing.join(' '));
}
