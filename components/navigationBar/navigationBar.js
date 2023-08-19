Component({
	properties: {
		title: {
			type: String,
			value: false,
		},
		showBack: {
			type: Boolean,
			value: false,
		},
		color: {
			type: String,
			value: "#fff",
		},
	},
	data: {
		top: 0,
		left: 0,
		height: 0,
	},
	observers: {},
	lifetimes: {
		attached() {
			wx.getSystemInfo({
				success: (sysInfo) => {
					const ratio = 750 / sysInfo.windowWidth;
					const clientInfo = wx.getMenuButtonBoundingClientRect();
					this.setData({
						top: clientInfo.top * ratio,
						left: clientInfo.left * ratio,
						height: clientInfo.height * ratio,
					});
				},
			});
		},
	},
	methods: {
		goBack() {
			this.properties.showBack && wx.navigateBack();
		},
	},
});
