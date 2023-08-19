const utils = require("/utils/util");

// 整个小程序只有一个 App 实例，是全部页面共享的，可以通过 getApp 方法获取到全局唯一的 App 实例
App({
  onLaunch() {
    const globalData = this.globalData;
    wx.getSystemInfo({
      success: (sysInfo) => {
        const ratio = 750 / sysInfo.windowWidth;
        const clientInfo = wx.getMenuButtonBoundingClientRect();
        globalData.systemInfo = sysInfo;
        globalData.marginTop = (clientInfo.top + clientInfo.height) * ratio;
      },
      fail: () => {},
    });
    const loginInfo = wx.getStorageSync("loginInfo") || {};
    const consumerInfo = wx.getStorageSync("consumerInfo") || {};
    if (loginInfo?.openId && consumerInfo?.id) {
      this.isBind(loginInfo.openId, consumerInfo.id);
    }
  },
  // TODO: 该方法有待商榷
  isBind (openId, id) {
    utils.request({
      // TODO: change url and data
      url: `shop/index`,
      data: {
        consumerId: id,
      },
      method: "GET",
      success: (res = {}) => {
        // TODO: 判断条件修改
        if (res.status === 0) {
          wx.removeStorageSync("consumerInfo");
        }
      },
    });
  },
  utils,
  globalData: {
    systemInfo: {},
    marginTop: 0,
  },
});
