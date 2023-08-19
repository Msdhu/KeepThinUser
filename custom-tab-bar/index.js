Component({
	data: {
		selected: 0,
		color: "#999999",
		selectedColor: "#333333",
		list: [
			{
				pagePath: "/pages/weightLoss/index",
				text: "减重",
				iconPath: "/assets/jianzhong.png",
				selectedIconPath: "/assets/jianzhong2.png",
			},
			{
				pagePath: "/pages/mine/index",
				text: "我的",
				iconPath: "/assets/wode.png",
				selectedIconPath: "/assets/wode2.png",
			},
		],
	},
	methods: {
		switchTab(ev) {
			const { path, index } = ev.currentTarget.dataset;
			this.setData({
				selected: index,
			}, () => {
				wx.switchTab({
					url: path,
				})
			});
		},
	},
});
