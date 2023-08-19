const app = getApp();
const { utils } = app;

Page({
	data: {
		sizeList: [
			{
				name: "脐上",
				flag: "size_js",
			},
			{
				name: "脐中",
				flag: "size_jz",
			},
			{
				name: "脐下",
				flag: "size_jx",
			},
			{
				name: "左臂",
				flag: "size_zb",
			},
			{
				name: "右臂",
				flag: "size_yb",
			},
			{
				name: "左大腿",
				flag: "size_zdt",
			},
			{
				name: "左小腿",
				flag: "size_zxt",
			},
			{
				name: "右大腿",
				flag: "size_ydt",
			},
			{
				name: "右小腿",
				flag: "size_yxt",
			},
		],
		historySizeList: [],
		consumerInfo: {},
	},
	onLoad() {
		this.setData({
			consumerInfo: wx.getStorageSync("consumerInfo"),
		}, () => {
			this.getSizeList();
		});
	},
	getSizeList() {
		const { consumerInfo, sizeList } = this.data;
		utils.request(
			{
				url: `member/size-history`,
				data: {
					shop_id: consumerInfo.shop_id,
					customer_id: consumerInfo.id,
				},
				method: "GET",
				success: (res = []) => {
					const historySizeList = res.map(item => {
						return {
							id: item?.id,
							createTime: item?.ymd,
							list: Object.keys(item?.config).map(key => {
								const { current, init, result } = item?.config[key];
								const index = sizeList.findIndex(item => item.flag === key);
								return {
									size: current,
									originSize: init,
									diffSize: Number(init) >=  Number(current) ? result : `-${result}`,
									name: sizeList[index]?.name,
								};
							}),
						};
					});
					this.setData({
						historySizeList,
					});
				},
				isShowLoading: true,
			}
		);
	},
});
