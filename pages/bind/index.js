const app = getApp();
const { utils } = app;

Page({
	data: {
		agreement: false,
		consumerId: "",
		showLogin: false,
		loginInfo: {},
		consumerInfo: {},
	},
	onLoad(opt) {
		const loginInfo = wx.getStorageSync("loginInfo");
		this.setData({
			loginInfo: loginInfo || {},
		})
		if (opt?.scene) {
			const query = decodeURIComponent(opt.scene).split("#");
			const consumerId = query[1];
			this.setData({
				showLogin: !loginInfo,
				consumerId,
			});
			!!loginInfo && this.getConsumerInfo(consumerId);
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
						// TODO: shop_id && store
						shop_id: res?.shop_id || 15,
						store: res?.store || "小奇测试店铺",
						phone: res.phone,
						name: res.username,
						gender: res.sex || '女',
						age: res.age,
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
	bindStore() {
		const { loginInfo, consumerId, agreement } = this.data;
		if (agreement) {
			wx.showModal({
				title: "提示",
				content: "绑定后不可随意更改，请确认信息正确。",
				success: (e) => {
					if (e.confirm) {
						utils.request(
							{
								// TODO: url 和 params 修改
								url: `store/bind`,
								data: {
									customer_id: consumerId,
									open_id: loginInfo.openId,
								},
								method: "POST",
								success: res => {
									wx.showToast({
										icon: "none",
										title: "绑定成功!",
									});
									setTimeout(() => {
										wx.reLaunch({
											url: "/pages/weightLoss/index",
										});
									}, 1500);
								},
								isShowLoading: true,
							}
						);
					}
				},
			})
		} else {
			wx.showToast({
				icon: "none",
				title: "请先同意用户服务协议!",
			});
		}
	},
	wxLogin(ev) {
		const { detail: loginInfo } = ev;
    const { consumerId } = this.data;
		if (loginInfo?.openId) {
			this.setData({
				showLogin: false,
				loginInfo,
			} , () => {
				if (consumerId) {
					this.getConsumerInfo(consumerId);
				}
			});
		}
	},
	onChangeAgreement(ev) {
		this.setData({
			agreement: ev.detail,
		});
	},
	showAgreement() {
		this.setData({
			showAgreement: true,
		});
	},
	onCloseAgreement() {
		this.setData({
			showAgreement: false,
		});
	},
});
