const db = require('../../utils/db.js');
const { POEMS } = require('../../data/poems.js');
const { getAudioPlayer } = require('../../utils/audio.js');

Page({
  data: {
    dailyPoem: {},
    categories: [
      { name: '诗词学习', action: 'poem', color: '#e4eaf0', icon: '/assets/figma-home/icon-6.svg' },
      { name: '记忆训练', action: 'recite', color: '#f0e8e4', icon: '/assets/figma-home/icon-10.svg' },
      { name: '诗词库', action: 'browse', color: '#edf0de', icon: '/assets/figma-home/icon-2.svg' },
      { name: '学习计划', action: 'learn', color: '#ede8f0', icon: '/assets/figma-home/icon-1.svg' }
    ],
    resume: {
      id: '',
      mark: '诗',
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
        mark: target.title.charAt(0),
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
      wx.navigateTo({ url: '/pages/recite/recite?id=' + this.data.dailyPoem.id + '&type=recite' });
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
    // expand：页面里点播放是用户主动发起，播放器要展开到台前给人看，
    // 不能只缩在右边缘（那样点了没反馈，无法暂停/切歌/看进度）
    if (this.player.getCurrentId() === id) {
      this.player.toggle(id, { expand: true });
    } else {
      this.player.play(id, { expand: true });
    }
  }
});
