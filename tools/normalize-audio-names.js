#!/usr/bin/env node
/**
 * 一次性迁移：把 40 个素材 m4a 规范化为 audio-<诗库id>.m4a，
 * 并回写 tools/audio-map.json（记新名 file、留原名 originalName 存档）。
 * 用 git mv 改名，内容不变，git 会识别为 rename（历史保留）。
 * 用法：node tools/normalize-audio-names.js [--dry]
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const mapPath = path.join(root, 'tools', 'audio-map.json');
const outDir = path.join(root, 'miniprogram', 'assets', 'audio');
const DRY = process.argv.indexOf('--dry') > -1;

const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
const onDisk = new Set(fs.readdirSync(outDir));

const plan = [];
const problems = [];
map.items.forEach((it) => {
  const newName = 'audio-' + it.id + '.m4a';
  let oldName = null;
  if (it.file && onDisk.has(it.file)) oldName = it.file;
  else if (it.material && onDisk.has(it.material)) oldName = it.material;
  else if (onDisk.has(newName)) oldName = newName;          // 已迁移过
  else { problems.push(it.id + ' 找不到对应素材文件'); return; }
  plan.push({ id: it.id, oldName, newName, it });
});

if (problems.length) {
  console.error('有问题，已中止：');
  problems.forEach((s) => console.error('  - ' + s));
  process.exit(1);
}

const renamed = plan.filter((p) => p.oldName !== p.newName);
console.log('待改名 %d / %d', renamed.length, plan.length);
renamed.forEach((p) => console.log('  %s  →  %s', p.oldName, p.newName));

if (DRY) { console.log('\n[dry-run] 未执行任何操作'); process.exit(0); }

// 1. git mv 改名
let done = 0;
for (const p of renamed) {
  execFileSync('git', ['mv', path.join('miniprogram/assets/audio', p.oldName), path.join('miniprogram/assets/audio', p.newName)], { cwd: root, stdio: 'pipe' });
  done++;
}
console.log('\ngit mv 完成 %d 个', done);

// 2. 回写映射表：file = 新名；originalName = 原名（仅首次迁移时记录）
map.items.forEach((it) => {
  const p = plan.filter((x) => x.id === it.id)[0];
  if (!p) return;
  if (!it.originalName) it.originalName = p.oldName;
  it.file = p.newName;
  delete it.material;
});
map._readme = [
  '音频素材与诗库 id 的对应关系（唯一事实源）。',
  '诗库 id 已按素材的 p01–p40 顺序对齐：p001=素材p01、p002=素材p02 …… p040=素材p40。',
  'file 是音频在 outDir 里的规范文件名（audio-<id>.m4a）；originalName 是原始素材名，仅作溯源，不参与路径解析。',
  'audioSources 是 audioUrl 的取值优先级（按顺序取第一个在 outDir 里真实存在的文件）：',
  '  - "audio-{id}.m4a"  → 原始素材，本地直读（当前阶段）',
  '  - "audio-{id}.mp3"  → 压缩转码后的成品（后续瘦身/上 CDN 阶段）',
  '改完本表跑 `node tools/sync-audio.js` 回填 poems.js 的 audioUrl；--check 只体检不写。',
];
map.audioSources = ['audio-{id}.m4a', 'audio-{id}.mp3'];
delete map.outName;
if (map.urlPrefix !== '/assets/audio/') map.urlPrefix = '/assets/audio/';
// 字段顺序整理
const ordered = {
  _readme: map._readme, outDir: map.outDir, urlPrefix: map.urlPrefix,
  audioSources: map.audioSources,
  items: map.items.map((it) => ({
    id: it.id, file: it.file, materialIndex: it.materialIndex,
    originalName: it.originalName, title: it.title, author: it.author,
  })),
};
fs.writeFileSync(mapPath, JSON.stringify(ordered, null, 2) + '\n', 'utf8');
console.log('映射表已回写：%s', path.relative(root, mapPath));
