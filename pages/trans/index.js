Page({
	data: {
		durationInfo: { enter: 300, leave: 500 },
	},
	onShow() {
		setTimeout(() => {
			wx.switchTab({
				url: "/pages/weightLoss/index",
			});
		}, 1000);
	},
});
