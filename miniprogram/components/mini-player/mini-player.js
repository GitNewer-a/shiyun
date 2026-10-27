const { getAudioPlayer, playableIds } = require('../../utils/audio.js');
const { POEMS } = require('../../data/poems.js');

const LOOP_TEXT = { single: '单曲', order: '顺序', random: '随机' };
const LOOP_MODE = ['single', 'order', 'random'];
const LOOP_TOAST = { single: '单曲循环', order: '顺序播放', random: '随机播放' };

/* ---------- 触发器几何（rpx，与 wxss 的取值保持一致；改动请同步） ---------- */
const TAB_BODY_W = 80;    // 可见宽度
const TAB_PAD_X = 16;     // 朝页面内侧的不可见热区（撑到 96rpx ≥ 44px 触控下限）
const TAB_BODY_H = 132;   // 可见高度
const TAB_PAD_Y = 18;     // 上下不可见热区
const EDGE_RPX = 14;      // 停靠时与上下边缘的留白
const DRAG_SLOP = 6;      // 判定「拖动」而非「点击」的位移阈值（px）
const DOCK_KEY = 'miniPlayerDock';   // 停靠位置落本地：{ side, ratio }

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
    // 首帧「为动画预热」期间临时藏起触发器，见 _applyState 里的两帧说明
    suppressTab: false,
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
    bottom: 24,
    // 收起态触发器：可拖拽，停靠在左/右侧边
    dragging: false,
    dockSide: 'right',
    tabLeft: 0,
    tabTop: 0
  },

  lifetimes: {
    attached() {
      this._alive = true;
      this._onPage = false;
      this._offs = [];
      try {
        this.player = getAudioPlayer();
      } catch (e) {
        this.player = null;
        return;
      }
      this._layout();
      this._loadDock();
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
      this._alive = false;
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
      // 停靠位置存在本地：别的页面拖过之后，这一页显示时要跟上
      this._loadDock();
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

    /**
     * 量一次屏幕：算出底部面板的底距，以及触发器的可拖拽范围。
     * 纵向范围用 windowHeight（可使用窗口高度）兜住，触发器最远只能停在这个区域里，
     * 所以任何情况下都不会被拖到屏幕外找不回来。
     */
    _layout() {
      let winW = 375, winH = 667, insetB = 0;
      try {
        const info = wx.getSystemInfoSync();
        winW = info.windowWidth || info.screenWidth || 375;
        winH = info.windowHeight || info.screenHeight || 667;
        insetB = (info.safeAreaInsets && info.safeAreaInsets.bottom) || 0;
      } catch (e) {}

      const rpx = winW / 750;
      const elemW = (TAB_BODY_W + TAB_PAD_X) * rpx;
      const elemH = (TAB_BODY_H + TAB_PAD_Y * 2) * rpx;
      const minTop = EDGE_RPX * rpx;
      const maxTop = Math.max(minTop, winH - elemH - EDGE_RPX * rpx - insetB);
      this._geo = { winW: winW, elemW: elemW, elemH: elemH, minTop: minTop, maxTop: maxTop };

      // tabBar 固定 50px ≈ 100rpx，另有 16rpx 间距
      const base = this.data.hasTabBar ? 116 : 24;
      this.setData({ bottom: base + Math.round((insetB / winW) * 750) });
    },

    /** 按「吸附到哪一侧 + 纵向比例」给触发器落位（ratio 0..1 对应可拖范围两端） */
    _place(side, ratio) {
      if (!this._geo) this._layout();
      const g = this._geo;
      const r = Math.max(0, Math.min(1, ratio));
      this.setData({
        dockSide: side === 'left' ? 'left' : 'right',
        tabLeft: Math.round(side === 'left' ? 0 : g.winW - g.elemW),
        tabTop: Math.round(g.minTop + (g.maxTop - g.minTop) * r)
      });
    },

    /** 恢复上次的停靠位置。纵向存的是比例而非 px，换机型/换屏高也不会跑到屏幕外 */
    _loadDock() {
      let d = null;
      try { d = wx.getStorageSync(DOCK_KEY); } catch (e) {}
      this._place(d && d.side, d && typeof d.ratio === 'number' ? d.ratio : 0.5);
    },

    _saveDock() {
      const g = this._geo;
      const span = g.maxTop - g.minTop;
      const ratio = span > 0 ? (this.data.tabTop - g.minTop) / span : 0.5;
      try {
        wx.setStorageSync(DOCK_KEY, { side: this.data.dockSide, ratio: Math.max(0, Math.min(1, ratio)) });
      } catch (e) {}
    },

    onTabTouchStart(e) {
      if (this.data.expanded) return;
      const t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
      if (!t) return;
      this._dragMoved = false;
      this._drag = { x: t.clientX, y: t.clientY, left: this.data.tabLeft, top: this.data.tabTop };
    },

    onTabTouchMove(e) {
      const d = this._drag;
      if (!d) return;
      const t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
      if (!t) return;
      const g = this._geo;
      let left = d.left + (t.clientX - d.x);
      let top = d.top + (t.clientY - d.y);

      // 位移不到阈值就还没算「拖动」，避免手指微抖就位移
      if (!this._dragMoved) {
        if (Math.abs(t.clientX - d.x) < DRAG_SLOP && Math.abs(t.clientY - d.y) < DRAG_SLOP) return;
        this._dragMoved = true;
      }

      // 横向允许自由跟手（能看见它在朝哪边去），纵向直接钳在可停范围内
      left = Math.max(0, Math.min(g.winW - g.elemW, left));
      top = Math.max(g.minTop, Math.min(g.maxTop, top));

      const patch = { dragging: true };
      if (Math.round(left) !== this.data.tabLeft) patch.tabLeft = Math.round(left);
      if (Math.round(top) !== this.data.tabTop) patch.tabTop = Math.round(top);
      // 越过中线就先把圆角/阴影方向翻过去，松手吸附时不会「先跳位再变形」
      const side = (left + g.elemW / 2) < g.winW / 2 ? 'left' : 'right';
      if (side !== this.data.dockSide) patch.dockSide = side;
      this.setData(patch);
    },

    onTabTouchEnd() {
      if (!this._drag) return;
      const moved = this._dragMoved;
      this._drag = null;
      // 没位移 = 一次点击，就在这里展开，不等 tap（原因见 _handleTap）
      if (!moved) {
        this.setData({ dragging: false });
        this._handleTap();
        return;
      }
      this._snap();
    },

    /**
     * 触摸被系统打断（手势被接管、来电等）。
     * 这种情况**不能**当成点击：手指只是想拖动却被系统抢走，不该把面板弹开。
     * 已经拖出位移的仍然吸附回侧边，位置不会卡在半路。
     */
    onTabTouchCancel() {
      if (!this._drag) return;
      const moved = this._dragMoved;
      this._drag = null;
      if (moved) this._snap();
      else if (this.data.dragging) this.setData({ dragging: false });
    },

    /**
     * 触发器的「点击」动作 —— 唯一的展开入口。
     *
     * ⚠️ 这里**不能只依赖 tap 事件**。为了拖拽，本节点用 catchtouchstart /
     * catchtouchmove / catchtouchend catch 掉了整条触摸流；在这种写法下，
     * 部分机型（尤其 iOS）不会再补发 tap，于是「收起之后就再也点不开」——
     * 而遮罩与面板里的按钮只挂了 catchtap，所以收得起、展不开。
     * 因此把 touchend 里「没有位移」的那一次直接当作点击处理，tap 只作兜底。
     */
    _handleTap() {
      if (!this.player || !this.data.visible) return;
      this._tapAt = Date.now();
      this.player.setExpanded(true);
      // 兜底：单例已是展开态而本地没跟上时，setExpanded 因「值没变」不会广播，
      // 这里直接把本地拉齐，避免出现「点了没反应」的死状态
      if (this.data.visible && this.player.getExpanded() && !this.data.expanded) {
        this.setData({ expanded: true });
      }
    },

    /** 松手：横向就近吸附到左/右侧边，纵向停在当前高度 */
    _snap() {
      const g = this._geo;
      const side = (this.data.tabLeft + g.elemW / 2) < g.winW / 2 ? 'left' : 'right';
      const top = Math.max(g.minTop, Math.min(g.maxTop, this.data.tabTop));
      const that = this;
      // 两帧：先把过渡恢复回来（此时位置没变，不会闪），下一帧再改坐标，
      // 保证吸附动画一定播得出来（同帧同时改 transition 与坐标，渲染器可能直接跳位）
      this.setData({ dragging: false }, function () {
        if (!that._alive) return;
        that._place(side, g.maxTop > g.minTop ? (top - g.minTop) / (g.maxTop - g.minTop) : 0.5);
        that._saveDock();
      });
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

      // 「从未显示 → 显示」且要展开：整棵子树是这一帧才被 wx:if 建出来的，
      // 直接带 is-open 渲染等于「新建即展开」，过渡动画不会播，会硬弹出来。
      // 先以收起态渲染一帧，再由 setData 回调翻到展开，上滑动画才走得完整。
      //
      // ⚠️ 这一帧必须把触发器也**藏起来**（suppressTab），否则它会先在屏幕边缘
      // 完整地闪一下、再动画滑出去 —— 用户看到的就是「缩进的悬浮条闪现又消失」。
      // 藏的方式是让容器永不显示（而不是改 transition），避免 CSS 隐式过渡把它也拖成一段淡出。
      if (patch.visible && !this.data.visible && patch.expanded) {
        patch.expanded = false;
        patch.suppressTab = true;
        const that = this;
        this.setData(patch, function () {
          if (!that._alive) return;
          that.setData({ expanded: true, suppressTab: false });
        });
        return;
      }

      this.setData(patch);
    },

    onToggle() {
      if (!this.player) return;
      this.player.toggle(this.data.poemId);
    },

    onExpand() {
      // 刚拖动过就别当成点击：部分机型在 catchtouchmove 之后仍会补一个 tap
      if (this._dragMoved) return;
      // touchend 已经处理过这次点击，同一次手势内不重复触发
      if (Date.now() - (this._tapAt || 0) < 400) return;
      this._handleTap();
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
          // ⚠️ e.detail.x 是页面坐标，必须减去进度条左边缘，否则点击位置整体偏移
          // （面板有内边距，偏移能有 5% 上下 —— 听感就是「跳到了别处」）。
          const x = (e.detail && e.detail.x) || 0;
          const pct = Math.max(0, Math.min(100, ((x - rect.left) / rect.width) * 100));
          that.player.seek(pct);
        })
        .exec();
    }
  }
});
