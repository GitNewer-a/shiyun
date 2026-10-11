/* 诗词数据（本地兜底源）
   字段与云开发 poems 集合保持一致，导入云数据库后可整体替换。
   img 留空：配图走云存储，上传后回填 fileID；为空时页面用远山渐变兜底。
   ------------------------------------------------------------------ */

const POEMS = [
  {
    id: 'p001',
    title: '静夜思',
    titlePinyin: 'jìng yè sī',
    author: '李白',
    authorPinyin: 'lǐ bái',
    dynasty: '唐',
    genre: '唐诗',
    stage: '小学',
    img: '',
    lines: ['床前明月光', '疑是地上霜', '举头望明月', '低头思故乡'],
    pinyin: [
      'chuáng qián míng yuè guāng',
      'yí shì dì shàng shuāng',
      'jǔ tóu wàng míng yuè',
      'dī tóu sī gù xiāng'
    ],
    translation: '皎洁的月光洒在床前，好像地上泛起了一层白霜。我抬起头望着天上的明月，又低下头思念起远方的故乡。',
    annotation: '疑：好像，以为。举头：抬起头。',
    appreciation: '全诗从「疑」到「举头」再到「低头」，把一瞬间的心绪转折写得极自然。没有一字雕琢，却成了中国人最熟悉的乡愁。'
  },
  {
    id: 'p002',
    title: '春晓',
    titlePinyin: 'chūn xiǎo',
    author: '孟浩然',
    authorPinyin: 'mèng hào rán',
    dynasty: '唐',
    genre: '唐诗',
    stage: '小学',
    img: '',
    lines: ['春眠不觉晓', '处处闻啼鸟', '夜来风雨声', '花落知多少'],
    pinyin: [
      'chūn mián bù jué xiǎo',
      'chù chù wén tí niǎo',
      'yè lái fēng yǔ shēng',
      'huā luò zhī duō shǎo'
    ],
    translation: '春天睡得香，不知不觉天已亮，到处都能听见鸟儿的啼叫。昨夜隐约听到风声雨声，不知道有多少花儿被吹落了。',
    annotation: '晓：天亮。闻：听见。知多少：不知有多少。',
    appreciation: '诗人只写「听见」的：鸟啼、风雨。花落是推想出来的，正因看不见，才更觉春光易逝。'
  },
  {
    id: 'p003',
    title: '望岳',
    titlePinyin: 'wàng yuè',
    author: '杜甫',
    authorPinyin: 'dù fǔ',
    dynasty: '唐',
    genre: '唐诗',
    stage: '初中',
    img: '',
    lines: ['白日依山尽', '黄河入海流', '欲穷千里目', '更上一层楼'],
    pinyin: [
      'bái rì yī shān jìn',
      'huáng hé rù hǎi liú',
      'yù qióng qiān lǐ mù',
      'gèng shàng yī céng lóu'
    ],
    translation: '夕阳依傍着西山慢慢沉落，滔滔黄河朝着大海奔流。想要看到千里之外的风光，就要再登上一层楼。',
    annotation: '依：依傍。尽：消失。穷：穷尽，这里指看尽。',
    appreciation: '前两句写实景，气象阔大；后两句由景入理，「更上一层楼」从此成了进取的代名词。'
  },
  {
    id: 'p004',
    title: '将进酒',
    titlePinyin: 'jiāng jìn jiǔ',
    author: '李白',
    authorPinyin: 'lǐ bái',
    dynasty: '唐',
    genre: '唐诗',
    stage: '高中',
    img: '',
    lines: ['日照香炉生紫烟', '遥看瀑布挂前川', '飞流直下三千尺', '疑是银河落九天'],
    pinyin: [
      'rì zhào xiāng lú shēng zǐ yān',
      'yáo kàn pù bù guà qián chuān',
      'fēi liú zhí xià sān qiān chǐ',
      'yí shì yín hé luò jiǔ tiān'
    ],
    translation: '太阳照在香炉峰上升起紫色云烟，远远望去瀑布像一条白练挂在山前。飞泻的水流直冲而下足有三千尺，让人怀疑是银河从九天之上倾落下来。',
    annotation: '香炉：庐山的香炉峰。川：河流。九天：天的最高处。',
    appreciation: '「挂」字把动写成静，「落」字又把静写成动。李白式的夸张在这里不显浮泛，反让人真听见了水声。'
  },
  {
    id: 'p005',
    title: '水调歌头',
    titlePinyin: 'shuǐ diào gē tóu',
    author: '苏轼',
    authorPinyin: 'sū shì',
    dynasty: '宋',
    genre: '宋词',
    stage: '高中',
    img: '',
    lines: ['千山鸟飞绝', '万径人踪灭', '孤舟蓑笠翁', '独钓寒江雪'],
    pinyin: [
      'qiān shān niǎo fēi jué',
      'wàn jìng rén zōng miè',
      'gū zhōu suō lì wēng',
      'dú diào hán jiāng xuě'
    ],
    translation: '所有的山上都看不见飞鸟的影子，所有的小路上都没有人的踪迹。只有一叶孤舟上，披着蓑衣戴着斗笠的老翁，独自在漫天风雪的江面上垂钓。',
    annotation: '绝：无，没有。径：小路。蓑笠：蓑衣和斗笠。',
    appreciation: '前两句铺天盖地的「空」，都是为了托出最后那个「独」字。二十个字里藏着一整幅寒江图。'
  },
  {
    id: 'p006',
    title: '绝句',
    titlePinyin: 'jué jù',
    author: '杜甫',
    authorPinyin: 'dù fǔ',
    dynasty: '唐',
    genre: '唐诗',
    stage: '小学',
    img: '',
    lines: ['两个黄鹂鸣翠柳', '一行白鹭上青天', '窗含西岭千秋雪', '门泊东吴万里船'],
    pinyin: [
      'liǎng gè huáng lí míng cuì liǔ',
      'yī háng bái lù shàng qīng tiān',
      'chuāng hán xī lǐng qiān qiū xuě',
      'mén bó dōng wú wàn lǐ chuán'
    ],
    translation: '两只黄鹂在翠绿的柳枝间鸣叫，一行白鹭向青天飞去。窗子里能望见西岭上千年不化的积雪，门前停泊着往来东吴的万里行船。',
    annotation: '黄鹂：一种黄色的鸟。西岭：西岭雪山。泊：停船。',
    appreciation: '四句四景，一句一色：黄、翠、白、青。对仗极工却不显板滞，是杜诗里难得的轻快之作。'
  },
  { id: 'p007', title: '声声慢', author: '李清照', dynasty: '宋', genre: '宋词', stage: '高中', img: '', lines: ['寻寻觅觅，冷冷清清'], pinyin: [], translation: '', annotation: '', appreciation: '' },
  { id: 'p008', title: '天净沙·秋思', author: '马致远', dynasty: '元', genre: '元曲', stage: '初中', img: '', lines: ['枯藤老树昏鸦'], pinyin: [], translation: '', annotation: '', appreciation: '' },
  { id: 'p009', title: '钱塘湖春行', author: '白居易', dynasty: '唐', genre: '唐诗', stage: '初中', img: '', lines: ['孤山寺北贾亭西'], pinyin: [], translation: '', annotation: '', appreciation: '' },
  { id: 'p010', title: '登鹳雀楼', author: '王之涣', dynasty: '唐', genre: '唐诗', stage: '小学', img: '', lines: ['白日依山尽'], pinyin: [], translation: '', annotation: '', appreciation: '' },
  { id: 'p011', title: '念奴娇·赤壁怀古', author: '苏轼', dynasty: '宋', genre: '宋词', stage: '高中', img: '', lines: ['大江东去'], pinyin: [], translation: '', annotation: '', appreciation: '' },
  { id: 'p012', title: '琵琶行', author: '白居易', dynasty: '唐', genre: '唐诗', stage: '高中', img: '', lines: ['大弦嘈嘈如急雨'], pinyin: [], translation: '', annotation: '', appreciation: '' },
  { id: 'p013', title: '春望', author: '杜甫', dynasty: '唐', genre: '唐诗', stage: '初中', img: '', lines: ['国破山河在'], pinyin: [], translation: '', annotation: '', appreciation: '' },
  { id: 'p014', title: '早发白帝城', author: '李白', dynasty: '唐', genre: '唐诗', stage: '小学', img: '', lines: ['朝辞白帝彩云间'], pinyin: [], translation: '', annotation: '', appreciation: '' },
  { id: 'p015', title: '如梦令', author: '李清照', dynasty: '宋', genre: '宋词', stage: '初中', img: '', lines: ['常记溪亭日暮'], pinyin: [], translation: '', annotation: '', appreciation: '' }
];

/** 按 id 取诗 */
function getPoemById(id) {
  return POEMS.filter(function (p) {
    return p.id === id;
  })[0] || null;
}

/** 学段 / 体裁 / 作者 三组 AND 逻辑筛选，值为 'all' 时不过滤 */
function filterPoems(stage, genre, author) {
  return POEMS.filter(function (p) {
    if (stage && stage !== 'all' && p.stage !== stage) return false;
    if (genre && genre !== 'all' && p.genre !== genre) return false;
    if (author && author !== 'all' && p.author !== author) return false;
    return true;
  });
}

/** 关键词搜索：诗题 / 作者 / 朝代 / 正文 */
function searchPoems(keyword) {
  const kw = (keyword || '').trim();
  if (!kw) return [];
  return POEMS.filter(function (p) {
    return (
      p.title.indexOf(kw) > -1 ||
      p.author.indexOf(kw) > -1 ||
      p.dynasty.indexOf(kw) > -1 ||
      p.lines.join('').indexOf(kw) > -1
    );
  });
}

module.exports = {
  POEMS: POEMS,
  getPoemById: getPoemById,
  filterPoems: filterPoems,
  searchPoems: searchPoems
};
