const db = require('../../utils/db.js');
const { POEMS } = require('../../data/poems.js');
const { getAudioPlayer } = require('../../utils/audio.js');

Page({
  data: {
    dailyPoem: {},
    categories: [
      // 图标槽底色收敛为「三墨蓝 + 一藤黄」，避免四色各自为政；
      // 仅「学习计划」保留暖色强调，与学习页的图标色系保持一致。
      // 图标本体也须用对应色版本（-ink 后缀）：<image> 引入的 SVG 不继承 color。
      { name: '诗词学习', action: 'poem', color: '#e6ecf1', icon: '/assets/figma-home/icon-6-ink.svg' },
      { name: '记忆训练', action: 'recite', color: '#e6ecf1', icon: '/assets/figma-home/icon-10-ink.svg' },
      { name: '诗词库', action: 'browse', color: '#e6ecf1', icon: '/assets/figma-home/icon-2-ink.svg' },
      { name: '学习计划', action: 'learn', color: '#f1e6d8', icon: '/assets/figma-home/icon-1-ink.svg' }
    ],
    resume: {
      id: '',
      title: '',
      author: '',
      dynasty: '',
      lesson: 5,
      progress: 0,
      tip: ''
    },
    hotList: [],
    playingId: ''
  },

  onShow() {
    this.renderDaily();
    this.renderResume();
    this.renderHot();
    this._syncPlayer();
  },

  // 不在这里暂停：切 tab / 进详情页都要能续播，由悬浮播放器接管控制

  onUnload() {
    // 播放器是全局单例，不销毁，避免切页丢播；只解绑首页自己的回调
    if (typeof this._playerSub === 'function') this._playerSub();
    this._playerSub = null;
  },

  /** 每日一诗：按日期取模，保证同一天不变 */
  renderDaily() {
    const day = Math.floor(Date.now() / 86400000);
    const poem = POEMS[day % POEMS.length];
    this.setData({ dailyPoem: poem });
  },

  renderResume() {
    const progress = db.getProgress();
    // 未开始时默认指向第一首，避免空态
    const target = POEMS[Math.min(progress.learned, POEMS.length - 1)];
    const remain = Math.max(POEMS.length - progress.learned, 0);
    this.setData({
      resume: {
        id: target.id,
        title: target.title,
        author: target.author,
        dynasty: target.dynasty,
        lesson: Math.min(progress.learned + 1, POEMS.length),
        progress: Math.round((progress.learned / POEMS.length) * 100),
        tip: remain > 0 ? `还有 ${remain} 首待学，今天继续吧` : '已学完当前全部诗词'
      }
    });
  },

  renderHot() {
    // 标准朗读：取有音频的诗词，播放次数为占位（接入云数据库后改实时）
    const plays = ['1.2万', '8,462'];
    const list = POEMS.filter(function (p) { return p.audioUrl; }).slice(0, 2).map(function (p, i) {
      return Object.assign({}, p, { plays: plays[i % plays.length] });
    });
    this.setData({ hotList: list });
  },

  _syncPlayer() {
    this.player = getAudioPlayer();
    if (!this._playerSub) {
      const that = this;
      this._playerSub = this.player.onState(function (data) {
        that.setData({ playingId: data.playing ? data.poemId : '' });
      });
    }
    // 恢复当前播放高亮
    this.setData({ playingId: this.player.isPlaying() ? this.player.getCurrentId() : '' });
  },

  goDaily() {
    wx.navigateTo({ url: '/pages/poem/poem?id=' + this.data.dailyPoem.id });
  },

  goResume() {
    wx.navigateTo({ url: '/pages/poem/poem?id=' + this.data.resume.id });
  },

  goPoem(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: '/pages/poem/poem?id=' + id });
  },

  goShortcut(e) {
    const action = e.currentTarget.dataset.action;
    if (action === 'poem') this.goDaily();
    else if (action === 'recite') {
      // 记忆训练不再是「直接进答题框」，先到入口页选题型与诗
      wx.navigateTo({ url: '/pages/memory/memory' });
    } else if (action === 'browse') {
      wx.switchTab({ url: '/pages/browse/browse' });
    } else if (action === 'learn') {
      wx.switchTab({ url: '/pages/learn/learn' });
    }
  },

  togglePlay(e) {
    const id = e.currentTarget.dataset.id;
    if (!id || !this.player.hasAudio(POEMS.find(function (p) { return p.id === id; }))) {
      wx.showToast({ title: '暂无标准朗读', icon: 'none', duration: 1200 });
      return;
    }
    /*
     * 这里**不再带 expand**（2026-10-26 改）。
     * 原先是 play(id, {expand:true})，起播后立刻把悬浮播放器面板掀起来 ——
     * 但「标准朗读」正好在首页底部，面板一展开就把刚点的那一行整个盖住，
     * 按钮从三角切成双竖条的过程压根看不见，看着就像「点了没反应」。
     * 现在改成原地播／停：按钮自己是完整的控制（点一下播、再点一下停），
     * 要看进度、切歌、拖进度条，点右侧边缘的唱片触发器展开面板即可。
     * 若想恢复「点了就弹面板」，把下面的调用改成带 { expand: true } 即可。
     */
    if (this.player.getCurrentId() === id) {
      this.player.toggle(id);
    } else {
      this.player.play(id);
    }
  }
});
