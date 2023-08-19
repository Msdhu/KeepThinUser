Page({
	data: {},
	onShow() {
		setTimeout(() => {
			wx.switchTab({
				url: "../weightLoss/index",
			});
		}, 1000);
	},
});
