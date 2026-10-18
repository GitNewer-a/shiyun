/**
 * 把云存储 fileID 回填进 poems.js 的 audioUrl。
 *
 * 前提：40 个 m4a 按 audio-p001.m4a … audio-p040.m4a 上传到云存储的 audio/ 目录，
 *       且它们的 fileID 前缀相同（同一环境、同一次上传），只有末尾文件名不同。
 *
 * 用法：
 *   node tools/fill-audio-fileid.js <任一 fileID>
 *   node tools/fill-audio-fileid.js <fileID> --dry-run    只看会写什么，不落盘
 *
 * 自检：解析出的前缀必须能还原出传入的 fileID，否则拒绝写入。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'miniprogram', 'data', 'poems.js');

const args = process.argv.slice(2);
const dryRun = args.indexOf('--dry-run') !== -1;
const sample = args.filter((a) => a.indexOf('--') !== 0)[0];

if (!sample) {
  console.error('用法: node tools/fill-audio-fileid.js <fileID> [--dry-run]');
  process.exit(1);
}

// 期望形态：cloud://<env>.<bucket>/audio/audio-pNNN.m4a
const m = sample.match(/^(cloud:\/\/.+?)\/audio\/(audio-p\d{3}\.(?:m4a|mp3))$/);
if (!m) {
  console.error('无法解析这个 fileID，期望形如：');
  console.error('  cloud://<env>.<bucket>/audio/audio-p001.m4a');
  console.error('实际收到：', sample);
  process.exit(1);
}

const prefix = m[1];
const file = m[2];
const sampleId = (file.match(/audio-(p\d{3})/) || [])[1];

// 自检 1：前缀 + 文件名必须能完美还原传入值
if (prefix + '/audio/' + file !== sample) {
  console.error('自检失败：解析结果无法还原原始 fileID，已中止。');
  process.exit(1);
}

// 自检 2：前缀必须是 cloud://<env>.<bucket> 两段结构
const prefixParts = prefix.replace(/^cloud:\/\//, '').split('/');
const host = prefixParts[0] || '';
if (prefixParts.length !== 1 || host.split('.').length !== 2 || host.length < 10) {
  console.error('自检失败：前缀不是 cloud://<env>.<bucket> 形态：', prefix);
  process.exit(1);
}

let src = fs.readFileSync(FILE, 'utf8');
const total = (src.match(/id: 'p\d{3}'/g) || []).length;
let filled = 0;

// 逐条替换：id 与紧随其后的 audioUrl 行绑定，避免错位
src = src.replace(/(id: '(p\d{3})',\s*\n\s*)audioUrl: '[^']*'/g, (whole, head, id) => {
  const name = 'audio-' + id + '.m4a';
  filled++;
  return head + "audioUrl: '" + prefix + '/audio/' + name + "'";
});

if (filled !== total) {
  console.error('自检失败：替换了 ' + filled + ' 条，但诗库有 ' + total + ' 条，已中止（不落盘）。');
  process.exit(1);
}

console.log('样例 fileID 解析：');
console.log('  前缀   :', prefix);
console.log('  文件名 :', file, '→ 对应 id', sampleId);
console.log('  生成样例:', prefix + '/audio/audio-' + sampleId + '.m4a');
console.log('  （与原值一致：' + (prefix + '/audio/audio-' + sampleId + '.m4a' === sample) + '）');
console.log('将回填条目数：', filled, '/', total);

if (dryRun) {
  console.log('\n--dry-run 模式，未写入文件。');
  process.exit(0);
}

fs.writeFileSync(FILE, src, 'utf8');
console.log('\n已写入', FILE);
