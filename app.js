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
    });
  },
  utils,
  globalData: {
    systemInfo: {},
    marginTop: 0,
  },
});
