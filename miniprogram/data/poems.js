/* 诗词数据（本地兜底源）
   字段与云开发 poems 集合保持一致，导入云数据库后可整体替换。
   img 留空：配图走云存储，上传后回填 fileID；为空时页面用远山渐变兜底。
   lines 含规范标点；拼音只对应汉字，展示时标点拼音留空。
   ------------------------------------------------------------------
   2026-10-15 重建：诗库由 20 首改为 40 首，**与《48首动画唐诗》素材集的
   40 首曲目一一对应**（顺序也一致）。

   id 规则： p001 = 素材 p01、p002 = 素材 p02 …… p040 = 素材 p40。
   注意素材集的 p01–p40 是素材自己的序号，与这里的 id 一一对齐，
   但**不要再拿素材文件名里的序号去推断诗名**，对应关系以
   tools/audio-map.json 为准（那里是唯一事实源）。

   原先 20 首版中与素材不同名的 11 首（望岳、将进酒、水调歌头、声声慢、
   天净沙·秋思、钱塘湖春行、念奴娇·赤壁怀古、琵琶行、春望、如梦令、
   登飞来峰）已移出到 data-archive/poems-archived.js，内容一字未改。

   audioUrl 暂全部留空：40 个素材仍是 47MB 的 m4a，既超出主包 2MB 上限，
   也还没裁成成品。待音频就位（裁剪压缩后走云存储/CDN 或分包）再统一回填，
   届时跑 `node tools/sync-audio.js` 即可按 audio-map.json 自动写入。
   ------------------------------------------------------------------ */

const POEMS = [
  {
    id: 'p001',
    audioUrl: 'cloud://yunkaifa-d3ggyio111d28205c.7975-yunkaifa-d3ggyio111d28205c-1336180871/audio/audio-p001.m4a',
    title: '静夜思',
    titlePinyin: 'jìng yè sī',
    author: '李白',
    authorPinyin: 'lǐ bái',
    dynasty: '唐',
    genre: '唐诗',
    stage: '小学',
    img: '/assets/poem-bg/bg-p001.jpg',
    lines: ['床前明月光，', '疑是地上霜。', '举头望明月，', '低头思故乡。'],
    pinyin: [
      'chuáng qián míng yuè guāng',
      'yí shì dì shàng shuāng',
      'jǔ tóu wàng míng yuè',
      'dī tóu sī gù xiāng'
    ],
    translation: '明亮的月光，照在床前，看上去，地上像是铺了一层白白的霜，抬起头，看着天上的月亮，不由得想念起自己的家乡。',
    annotation: '疑：好像，以为。举头：抬起头。',
    appreciation: '全诗从「疑」到「举头」再到「低头」，把一瞬间的心绪转折写得极自然。没有一字雕琢，却成了中国人最熟悉的乡愁。'
  },
  {
    id: 'p002',
    audioUrl: 'cloud://yunkaifa-d3ggyio111d28205c.7975-yunkaifa-d3ggyio111d28205c-1336180871/audio/audio-p002.m4a',
    title: '春晓',
    titlePinyin: 'chūn xiǎo',
    author: '孟浩然',
    authorPinyin: 'mèng hào rán',
    dynasty: '唐',
    genre: '唐诗',
    stage: '小学',
    img: '',
    lines: ['春眠不觉晓，', '处处闻啼鸟。', '夜来风雨声，', '花落知多少。'],
    pinyin: [
      'chūn mián bù jué xiǎo',
      'chù chù wén tí niǎo',
      'yè lái fēng yǔ shēng',
      'huā luò zhī duō shǎo'
    ],
    translation: '春天来了，天亮得越来越早。一觉醒来，窗外到处是小鸟的叫声，诗人忽然想起夜里曾听到刮风下雨的声音，不知道风雨会打落多少花朵呢。',
    annotation: '晓：天亮。闻：听见。知多少：不知有多少。',
    appreciation: '诗人只写「听见」的：鸟啼、风雨。花落是推想出来的，正因看不见，才更觉春光易逝。'
  },
  {
    id: 'p003',
    audioUrl: 'cloud://yunkaifa-d3ggyio111d28205c.7975-yunkaifa-d3ggyio111d28205c-1336180871/audio/audio-p003.m4a',
    title: '望庐山瀑布',
    titlePinyin: 'wàng lú shān pù bù',
    author: '李白',
    authorPinyin: 'lǐ bái',
    dynasty: '唐',
    genre: '唐诗',
    stage: '小学',
    img: '',
    lines: ['日照香炉生紫烟，', '遥看瀑布挂前川。', '飞流直下三千尺，', '疑是银河落九天。'],
    pinyin: [
      'rì zhào xiāng lú shēng zǐ yān',
      'yáo kàn pù bù guà qián chuān',
      'fēi liú zhí xià sān qiān chǐ',
      'yí shì yín hé luò jiǔ tiān'
    ],
    translation: '阳光照射在香炉峰上，紫色的雾气像云烟缭绕，像仙境一样。远远看去，瀑布就像挂在山前的一条大河，水从高处流下，真怀疑是天上的银河泄落到了人间。',
    annotation: '香炉：庐山的香炉峰。川：河流。九天：天的最高处。',
    appreciation: '「挂」字把动写成静，「落」字又把静写成动。李白式的夸张在这里不显浮泛，反让人真听见了水声。'
  },
  {
    id: 'p004',
    audioUrl: 'cloud://yunkaifa-d3ggyio111d28205c.7975-yunkaifa-d3ggyio111d28205c-1336180871/audio/audio-p004.m4a',
    title: '江雪',
    titlePinyin: 'jiāng xuě',
    author: '柳宗元',
    authorPinyin: 'liǔ zōng yuán',
    dynasty: '唐',
    genre: '唐诗',
    stage: '小学',
    img: '',
    lines: ['千山鸟飞绝，', '万径人踪灭。', '孤舟蓑笠翁，', '独钓寒江雪。'],
    pinyin: [
      'qiān shān niǎo fēi jué',
      'wàn jìng rén zōng miè',
      'gū zhōu suō lì wēng',
      'dú diào hán jiāng xuě'
    ],
    translation: '山里面连一只小鸟的影子都看不见，路上也看不到一个行人，只有一只孤零零的小船停在江面上，船上一位身披蓑衣，头戴斗笠的老人顶着风雪正在江上钓鱼。',
    annotation: '绝：无，没有。径：小路。蓑笠：蓑衣和斗笠。',
    appreciation: '前两句铺天盖地的「空」，都是为了托出最后那个「独」字。二十个字里藏着一整幅寒江图。'
  },
  {
    id: 'p005',
    audioUrl: 'cloud://yunkaifa-d3ggyio111d28205c.7975-yunkaifa-d3ggyio111d28205c-1336180871/audio/audio-p005.m4a',
    title: '逢雪宿芙蓉山主人',
    titlePinyin: 'féng xuě sù fú róng shān zhǔ rén',
    author: '刘长卿',
    authorPinyin: 'liú cháng qīng',
    dynasty: '唐',
    genre: '唐诗',
    stage: '小学',
    img: '',
    lines: ['日暮苍山远，', '天寒白屋贫。', '柴门闻犬吠，', '风雪夜归人。'],
    pinyin: [
      'rì mù cāng shān yuǎn',
      'tiān hán bái wū pín',
      'chái mén wén quǎn fèi',
      'fēng xuě yè guī rén'
    ],
    translation: '天快黑了，山高路远，白茫茫的一片。寒冷之中，我看见一个简陋的茅草屋，夜里树枝编成的门外传来一阵阵狗叫声，原来是茅屋的主人冒着风雪回来了。',
    annotation: '芙蓉山：山名，在今湖南境内。白屋：茅草屋，指贫苦人家的房子。柴门：用树枝编成的门。犬吠：狗叫。',
    appreciation: '四句全是白描，从远山写到屋檐，再到门外的犬吠，最后才出现「归人」。二十个字里，一场风雪夜宿的情形全活了。'
  },
  {
    id: 'p006',
    audioUrl: 'cloud://yunkaifa-d3ggyio111d28205c.7975-yunkaifa-d3ggyio111d28205c-1336180871/audio/audio-p006.m4a',
    title: '独坐敬亭山',
    titlePinyin: 'dú zuò jìng tíng shān',
    author: '李白',
    authorPinyin: 'lǐ bái',
    dynasty: '唐',
    genre: '唐诗',
    stage: '小学',
    img: '',
    lines: ['众鸟高飞尽，', '孤云独去闲。', '相看两不厌，', '只有敬亭山。'],
    pinyin: [
      'zhòng niǎo gāo fēi jìn',
      'gū yún dú qù xián',
      'xiāng kàn liǎng bú yàn',
      'zhǐ yǒu jìng tíng shān'
    ],
    translation: '天上的鸟越飞越高，都飞走了，孤寂的云彩慢慢的飘向远方，留下我和敬亭山彼此相看，不觉得厌烦，相互传递着脉脉深情。',
    annotation: '敬亭山：在今安徽宣城。尽：完，指消失。闲：悠闲。相看：互相看着。厌：满足。',
    appreciation: '鸟飞云去，天地间只剩人和山。把「孤独」写成「两不厌」的相知，是李白晚年特有的温柔。'
  },
  {
    id: 'p007',
    audioUrl: 'cloud://yunkaifa-d3ggyio111d28205c.7975-yunkaifa-d3ggyio111d28205c-1336180871/audio/audio-p007.m4a',
    title: '登鹳雀楼',
    titlePinyin: 'dēng guàn què lóu',
    author: '王之涣',
    authorPinyin: 'wáng zhī huàn',
    dynasty: '唐',
    genre: '唐诗',
    stage: '小学',
    img: '',
    lines: ['白日依山尽，', '黄河入海流。', '欲穷千里目，', '更上一层楼。'],
    pinyin: [
      'bái rì yī shān jìn',
      'huáng hé rù hǎi liú',
      'yù qióng qiān lǐ mù',
      'gèng shàng yī céng lóu'
    ],
    translation: '太阳渐渐的落山了，黄河从远方滚滚的向大海奔去，如果我想看到更远的风景，就需要努力再登上一层楼。',
    annotation: '鹳雀楼：旧址在今山西永济。依：依傍。尽：消失。穷：穷尽，这里指看尽。',
    appreciation: '前两句写实景，气象阔大；后两句由景入理，「更上一层楼」从此成了进取的代名词。'
  },
  {
    id: 'p008',
    audioUrl: 'cloud://yunkaifa-d3ggyio111d28205c.7975-yunkaifa-d3ggyio111d28205c-1336180871/audio/audio-p008.m4a',
    title: '池上',
    titlePinyin: 'chí shàng',
    author: '白居易',
    authorPinyin: 'bái jū yì',
    dynasty: '唐',
    genre: '唐诗',
    stage: '小学',
    img: '',
    lines: ['小娃撑小艇，', '偷采白莲回。', '不解藏踪迹，', '浮萍一道开。'],
    pinyin: [
      'xiǎo wá chēng xiǎo tǐng',
      'tōu cǎi bái lián huí',
      'bù jiě cáng zōng jì',
      'fú píng yī dào kāi'
    ],
    translation: '一个可爱的小孩撑着一只小船，悄悄地采了许多莲蓬回来。小孩不知道怎样掩藏踪迹，湖面的浮萍被他的小船冲开了一道道水痕。',
    annotation: '小娃：小孩。艇：小船。白莲：白色的莲花。不解：不懂得。踪迹：行动留下的痕迹。浮萍：水面上漂浮的植物。',
    appreciation: '「偷」字不写偷窃，只写淘气；「不解」二字更见天真。孩子自以为无人知晓，那道浮萍却把他全卖了。'
  },
  {
    id: 'p009',
    audioUrl: 'cloud://yunkaifa-d3ggyio111d28205c.7975-yunkaifa-d3ggyio111d28205c-1336180871/audio/audio-p009.m4a',
    title: '鹿柴',
    titlePinyin: 'lù zhài',
    author: '王维',
    authorPinyin: 'wáng wéi',
    dynasty: '唐',
    genre: '唐诗',
    stage: '小学',
    img: '',
    lines: ['空山不见人，', '但闻人语响。', '返景入深林，', '复照青苔上。'],
    pinyin: [
      'kōng shān bú jiàn rén',
      'dàn wén rén yǔ xiǎng',
      'fǎn jǐng rù shēn lín',
      'fù zhào qīng tái shàng'
    ],
    translation: '空旷的山林间，一个人影都看不到，但是偶尔能听到有人说话的声音。落日的余光照进茂密树林深处，又映射到了青青的苔藓上。',
    annotation: '鹿柴：辋川别业的景点之一，「柴」读 zhài。但：只。返景：夕阳返照的光，「景」同「影」。复：又。',
    appreciation: '不见人，却有人语；不见光，却见返照。王维用「有」来写「无」，把山林的空静推到了极致。'
  },
  {
    id: 'p010',
    audioUrl: 'cloud://yunkaifa-d3ggyio111d28205c.7975-yunkaifa-d3ggyio111d28205c-1336180871/audio/audio-p010.m4a',
    title: '马诗',
    titlePinyin: 'mǎ shī',
    author: '李贺',
    authorPinyin: 'lǐ hè',
    dynasty: '唐',
    genre: '唐诗',
    stage: '小学',
    img: '',
    lines: ['大漠沙如雪，', '燕山月似钩。', '何当金络脑，', '快走踏清秋。'],
    pinyin: [
      'dà mò shā rú xuě',
      'yān shān yuè sì gōu',
      'hé dāng jīn luò nǎo',
      'kuài zǒu tà qīng qiū'
    ],
    translation: '燕山顶上的月牙儿像钩子一样挂在天空，月光照在沙漠上，像是铺了一层白雪。我什么时候才能给战马套上黄金的笼头，让它在秋高气爽的大地上奔跑呢？',
    annotation: '燕山：此处读 yān，山名。钩：弯钩，形容新月。何当：什么时候才能。金络脑：黄金装饰的马笼头，指受到重用。',
    appreciation: '前两句写边塞的空阔清冷，后两句写马的渴望。李贺借马写人，把怀才不遇的郁结压进「快走踏清秋」五个字里。'
  },
  {
    id: 'p011',
    audioUrl: 'cloud://yunkaifa-d3ggyio111d28205c.7975-yunkaifa-d3ggyio111d28205c-1336180871/audio/audio-p011.m4a',
    title: '悯农',
    titlePinyin: 'mǐn nóng',
    author: '李绅',
    authorPinyin: 'lǐ shēn',
    dynasty: '唐',
    genre: '唐诗',
    stage: '小学',
    img: '',
    lines: ['锄禾日当午，', '汗滴禾下土。', '谁知盘中餐，', '粒粒皆辛苦。'],
    pinyin: [
      'chú hé rì dāng wǔ',
      'hàn dī hé xià tǔ',
      'shuí zhī pán zhōng cān',
      'lì lì jiē xīn kǔ'
    ],
    translation: '中午的太阳火辣辣的，农民却还在田里锄地，汗水一滴滴的掉在田地里，有谁会想到我们碗里的米饭，每一粒都是农民的辛勤劳动换来的呢。',
    annotation: '悯：怜悯。禾：谷类作物的幼苗。餐：饭食。',
    appreciation: '语言极浅，道理极重。由「汗」到「餐」，把看不见的劳作写进每一粒米里，所以能传诵千百年。'
  },
  {
    id: 'p012',
    audioUrl: 'cloud://yunkaifa-d3ggyio111d28205c.7975-yunkaifa-d3ggyio111d28205c-1336180871/audio/audio-p012.m4a',
    title: '鸟鸣涧',
    titlePinyin: 'niǎo míng jiàn',
    author: '王维',
    authorPinyin: 'wáng wéi',
    dynasty: '唐',
    genre: '唐诗',
    stage: '小学',
    img: '',
    lines: ['人闲桂花落，', '夜静春山空。', '月出惊山鸟，', '时鸣春涧中。'],
    pinyin: [
      'rén xián guì huā luò',
      'yè jìng chūn shān kōng',
      'yuè chū jīng shān niǎo',
      'shí míng chūn jiàn zhōng'
    ],
    translation: '空旷的山林，桂花瓣无声地飘落着，在静静的春夜山中更显得幽静。月亮升起来了，惊醒了山中的小鸟，它们的鸣叫在春天的山涧中时时回响。',
    annotation: '涧：山间流水的沟。闲：安静、悠闲。空：空寂。时鸣：不时地鸣叫。',
    appreciation: '「人闲」是前提——心不静就看不见花落。末两句以「惊」「鸣」的动，反衬出整座春山的静。'
  },
  {
    id: 'p013',
    audioUrl: 'cloud://yunkaifa-d3ggyio111d28205c.7975-yunkaifa-d3ggyio111d28205c-1336180871/audio/audio-p013.m4a',
    title: '宿建德江',
    titlePinyin: 'sù jiàn dé jiāng',
    author: '孟浩然',
    authorPinyin: 'mèng hào rán',
    dynasty: '唐',
    genre: '唐诗',
    stage: '小学',
    img: '',
    lines: ['移舟泊烟渚，', '日暮客愁新。', '野旷天低树，', '江清月近人。'],
    pinyin: [
      'yí zhōu bó yān zhǔ',
      'rì mù kè chóu xīn',
      'yě kuàng tiān dī shù',
      'jiāng qīng yuè jìn rén'
    ],
    translation: '小船停靠在雾蒙蒙的小洲边，天色晚了，离家在外的人又增添了新的愁绪。空旷的原野天空看上去似乎比树还低，清澈江水中月亮的倒影看起来好像和人离得更近了。',
    annotation: '建德江：新安江流经建德的一段。泊：停船靠岸。烟渚：雾气笼罩的小洲。客：旅人。旷：空阔。',
    appreciation: '「天低树」「月近人」都是错觉，却正是旅人眼里的世界——天压下来了，只有月亮肯靠近。'
  },
  {
    id: 'p014',
    audioUrl: 'cloud://yunkaifa-d3ggyio111d28205c.7975-yunkaifa-d3ggyio111d28205c-1336180871/audio/audio-p014.m4a',
    title: '相思',
    titlePinyin: 'xiāng sī',
    author: '王维',
    authorPinyin: 'wáng wéi',
    dynasty: '唐',
    genre: '唐诗',
    stage: '小学',
    img: '',
    lines: ['红豆生南国，', '春来发几枝。', '愿君多采撷，', '此物最相思。'],
    pinyin: [
      'hóng dòu shēng nán guó',
      'chūn lái fā jǐ zhī',
      'yuàn jūn duō cǎi xié',
      'cǐ wù zuì xiāng sī'
    ],
    translation: '红豆生长在南方，春天来临，不知道又会有几根新枝出现，希望您多采一些红豆，因为它们最能引起对爱人的思念。',
    annotation: '红豆：又名相思子。南国：南方。采撷：采摘。',
    appreciation: '全诗不写自己如何思念，只劝对方「多采撷」。把情意托付给一颗小小红豆，干净到不能再干净。'
  },
  {
    id: 'p015',
    audioUrl: 'cloud://yunkaifa-d3ggyio111d28205c.7975-yunkaifa-d3ggyio111d28205c-1336180871/audio/audio-p015.m4a',
    title: '寻隐者不遇',
    titlePinyin: 'xún yǐn zhě bú yù',
    author: '贾岛',
    authorPinyin: 'jiǎ dǎo',
    dynasty: '唐',
    genre: '唐诗',
    stage: '小学',
    img: '',
    lines: ['松下问童子，', '言师采药去。', '只在此山中，', '云深不知处。'],
    pinyin: [
      'sōng xià wèn tóng zǐ',
      'yán shī cǎi yào qù',
      'zhǐ zài cǐ shān zhōng',
      'yún shēn bù zhī chù'
    ],
    translation: '在松树下面，我问一个小孩，他的师傅到哪里去了？小孩说师傅采药去了，他的师傅就在这座山上采药，但是山这么大，不知道具体在什么地方。',
    annotation: '隐者：隐居的人。童子：这里指隐者的徒弟。言：说。处：地方。',
    appreciation: '一问三答，全诗没有写隐者一面，却让人感到他无处不在。云深不知处，正是隐者最好的画像。'
  },
  {
    id: 'p016',
    audioUrl: 'cloud://yunkaifa-d3ggyio111d28205c.7975-yunkaifa-d3ggyio111d28205c-1336180871/audio/audio-p016.m4a',
    title: '夜宿山寺',
    titlePinyin: 'yè sù shān sì',
    author: '李白',
    authorPinyin: 'lǐ bái',
    dynasty: '唐',
    genre: '唐诗',
    stage: '小学',
    img: '',
    lines: ['危楼高百尺，', '手可摘星辰。', '不敢高声语，', '恐惊天上人。'],
    pinyin: [
      'wēi lóu gāo bǎi chǐ',
      'shǒu kě zhāi xīng chén',
      'bù gǎn gāo shēng yǔ',
      'kǒng jīng tiān shàng rén'
    ],
    translation: '山上的寺庙很高很高，人站在上面好像一伸手就可以摘到天上的星星和月亮。我站在上面都不敢大声说话，生怕惊动了天上的神仙。',
    annotation: '危楼：高楼，这里指山寺的楼。百尺：虚指，形容很高。星辰：星星。语：说话。',
    appreciation: '「不敢」两个字最妙——明明是自己怕，却写成替天上人着想。童心和想象力，让这二十个字一直轻快。'
  },
  {
    id: 'p017',
    audioUrl: 'cloud://yunkaifa-d3ggyio111d28205c.7975-yunkaifa-d3ggyio111d28205c-1336180871/audio/audio-p017.m4a',
    title: '一去二三里',
    titlePinyin: 'yī qù èr sān lǐ',
    author: '邵雍',
    authorPinyin: 'shào yōng',
    dynasty: '宋',
    genre: '宋诗',
    stage: '小学',
    img: '',
    lines: ['一去二三里，', '烟村四五家。', '亭台六七座，', '八九十枝花。'],
    pinyin: [
      'yī qù èr sān lǐ',
      'yān cūn sì wǔ jiā',
      'tíng tái liù qī zuò',
      'bā jiǔ shí zhī huā'
    ],
    translation: '我独自到外面游玩，不知不觉离家已经很远了，看到不远处有四五户人家已经冒起了炊烟。我信步走来，又看到路边有六七处精美的亭阁楼台，身边的树枝上挂着很多花，真是令人赏心悦目。',
    annotation: '烟村：炊烟缭绕的村庄。亭台：供人休息、观景的亭子和台榭。',
    appreciation: '把一到十嵌进诗里却不显生硬，全凭一幅由远及近的乡村小景。数字成了望远镜，一步步把读者带进村里。'
  },
  {
    id: 'p018',
    audioUrl: 'cloud://yunkaifa-d3ggyio111d28205c.7975-yunkaifa-d3ggyio111d28205c-1336180871/audio/audio-p018.m4a',
    title: '咏鹅',
    titlePinyin: 'yǒng é',
    author: '骆宾王',
    authorPinyin: 'luò bīn wáng',
    dynasty: '唐',
    genre: '唐诗',
    stage: '小学',
    img: '',
    lines: ['鹅，鹅，鹅，', '曲项向天歌。', '白毛浮绿水，', '红掌拨清波。'],
    pinyin: [
      'é é é',
      'qū xiàng xiàng tiān gē',
      'bái máo fú lǜ shuǐ',
      'hóng zhǎng bō qīng bō'
    ],
    translation: '一群大白鹅，它们弯着脖子，向着天空嘎嘎地唱歌，洁白的羽毛。浮在碧绿的水面上，红红的脚掌滑动着轻轻的水波，构成了一幅色彩鲜艳的图画。',
    annotation: '咏：用诗词来描写。项：脖颈。掌：指鹅的脚掌。拨：划动。',
    appreciation: '据说是骆宾王七岁时所作。色彩分明：白毛、绿水、红掌，再加上一声声「鹅」，儿童眼中的世界便活了。'
  },
  {
    id: 'p019',
    audioUrl: 'cloud://yunkaifa-d3ggyio111d28205c.7975-yunkaifa-d3ggyio111d28205c-1336180871/audio/audio-p019.m4a',
    title: '咏柳',
    titlePinyin: 'yǒng liǔ',
    author: '贺知章',
    authorPinyin: 'hè zhī zhāng',
    dynasty: '唐',
    genre: '唐诗',
    stage: '小学',
    img: '',
    lines: ['碧玉妆成一树高，', '万条垂下绿丝绦。', '不知细叶谁裁出，', '二月春风似剪刀。'],
    pinyin: [
      'bì yù zhuāng chéng yī shù gāo',
      'wàn tiáo chuí xià lǜ sī tāo',
      'bù zhī xì yè shuí cái chū',
      'èr yuè chūn fēng sì jiǎn dāo'
    ],
    translation: '春天的柳树仿佛用碧玉装扮起来的，千条万缕的柳条像丝带一样低垂着，不知道这细细的柳叶是谁剪出来的，原来二月的春风就是裁剪出这些嫩叶的剪刀。',
    annotation: '碧玉：绿色的玉，比喻柳树的嫩绿。妆成：装扮成。丝绦：丝编的带子。裁：剪裁。',
    appreciation: '前两句把柳树写成美人，后两句忽然设问又自答。把春风比作剪刀，是唐诗里最著名的一个比喻。'
  },
  {
    id: 'p020',
    audioUrl: 'cloud://yunkaifa-d3ggyio111d28205c.7975-yunkaifa-d3ggyio111d28205c-1336180871/audio/audio-p020.m4a',
    title: '杂诗',
    titlePinyin: 'zá shī',
    author: '王维',
    authorPinyin: 'wáng wéi',
    dynasty: '唐',
    genre: '唐诗',
    stage: '小学',
    img: '',
    lines: ['君自故乡来，', '应知故乡事。', '来日绮窗前，', '寒梅著花未？'],
    pinyin: [
      'jūn zì gù xiāng lái',
      'yīng zhī gù xiāng shì',
      'lái rì qǐ chuāng qián',
      'hán méi zhuó huā wèi'
    ],
    translation: '你从故乡来，应该知道故乡的事情，请告诉我你来的时候，我窗前的梅花树已经开花了吗？',
    annotation: '来日：来的时候。绮窗：雕花的窗户。著花：开花，「著」读 zhuó。未：用在句末表示疑问。',
    appreciation: '想问的何止千言万语，最终只问出一株梅花。相思越深，越说不出口——这正是王维的含蓄。'
  },
  {
    id: 'p021',
    audioUrl: 'cloud://yunkaifa-d3ggyio111d28205c.7975-yunkaifa-d3ggyio111d28205c-1336180871/audio/audio-p021.m4a',
    title: '画',
    titlePinyin: 'huà',
    author: '王维',
    authorPinyin: 'wáng wéi',
    dynasty: '唐',
    genre: '唐诗',
    stage: '小学',
    img: '',
    lines: ['远看山有色，', '近听水无声。', '春去花还在，', '人来鸟不惊。'],
    pinyin: [
      'yuǎn kàn shān yǒu sè',
      'jìn tīng shuǐ wú shēng',
      'chūn qù huā hái zài',
      'rén lái niǎo bù jīng'
    ],
    translation: '远远看去，一座座青色的山峰连绵起伏，走到近处，却听不到流水从山上冲下来的哗哗声。春天早已经过去了，那些花儿仍然盛开着，枝头的鸟，就算人靠近了，也没有丝毫的惊慌。',
    annotation: '色：颜色。惊：受惊飞走。此诗一作「赞画」，旧题王维作。',
    appreciation: '四句四组矛盾：有色无声、花在春去、鸟不惊人。谜底是「画」，却偏不点破，读到最后才恍然。'
  },
  {
    id: 'p022',
    audioUrl: 'cloud://yunkaifa-d3ggyio111d28205c.7975-yunkaifa-d3ggyio111d28205c-1336180871/audio/audio-p022.m4a',
    title: '芙蓉楼送辛渐',
    titlePinyin: 'fú róng lóu sòng xīn jiàn',
    author: '王昌龄',
    authorPinyin: 'wáng chāng líng',
    dynasty: '唐',
    genre: '唐诗',
    stage: '小学',
    img: '',
    lines: ['寒雨连江夜入吴，', '平明送客楚山孤。', '洛阳亲友如相问，', '一片冰心在玉壶。'],
    pinyin: [
      'hán yǔ lián jiāng yè rù wú',
      'píng míng sòng kè chǔ shān gū',
      'luò yáng qīn yǒu rú xiāng wèn',
      'yī piàn bīng xīn zài yù hú'
    ],
    translation: '迷蒙的烟雨与浩渺的江水连成一片，在夜色中笼罩着。吴地清晨送你启程，自己面对楚山更觉孤独。远在洛阳的亲友如果问起我，你就说我的心依然如冰心玉壶般洁白纯净。',
    annotation: '芙蓉楼：在今江苏镇江。辛渐：王昌龄的朋友。平明：天亮时。吴：泛指今江苏一带。冰心玉壶：比喻心地纯洁、品格高洁。',
    appreciation: '前两句写送别的寒意与孤独，后两句忽然一转，变成对自己的表白。「一片冰心在玉壶」是信念，也是对谤言的回答。'
  },
  {
    id: 'p023',
    audioUrl: 'cloud://yunkaifa-d3ggyio111d28205c.7975-yunkaifa-d3ggyio111d28205c-1336180871/audio/audio-p023.m4a',
    title: '乌衣巷',
    titlePinyin: 'wū yī xiàng',
    author: '刘禹锡',
    authorPinyin: 'liú yǔ xī',
    dynasty: '唐',
    genre: '唐诗',
    stage: '初中',
    img: '',
    lines: ['朱雀桥边野草花，', '乌衣巷口夕阳斜。', '旧时王谢堂前燕，', '飞入寻常百姓家。'],
    pinyin: [
      'zhū què qiáo biān yě cǎo huā',
      'wū yī xiàng kǒu xī yáng xié',
      'jiù shí wáng xiè táng qián yàn',
      'fēi rù xún cháng bǎi xìng jiā'
    ],
    translation: '朱雀桥边长满了野草和野花。乌衣巷口的夕阳缓缓西下，那些昔日常出没于富贵人家的燕子，如今都飞进了普通百姓的家里。',
    annotation: '乌衣巷：在今南京，东晋时王导、谢安等大族聚居于此。朱雀桥：秦淮河上的浮桥。王谢：王导与谢安，代指东晋豪门。寻常：平常。',
    appreciation: '全诗只写野草、夕阳和一只燕子，却把六朝豪门的兴衰写尽。燕子不认门第，历史却认得。'
  },
  {
    id: 'p024',
    audioUrl: 'cloud://yunkaifa-d3ggyio111d28205c.7975-yunkaifa-d3ggyio111d28205c-1336180871/audio/audio-p024.m4a',
    title: '暮江吟',
    titlePinyin: 'mù jiāng yín',
    author: '白居易',
    authorPinyin: 'bái jū yì',
    dynasty: '唐',
    genre: '唐诗',
    stage: '小学',
    img: '',
    lines: ['一道残阳铺水中，', '半江瑟瑟半江红。', '可怜九月初三夜，', '露似真珠月似弓。'],
    pinyin: [
      'yī dào cán yáng pū shuǐ zhōng',
      'bàn jiāng sè sè bàn jiāng hóng',
      'kě lián jiǔ yuè chū sān yè',
      'lù sì zhēn zhū yuè sì gōng'
    ],
    translation: '夕阳斜照在江面上，江水的半边为青绿色，半边泛出橙红色。九月初三这个夜晚，真是令人陶醉，露水像圆润的珍珠，天上的新月像弯弯的弓。',
    annotation: '暮江：傍晚的江面。瑟瑟：碧绿色，一说形容风声。可怜：可爱。真珠：珍珠。',
    appreciation: '「铺」字写出斜阳贴着水面的样子，「半江瑟瑟半江红」是一句里的两种颜色。从黄昏到入夜，光与露都在变。'
  },
  {
    id: 'p025',
    audioUrl: 'cloud://yunkaifa-d3ggyio111d28205c.7975-yunkaifa-d3ggyio111d28205c-1336180871/audio/audio-p025.m4a',
    title: '枫桥夜泊',
    titlePinyin: 'fēng qiáo yè bó',
    author: '张继',
    authorPinyin: 'zhāng jì',
    dynasty: '唐',
    genre: '唐诗',
    stage: '小学',
    img: '',
    lines: ['月落乌啼霜满天，', '江枫渔火对愁眠。', '姑苏城外寒山寺，', '夜半钟声到客船。'],
    pinyin: [
      'yuè luò wū tí shuāng mǎn tiān',
      'jiāng fēng yú huǒ duì chóu mián',
      'gū sū chéng wài hán shān sì',
      'yè bàn zhōng shēng dào kè chuán'
    ],
    translation: '客船月亮落下了树梢，乌鸦啼叫着，天空布满了寒霜。看着江边的枫树和渔火，我愁闷得难以入睡。好不容易睡去，又被姑苏城外寒山寺的钟声惊醒。',
    annotation: '枫桥：在今江苏苏州。乌啼：乌鸦啼叫。渔火：渔船上的灯火。姑苏：苏州的别称。寒山寺：苏州名寺。',
    appreciation: '前两句全是眼中景，后两句忽然加入一声钟。声音一响，愁绪就有了形状，也让这首诗成了一千多年的「失眠名篇」。'
  },
  {
    id: 'p026',
    audioUrl: 'cloud://yunkaifa-d3ggyio111d28205c.7975-yunkaifa-d3ggyio111d28205c-1336180871/audio/audio-p026.m4a',
    title: '江南春',
    titlePinyin: 'jiāng nán chūn',
    author: '杜牧',
    authorPinyin: 'dù mù',
    dynasty: '唐',
    genre: '唐诗',
    stage: '小学',
    img: '',
    lines: ['千里莺啼绿映红，', '水村山郭酒旗风。', '南朝四百八十寺，', '多少楼台烟雨中。'],
    pinyin: [
      'qiān lǐ yīng tí lǜ yìng hóng',
      'shuǐ cūn shān guō jiǔ qí fēng',
      'nán cháo sì bǎi bā shí sì',
      'duō shǎo lóu tái yān yǔ zhōng'
    ],
    translation: '江南大地，鸟啼声声，绿草红花相映，远处是傍山的村庄，依山的城郭，迎风招展的酒旗，南朝遗留下的几百座古寺都弥漫在烟雨之中，时隐时现。',
    annotation: '郭：外城，这里指城镇。酒旗：酒家挂出的招牌旗。南朝：宋、齐、梁、陈四朝。四百八十寺：虚指，极言寺庙之多。',
    appreciation: '前两句写尽江南春天的明丽，后两句忽然拉远，落到烟雨里的南朝旧寺。美景未变，朝代已换，是全诗最沉的一笔。'
  },
  {
    id: 'p027',
    audioUrl: 'cloud://yunkaifa-d3ggyio111d28205c.7975-yunkaifa-d3ggyio111d28205c-1336180871/audio/audio-p027.m4a',
    title: '大林寺桃花',
    titlePinyin: 'dà lín sì táo huā',
    author: '白居易',
    authorPinyin: 'bái jū yì',
    dynasty: '唐',
    genre: '唐诗',
    stage: '小学',
    img: '',
    lines: ['人间四月芳菲尽，', '山寺桃花始盛开。', '长恨春归无觅处，', '不知转入此中来。'],
    pinyin: [
      'rén jiān sì yuè fāng fēi jìn',
      'shān sì táo huā shǐ shèng kāi',
      'cháng hèn chūn guī wú mì chù',
      'bù zhī zhuǎn rù cǐ zhōng lái'
    ],
    translation: '四月里花儿都开过了，而大林寺的桃花才刚刚盛开。人们常常怨恨，无处寻觅春光。却不知道，春光躲到这高山古寺中来了。',
    annotation: '大林寺：在庐山。芳菲：花草的芳香，代指花。尽：完了。始：才。长恨：常常遗憾。觅：寻找。',
    appreciation: '「长恨春归无觅处，不知转入此中来」表面写游山，也像在说：以为失去的东西，也许只是换了地方。'
  },
  {
    id: 'p028',
    audioUrl: 'cloud://yunkaifa-d3ggyio111d28205c.7975-yunkaifa-d3ggyio111d28205c-1336180871/audio/audio-p028.m4a',
    title: '回乡偶书',
    titlePinyin: 'huí xiāng ǒu shū',
    author: '贺知章',
    authorPinyin: 'hè zhī zhāng',
    dynasty: '唐',
    genre: '唐诗',
    stage: '小学',
    img: '',
    lines: ['少小离家老大回，', '乡音无改鬓毛衰。', '儿童相见不相识，', '笑问客从何处来。'],
    pinyin: [
      'shào xiǎo lí jiā lǎo dà huí',
      'xiāng yīn wú gǎi bìn máo cuī',
      'ér tóng xiāng jiàn bù xiāng shí',
      'xiào wèn kè cóng hé chù lái'
    ],
    translation: '年轻的时候就离开了家乡，年老了才回来。 虽然家乡的口音还没有改变，可是两鬓的头发已经变白了。家乡的小孩子都不认识我了，他们笑着问我是从哪里来的？',
    annotation: '偶书：随意写下。少小：年轻的时候。乡音：家乡口音。鬓毛衰：鬓发疏落变白，「衰」此处读 cuī。不相识：不认识我。',
    appreciation: '一个「笑问」，把几十年的光阴轻描淡写地放过去。越是不动声色，越让人心里发酸。'
  },
  {
    id: 'p029',
    audioUrl: 'cloud://yunkaifa-d3ggyio111d28205c.7975-yunkaifa-d3ggyio111d28205c-1336180871/audio/audio-p029.m4a',
    title: '游子吟',
    titlePinyin: 'yóu zǐ yín',
    author: '孟郊',
    authorPinyin: 'mèng jiāo',
    dynasty: '唐',
    genre: '唐诗',
    stage: '小学',
    img: '',
    lines: ['慈母手中线，', '游子身上衣。', '临行密密缝，', '意恐迟迟归。', '谁言寸草心，', '报得三春晖。'],
    pinyin: [
      'cí mǔ shǒu zhōng xiàn',
      'yóu zǐ shēn shàng yī',
      'lín xíng mì mì féng',
      'yì kǒng chí chí guī',
      'shuí yán cùn cǎo xīn',
      'bào dé sān chūn huī'
    ],
    translation: '慈祥的妈妈手里拿着针线，为将要远行的孩子赶制新衣。妈妈一针针缝的又细又密，担心孩子出门后很久才会回来，就像小草无法报答春天的阳光一样，孩子也无法报答妈妈的爱。',
    annotation: '游子：离家在外的人。临行：将要出发时。意恐：心里担心。寸草心：小草嫩心，比喻儿女微薄的孝心。三春晖：春天三月的阳光，比喻母爱。',
    appreciation: '全诗不写眼泪，只写「密密缝」的手。末两句用「寸草」与「春晖」作比，把报答不了的愧疚说得人人点头。'
  },
  {
    id: 'p030',
    audioUrl: 'cloud://yunkaifa-d3ggyio111d28205c.7975-yunkaifa-d3ggyio111d28205c-1336180871/audio/audio-p030.m4a',
    title: '赋得古原草送别',
    titlePinyin: 'fù dé gǔ yuán cǎo sòng bié',
    author: '白居易',
    authorPinyin: 'bái jū yì',
    dynasty: '唐',
    genre: '唐诗',
    stage: '小学',
    img: '',
    lines: [
      '离离原上草，',
      '一岁一枯荣。',
      '野火烧不尽，',
      '春风吹又生。',
      '远芳侵古道，',
      '晴翠接荒城。',
      '又送王孙去，',
      '萋萋满别情。'
    ],
    pinyin: [
      'lí lí yuán shàng cǎo',
      'yī suì yī kū róng',
      'yě huǒ shāo bú jìn',
      'chūn fēng chuī yòu shēng',
      'yuǎn fāng qīn gǔ dào',
      'qíng cuì jiē huāng chéng',
      'yòu sòng wáng sūn qù',
      'qī qī mǎn bié qíng'
    ],
    translation: '草原上的野草每到秋天就枯黄了，可到了春天又会茂盛起来，野火是烧不尽它们的。春风吹来，它们又会冒出新芽。',
    annotation: '赋得：按指定题目作诗，此诗为应试习作。离离：茂盛的样子。枯荣：枯萎与茂盛。远芳：蔓延远方的草香。晴翠：晴光照耀下的翠绿。王孙：这里指远行的朋友。萋萋：草茂盛的样子。',
    appreciation: '「野火烧不尽，春风吹又生」早已跳出送别诗，成了形容生命力的话。前四句写草，后四句才落到人，草越长，别情越重。'
  },
  {
    id: 'p031',
    audioUrl: 'cloud://yunkaifa-d3ggyio111d28205c.7975-yunkaifa-d3ggyio111d28205c-1336180871/audio/audio-p031.m4a',
    title: '赠花卿',
    titlePinyin: 'zèng huā qīng',
    author: '杜甫',
    authorPinyin: 'dù fǔ',
    dynasty: '唐',
    genre: '唐诗',
    stage: '小学',
    img: '',
    lines: ['锦城丝管日纷纷，', '半入江风半入云。', '此曲只应天上有，', '人间能得几回闻。'],
    pinyin: [
      'jǐn chéng sī guǎn rì fēn fēn',
      'bàn rù jiāng fēng bàn rù yún',
      'cǐ qǔ zhǐ yīng tiān shàng yǒu',
      'rén jiān néng dé jǐ huí wén'
    ],
    translation: '锦官城里的乐声每天都纷纷扬扬的，一半被江水吹散，一半飘入云层。这种美妙的乐曲声只该天上才有，世间的平民百姓能听到几回？',
    annotation: '花卿：花敬定，成都府将领。锦城：成都的别称。丝管：弦乐与管乐，泛指音乐。几回闻：能听到几回。',
    appreciation: '字面全是赞美，细读却有讽意——「只应天上有」暗示花卿僭越了本不该他享用的排场。杜甫的含蓄，正在这半句夸奖里。'
  },
  {
    id: 'p032',
    audioUrl: 'cloud://yunkaifa-d3ggyio111d28205c.7975-yunkaifa-d3ggyio111d28205c-1336180871/audio/audio-p032.m4a',
    title: '九月九日忆山东兄弟',
    titlePinyin: 'jiǔ yuè jiǔ rì yì shān dōng xiōng dì',
    author: '王维',
    authorPinyin: 'wáng wéi',
    dynasty: '唐',
    genre: '唐诗',
    stage: '小学',
    img: '',
    lines: ['独在异乡为异客，', '每逢佳节倍思亲。', '遥知兄弟登高处，', '遍插茱萸少一人。'],
    pinyin: [
      'dú zài yì xiāng wéi yì kè',
      'měi féng jiā jié bèi sī qīn',
      'yáo zhī xiōng dì dēng gāo chù',
      'biàn chā zhū yú shǎo yī rén'
    ],
    translation: '我独自一个人在外地，很孤单，每当节日的时候，我就更加想念亲人。今天是重阳节，兄弟们都带着茱萸登上了高处，却少了我一个人。',
    annotation: '九月九日：重阳节。山东：指华山以东，王维的家乡。异乡：他乡。佳节：美好的节日。茱萸：一种有浓香的植物，重阳节有插戴的习俗。',
    appreciation: '前两句直说思亲，后两句忽然换了镜头——不写自己如何想家，而写家里少了「一人」。这一转，比直说更疼。'
  },
  {
    id: 'p033',
    audioUrl: 'cloud://yunkaifa-d3ggyio111d28205c.7975-yunkaifa-d3ggyio111d28205c-1336180871/audio/audio-p033.m4a',
    title: '送元二使安西',
    titlePinyin: 'sòng yuán èr shǐ ān xī',
    author: '王维',
    authorPinyin: 'wáng wéi',
    dynasty: '唐',
    genre: '唐诗',
    stage: '小学',
    img: '',
    lines: ['渭城朝雨浥轻尘，', '客舍青青柳色新。', '劝君更尽一杯酒，', '西出阳关无故人。'],
    pinyin: [
      'wèi chéng zhāo yǔ yì qīng chén',
      'kè shè qīng qīng liǔ sè xīn',
      'quàn jūn gèng jìn yī bēi jiǔ',
      'xī chū yáng guān wú gù rén'
    ],
    translation: '渭城的清晨下了一场小雨，打湿了地上的尘土，旅店旁边的柳树一片青翠。劝好友再喝一杯离别的酒吧，因为向西，出了阳关就很难见到老朋友了。',
    annotation: '元二：作者的朋友。安西：安西都护府，在今新疆。渭城：在今陕西咸阳。浥：湿润。客舍：旅店。阳关：在今甘肃敦煌西南，是通往西域的要道。',
    appreciation: '前两句把离别写得很干净：雨洗过尘，柳色一新。正因为景太清爽，第三句「更尽一杯酒」才显得格外沉。'
  },
  {
    id: 'p034',
    audioUrl: 'cloud://yunkaifa-d3ggyio111d28205c.7975-yunkaifa-d3ggyio111d28205c-1336180871/audio/audio-p034.m4a',
    title: '山行',
    titlePinyin: 'shān xíng',
    author: '杜牧',
    authorPinyin: 'dù mù',
    dynasty: '唐',
    genre: '唐诗',
    stage: '小学',
    img: '',
    lines: ['远上寒山石径斜，', '白云生处有人家。', '停车坐爱枫林晚，', '霜叶红于二月花。'],
    pinyin: [
      'yuǎn shàng hán shān shí jìng xié',
      'bái yún shēng chù yǒu rén jiā',
      'tíng chē zuò ài fēng lín wǎn',
      'shuāng yè hóng yú èr yuè huā'
    ],
    translation: '一条弯弯的小路伸向山顶，在山上白云漂浮的地方，隐约能看见住着的人家停下车来，只因喜爱傍晚的枫林，看被霜打过的枫叶，竟比二月的鲜花还要红艳。',
    annotation: '山行：在山中行走。石径：石头小路。斜：倾斜。坐：因为。霜叶：经霜变红的枫叶。',
    appreciation: '「白云生处有人家」是一句惊喜，把寒山写得有人烟。末句用春花比霜叶，反着写，反而把秋天写得更热烈。'
  },
  {
    id: 'p035',
    audioUrl: 'cloud://yunkaifa-d3ggyio111d28205c.7975-yunkaifa-d3ggyio111d28205c-1336180871/audio/audio-p035.m4a',
    title: '清明',
    titlePinyin: 'qīng míng',
    author: '杜牧',
    authorPinyin: 'dù mù',
    dynasty: '唐',
    genre: '唐诗',
    stage: '小学',
    img: '',
    lines: ['清明时节雨纷纷，', '路上行人欲断魂。', '借问酒家何处有，', '牧童遥指杏花村。'],
    pinyin: [
      'qīng míng shí jié yǔ fēn fēn',
      'lù shàng xíng rén yù duàn hún',
      'jiè wèn jiǔ jiā hé chù yǒu',
      'mù tóng yáo zhǐ xìng huā cūn'
    ],
    translation: '清明节的时候，雨下个不停，路上的行人都十分伤心，我想打听一下哪里有避雨歇脚的小酒店？一个放牛娃伸手指向远处的杏花盛开的村子。',
    annotation: '清明：二十四节气之一，也是扫墓祭祖的节日。欲断魂：形容极度伤心。借问：请问。杏花村：杏花深处的村庄。',
    appreciation: '前三句又冷又愁，末句一个「遥指」，画面忽然亮起来。愁绪没有被解决，但有了去处，这便是诗的余味。'
  },
  {
    id: 'p036',
    audioUrl: 'cloud://yunkaifa-d3ggyio111d28205c.7975-yunkaifa-d3ggyio111d28205c-1336180871/audio/audio-p036.m4a',
    title: '出塞',
    titlePinyin: 'chū sài',
    author: '王昌龄',
    authorPinyin: 'wáng chāng líng',
    dynasty: '唐',
    genre: '唐诗',
    stage: '初中',
    img: '',
    lines: ['秦时明月汉时关，', '万里长征人未还。', '但使龙城飞将在，', '不教胡马度阴山。'],
    pinyin: [
      'qín shí míng yuè hàn shí guān',
      'wàn lǐ cháng zhēng rén wèi huán',
      'dàn shǐ lóng chéng fēi jiàng zài',
      'bú jiào hú mǎ dù yīn shān'
    ],
    translation: '阴山依旧是秦汉时的明月和秦汉时的边关，一直征战远方的战士还没有回来，要是还有飞将军李广那样的人守卫边塞，就不会让匈奴南下侵犯中原了。',
    annotation: '出塞：乐府旧题。但使：只要。龙城飞将：指汉代名将李广，一说指卫青，「将」此处读 jiàng。不教：不让。胡马：指敌方骑兵。阴山：在今内蒙古，是北方屏障。',
    appreciation: '首句把「秦」「汉」交错嵌进明月与关塞，一句就写出一千年。后两句既是呼唤良将，也是对现实的无奈。'
  },
  {
    id: 'p037',
    audioUrl: 'cloud://yunkaifa-d3ggyio111d28205c.7975-yunkaifa-d3ggyio111d28205c-1336180871/audio/audio-p037.m4a',
    title: '黄鹤楼送孟浩然之广陵',
    titlePinyin: 'huáng hè lóu sòng mèng hào rán zhī guǎng líng',
    author: '李白',
    authorPinyin: 'lǐ bái',
    dynasty: '唐',
    genre: '唐诗',
    stage: '小学',
    img: '',
    lines: ['故人西辞黄鹤楼，', '烟花三月下扬州。', '孤帆远影碧空尽，', '唯见长江天际流。'],
    pinyin: [
      'gù rén xī cí huáng hè lóu',
      'yān huā sān yuè xià yáng zhōu',
      'gū fān yuǎn yǐng bì kōng jìn',
      'wéi jiàn cháng jiāng tiān jì liú'
    ],
    translation: '老朋友在黄鹤楼与我告别，阳春三月的时候去了扬州，他乘坐的小船行驶得越来越远，直到看不见，眼前只有滚滚的长江水向东流去。',
    annotation: '黄鹤楼：在今湖北武汉。之：往，去。广陵：今江苏扬州。故人：老朋友。烟花：形容春天繁花似锦的景色。唯见：只看见。天际：天边。',
    appreciation: '全诗不写一个「愁」字。船已不见，只剩江水无尽——把送别后的怅然全放进那一片空白里。'
  },
  {
    id: 'p038',
    audioUrl: 'cloud://yunkaifa-d3ggyio111d28205c.7975-yunkaifa-d3ggyio111d28205c-1336180871/audio/audio-p038.m4a',
    title: '赠汪伦',
    titlePinyin: 'zèng wāng lún',
    author: '李白',
    authorPinyin: 'lǐ bái',
    dynasty: '唐',
    genre: '唐诗',
    stage: '小学',
    img: '',
    lines: ['李白乘舟将欲行，', '忽闻岸上踏歌声。', '桃花潭水深千尺，', '不及汪伦送我情。'],
    pinyin: [
      'lǐ bái chéng zhōu jiāng yù xíng',
      'hū wén àn shàng tà gē shēng',
      'táo huā tán shuǐ shēn qiān chǐ',
      'bù jí wāng lún sòng wǒ qíng'
    ],
    translation: '李白坐上小船正要启程离开，忽然听到岸上传来汪伦边用脚打拍子边唱歌的声音。就算桃花潭的水深达千尺，也完全比不上汪伦前来送行所承载的深厚情谊。',
    annotation: '汪伦：李白的朋友。将欲行：将要出发。踏歌：用脚打着节拍唱歌。桃花潭：在今安徽泾县。不及：比不上。',
    appreciation: '用「深千尺」的水来量情，是全诗最直白的比喻，却因坦率而动人。李白把自己的名字写进诗里，也把朋友的名字留下了。'
  },
  {
    id: 'p039',
    audioUrl: 'cloud://yunkaifa-d3ggyio111d28205c.7975-yunkaifa-d3ggyio111d28205c-1336180871/audio/audio-p039.m4a',
    title: '早发白帝城',
    titlePinyin: 'zǎo fā bái dì chéng',
    author: '李白',
    authorPinyin: 'lǐ bái',
    dynasty: '唐',
    genre: '唐诗',
    stage: '小学',
    img: '',
    lines: ['朝辞白帝彩云间，', '千里江陵一日还。', '两岸猿声啼不住，', '轻舟已过万重山。'],
    pinyin: [
      'zhāo cí bái dì cǎi yún jiān',
      'qiān lǐ jiāng líng yī rì huán',
      'liǎng àn yuán shēng tí bú zhù',
      'qīng zhōu yǐ guò wàn chóng shān'
    ],
    translation: '早晨才辞别五彩云霞映照的白帝城，一天时间就回到了千里之遥的江陵，只听见两岸山间猿啼的声音连续不停，轻快的小船已经从崇山峻岭中的江面驶过了。',
    annotation: '白帝城：在今重庆奉节东。江陵：今湖北荆州。还：到达。啼不住：不停地叫。',
    appreciation: '李白遇赦东归，诗里全是轻快。空间上的「千里」「万重」与时间上的「一日」对撞，把顺流而下的速度感写到极致。'
  },
  {
    id: 'p040',
    audioUrl: 'cloud://yunkaifa-d3ggyio111d28205c.7975-yunkaifa-d3ggyio111d28205c-1336180871/audio/audio-p040.m4a',
    title: '绝句',
    titlePinyin: 'jué jù',
    author: '杜甫',
    authorPinyin: 'dù fǔ',
    dynasty: '唐',
    genre: '唐诗',
    stage: '小学',
    img: '',
    lines: ['两个黄鹂鸣翠柳，', '一行白鹭上青天。', '窗含西岭千秋雪，', '门泊东吴万里船。'],
    pinyin: [
      'liǎng gè huáng lí míng cuì liǔ',
      'yī háng bái lù shàng qīng tiān',
      'chuāng hán xī lǐng qiān qiū xuě',
      'mén bó dōng wú wàn lǐ chuán'
    ],
    translation: '两只黄鹂在柳枝上鸣叫，一行白鹭飞上了蓝天，从窗子里可以看到连绵的雪山，门外的江面上停泊着万里赴吴的大船。',
    annotation: '黄鹂：一种黄色的鸟。西岭：西岭雪山。泊：停船。',
    appreciation: '四句四景，一句一色：黄、翠、白、青。对仗极工却不显板滞，是杜诗里难得的轻快之作。'
  }
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
