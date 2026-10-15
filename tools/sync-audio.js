#!/usr/bin/env node
/**
 * 同步 poems.js 的 audioUrl 与 assets/audio 目录实际库存。
 * 规则：目录里有 audio-<id>.mp3 就填路径，没有就置空。
 * 用法：node tools/sync-audio.js
 * ------------------------------------------------------------------ */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const poemsPath = path.join(root, 'miniprogram', 'data', 'poems.js');
const audioDir = path.join(root, 'miniprogram', 'assets', 'audio');

// 1) 读目录里实际有的 mp3
let present = new Set();
if (fs.existsSync(audioDir)) {
  present = new Set(
    fs.readdirSync(audioDir)
      .filter(function (f) { return f.indexOf('audio-p') === 0 && f.indexOf('.mp3') > 0; })
      .map(function (f) { return f.replace(/^audio-/, '').replace(/\.mp3$/, ''); })
  );
}

// 2) 逐行重写 poems.js 的 audioUrl（取上方最近的 id）
const raw = fs.readFileSync(poemsPath, 'utf8');
const lines = raw.split('\n');
let filled = 0;
let cleared = 0;
for (let i = 0; i < lines.length; i++) {
  const aM = lines[i].match(/^(\s*)audioUrl:\s*'.*?'$/);
  if (!aM) continue;
  let id = '';
  for (let j = i; j >= 0; j--) {
    const m2 = lines[j].match(/^\s*id:\s*'(p\d+)'/);
    if (m2) { id = m2[1]; break; }
  }
  if (!id) continue;
  const has = present.has(id);
  const newPath = has
    ? 'audioUrl: \'/assets/audio/audio-' + id + '.mp3\''
    : "audioUrl: ''";
  lines[i] = aM[1] + newPath;
  if (has) filled++; else cleared++;
}
fs.writeFileSync(poemsPath, lines.join('\n'), 'utf8');

console.log('同步完成：');
console.log('  库存音频 ' + present.size + ' 首 → 填充 ' + filled + ' 条');
console.log('  缺失     → 清空 ' + cleared + ' 条');
if (present.size === 0) {
  console.log('  提示：assets/audio 里没有 mp3，全部 audioUrl 已置空');
}
