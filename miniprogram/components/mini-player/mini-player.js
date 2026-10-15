const { getAudioPlayer, playableIds } = require('../../utils/audio.js');
const { POEMS } = require('../../data/poems.js');

const LOOP_TEXT = { single: '单曲', order: '顺序', random: '随机' };
const LOOP_MODE = ['single', 'order', 'random'];
const LOOP_TOAST = { single: '单曲循环', order: '顺序播放', random: '随机播放' };

function fmt(sec) {
  sec = sec || 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
}

Component({
  properties: {
    // tabBar 页面要把悬浮条抬到导航上方，其余页面贴底即可
    hasTabBar: { type: Boolean, value: false }
  },

  data: {
    visible: false,
    expanded: false,
    playing: false,
    poemId: '',
    title: '',
    author: '',
    dynasty: '',
    progress: 0,
    timeText: '00:00',
    endText: '00:00',
    loopMode: 'single',
    loopText: '单曲',
    bottom: 24
  },

  lifetimes: {
    attached() {
      this._onPage = false;
      this._offs = [];
      try {
        this.player = getAudioPlayer();
      } catch (e) {
        this.player = null;
        return;
      }
      this._calcBottom();
      const that = this;
      this._offs.push(this.player.onState(function (s) { that._applyState(s); }));
      this._offs.push(this.player.onProgress(function (d) {
        if (!that._onPage) return;
        that.setData({
          progress: d.progress,
          timeText: fmt(d.time),
          endText: fmt(d.duration)
        });
      }));
      this._applyState({
        playing: this.player.isPlaying(),
        poemId: this.player.getCurrentId(),
        loopMode: this.player.getLoopMode(),
        expanded: this.player.getExpanded()
      });
    },

    detached() {
      (this._offs || []).forEach(function (off) {
        if (typeof off === 'function') off();
      });
      this._offs = [];
    }
  },

  // 所在页面显示时才刷新进度，避免后台页面白耗 setData
  pageLifetimes: {
    show() {
      this._onPage = true;
      if (!this.player) return;
      // 换页自动收起，不遮挡新页面内容
      this.player.setExpanded(false);
      this._applyState({
        playing: this.player.isPlaying(),
        poemId: this.player.getCurrentId(),
        loopMode: this.player.getLoopMode(),
        expanded: this.player.getExpanded()
      });
    },
    hide() {
      this._onPage = false;
    }
  },

  methods: {
    noop() {},

    _calcBottom() {
      let safeRpx = 0;
      try {
        const info = wx.getSystemInfoSync();
        const inset = info.safeAreaInsets ? info.safeAreaInsets.bottom : 0;
        safeRpx = Math.round((inset / info.screenWidth) * 750);
      } catch (e) {}
      // tabBar 固定 50px ≈ 100rpx，另有 16rpx 间距
      const base = this.data.hasTabBar ? 116 : 24;
      this.setData({ bottom: base + safeRpx });
    },

    _applyState(s) {
      const patch = {
        visible: this.player ? this.player.isActive() : false,
        playing: !!s.playing,
        expanded: !!s.expanded,
        loopMode: s.loopMode || 'single',
        loopText: LOOP_TEXT[s.loopMode] || '单曲'
      };
      if (s.poemId && s.poemId !== this.data.poemId) {
        const p = POEMS.find(function (x) { return x.id === s.poemId; });
        if (p) {
          patch.poemId = p.id;
          patch.title = p.title;
          patch.author = p.author;
          patch.dynasty = p.dynasty || '';
          patch.progress = 0;
          patch.timeText = '00:00';
          patch.endText = '00:00';
        }
      } else if (!s.poemId) {
        patch.poemId = '';
      }
      this.setData(patch);
    },

    onToggle() {
      if (!this.player) return;
      this.player.toggle(this.data.poemId);
    },

    onExpand() {
      if (this.player) this.player.setExpanded(true);
    },

    onCollapse() {
      if (this.player) this.player.setExpanded(false);
    },

    onClose() {
      if (this.player) this.player.close();
    },

    onGoPoem() {
      if (!this.data.poemId) return;
      wx.navigateTo({ url: '/pages/poem/poem?id=' + this.data.poemId });
    },

    onCycle() {
      if (!this.player) return;
      const cur = this.player.getLoopMode();
      const next = LOOP_MODE[(LOOP_MODE.indexOf(cur) + 1) % LOOP_MODE.length];
      this.player.setLoopMode(next);
      wx.showToast({ title: LOOP_TOAST[next], icon: 'none', duration: 800 });
      try {
        const s = wx.getStorageSync('settings') || {};
        wx.setStorageSync('settings', Object.assign(s, { loopMode: next }));
      } catch (e) {}
    },

    _step(dir) {
      if (!this.player || !this.data.poemId) return;
      const ids = playableIds();
      if (!ids.length) return;
      const loop = this.player.getLoopMode();
      if (loop === 'single') {
        this.player.seek(0);
        return;
      }
      const idx = ids.indexOf(this.data.poemId);
      let next;
      if (loop === 'order') next = (idx + dir + ids.length) % ids.length;
      else next = Math.floor(Math.random() * ids.length);
      this.player.play(ids[next]);
    },

    onPrev() { this._step(-1); },
    onNext() { this._step(1); },

    onSeek(e) {
      if (!this.player) return;
      const that = this;
      this.createSelectorQuery()
        .select('.mp-prog-wrap')
        .boundingClientRect(function (rect) {
          if (!rect || !rect.width) return;
          const x = (e.detail && e.detail.x) || 0;
          const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
          that.player.seek(pct);
        })
        .exec();
    }
  }
});
