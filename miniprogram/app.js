App({
  globalData: {
    openid: '',
    userInfo: null,
    cloudReady: false
  },

  onLaunch() {
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

  // 小程序退到后台时停掉朗读，避免无声播放；小程序内切页不受影响
  onHide() {
    try {
      const { getAudioPlayer } = require('./utils/audio.js');
      getAudioPlayer().pause();
    } catch (e) {}
  },

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
