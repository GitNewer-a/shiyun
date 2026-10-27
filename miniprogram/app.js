const audioSession = require('./utils/audio-session.js');

App({
  globalData: {
    openid: '',
    userInfo: null,
    cloudReady: false
  },

  onLaunch() {
    // ⚠️ 必须放在下面云开发检查之前：老基础库没有 wx.cloud 会直接 return，
    // 但朗读出声这件事跟云环境无关，不能被一起跳过。
    // 会话设置也必须早于任何 InnerAudioContext 创建（见 utils/audio-session.js）。
    audioSession.setup();

    if (!wx.cloud) {
      console.warn('[诗韵] 当前基础库版本过低，云开发不可用，已降级为本地数据');
      return;
    }

    // 环境 ID 不是密钥：它只是「连哪个库」的资源名，权限由 openid + 数据库安全规则决定。
    // 单环境阶段直接写死，出现 dev/prod 双环境时再抽到 config 里切换。
    wx.cloud.init({
      env: 'yunkaifa-d3ggyio111d28205c',
      traceUser: true
    });

    this.globalData.cloudReady = true;
    this.login();
  },

  /**
   * 切回前台补设一次音频会话。
   * 来电、被其他 app 抢走音频焦点、长时间后台，iOS 都可能把会话重置回默认类别，
   * 那时静音开关又会重新生效 —— 表现就是「刚才还能响，接了个电话就没声了」。
   * audio-session 内部有 800ms 节流，不会跟 onLaunch 连发两次。
   *
   * 顺带校正播放状态：锁屏上拖过进度条 / 按过暂停之后，那些操作不经过小程序代码，
   * 界面上的按钮和真实播放态会对不上（显示在播其实已经停）。
   * 这里只校正状态，不自动续播 —— 被电话打断后回来自己响起来是最差体感。
   */
  onShow() {
    audioSession.setup(true);
    try {
      // 延迟 require：audio.js 会实例化后台音频管理器，冷启动没必要为它买单
      require('./utils/audio.js').refreshState();
    } catch (e) {
      console.warn('[诗韵] 播放状态校正失败', e);
    }
  },

  /**
   * 退到后台**不停播**（2026-10-26 改）。
   * 早期这里主动 pause，是因为 InnerAudioContext 本来就会被系统掐掉，主动停只是让状态一致；
   * 换成 BackgroundAudioManager 后，锁屏 / 切后台续播正是它的核心能力（靠 app.json 的
   * requiredBackgroundModes: ["audio"] 声明）。要真正停止，走悬浮条上的关闭按钮。
   */
  onHide() {},

  login() {
    if (!this.globalData.cloudReady) return Promise.resolve('');

    return wx.cloud
      .callFunction({ name: 'login' })
      .then((res) => {
        const result = (res && res.result) || {};
        const openid = result.openid;
        if (openid) {
          this.globalData.openid = openid;
          this.globalData.userInfo = result.user || null;
          wx.setStorageSync('openid', openid);
        }
        // 用户档案没建成不影响云环境可用性，单独提示，别让它看起来像"云没连上"
        if (result.profileError) {
          console.info('[诗韵] 云环境已连通，但用户档案未建立：' + result.profileError);
        }
        return openid;
      })
      .catch((err) => {
        // 这一步才是真的"云环境不可用"。把原始错误打全，否则排查时拿不到 -404011 之类的关键码。
        console.warn('[诗韵] login 云函数调用失败，降级为本地模式', {
          errCode: err && err.errCode,
          errMsg: err && err.errMsg,
          raw: err
        });
        return '';
      });
  }
});
