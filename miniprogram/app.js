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

    wx.cloud.init({
      // TODO: 替换为自己的云环境 ID
      env: 'shiyun-placeholder',
      traceUser: true
    });

    this.globalData.cloudReady = true;
    this.login();
  },

  login() {
    if (!this.globalData.cloudReady) return Promise.resolve('');

    return wx.cloud
      .callFunction({ name: 'login' })
      .then((res) => {
        const openid = res && res.result && res.result.openid;
        if (openid) {
          this.globalData.openid = openid;
          wx.setStorageSync('openid', openid);
        }
        return openid;
      })
      .catch((err) => {
        console.warn('[诗韵] login 云函数调用失败，降级为本地模式', err);
        return '';
      });
  }
});
