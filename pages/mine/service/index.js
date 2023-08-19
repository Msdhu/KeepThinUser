const app = getApp();
const { utils } = app;

Page({
	data: {
		tabsList: [
			{
				name: "历史记录",
				index: 0,
			},
			{
				name: "产品使用情况",
				index: 1,
			},
		],
		tabIndex: 0,
		projectList: [],
		productList: [],
		consumerInfo: {},
	},
	onLoad() {
		this.setData({
			consumerInfo: wx.getStorageSync("consumerInfo"),
		}, () => {
			this.getServiceHistory();
			this.getProductList();
		});
	},
	getServiceHistory() {
		const { consumerInfo } = this.data;
		utils.request(
			{
				url: `project/history`,
				data: {
					shop_id: consumerInfo.shop_id,
					customer_id: consumerInfo.id,
				},
				method: "GET",
				success: res => {
					const projectList = (res || []).map(item => ({
						id: item?.id,
						opDate: item?.ymd,
						partName: item?.body,
						products: [{
							productName: item?.good_name,
						}],
					}));
					this.setData({
						projectList,
					});
				},
				isShowLoading: true,
			}
		);
	},
	getProductList() {
		const { consumerInfo } = this.data;
		utils.request(
			{
				url: `project/product-history`,
				data: {
					shop_id: consumerInfo.shop_id,
					customer_id: consumerInfo.id,
				},
				method: "GET",
				success: res => {
					this.setData({
						productList: (res || []).map(item => ({
							id: item?.history_id,
							createTime: item?.ymd,
							totalUseNum: item?.used_num || 0,
							title: item?.good_name,
							price: item?.price,
							quantity: item?.good_num,
						})),
					});
				},
				isShowLoading: true,
			}
		);
	},
	tabChangeListener(ev) {
		this.setData({
			tabIndex: ev.detail,
		});
	},
});
