const app = getApp();
const { utils } = app;

Page({
	data: {
		showPopup: false,
    loginInfo: {},
    consumerInfo: {},
	},
	onShow() {
    if (typeof this.getTabBar == "function") {
      this.getTabBar().setData({
        selected: 1,
      });
    }
    this.setData({
      loginInfo: wx.getStorageSync("loginInfo") || {},
      consumerInfo: wx.getStorageSync("consumerInfo") || {},
    });
	},
  wxLogin(ev) {
		const { detail: loginInfo } = ev;
    const { consumerInfo } = this.data;
		if (loginInfo?.openId) {
			this.setData({
				loginInfo,
			} , () => {
				if (consumerInfo?.id) {
					this.getConsumerInfo(consumerInfo.id);
				}
			});
		}
	},
  getConsumerInfo(id) {
		utils.request(
			{
				url: `member/detail`,
				data: {
					customer_id: id,
				},
				method: "GET",
				success: res => {
					const consumerInfo = {
						id,
						shop_id: res?.shop_id,
						store: res?.shop_name,
						phone: res.phone,
						name: res.username,
						gender: res.sex || '女',
					};
					wx.setStorageSync("consumerInfo", consumerInfo);
					this.setData({
						consumerInfo,
					});
				},
				isShowLoading: true,
			}
		);
	},
	jumpUrl(ev) {
		wx.navigateTo({
      url: ev.currentTarget.dataset.url,
    });
	},
});
