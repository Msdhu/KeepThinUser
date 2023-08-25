const utils = require("../../utils/util");

Component({
	properties: {
		height: {
			type: Number,
			value: 0,
			observer(e) {
				this.setData({
					height: e,
				});
			},
		},
	},
	data: {},
	methods: {
		getUserInfo() {
			return new Promise((resolve, reject) => {
				wx.getUserProfile({
					desc: "用户登录",
					success: userInfo => {
						resolve(userInfo);
					},
					fail: e => {
						reject(e);
					},
				});
			});
		},
		getLogin() {
			return new Promise((resolve, reject) => {
				wx.login({
					success: loginInfo => {
						resolve(loginInfo);
					},
					fail: e => {
						reject(e);
					},
				});
			});
		},
		wxLogin() {
			if (!wx.getStorageSync("loginInfo")) {
				Promise.all([this.getLogin(), this.getUserInfo()])
					.then(([loginInfo, userInfo]) => {
						const { code } = loginInfo;
						const { userInfo: info } = userInfo;
						const { nickName, avatarUrl } = info;

						utils.request({
							url: `client/login`,
							data: {
								code,
							},
							isShowLoading: true,
							method: "GET",
							success: res => {
								const loginInfo = {
									openId: res?.WToken,
									nickName,
									avatarUrl,
								};
								wx.setStorageSync("loginInfo", loginInfo);
								this.isBind(loginInfo);
							},
						});
					})
					.catch(() => {});
			}
		},
		isBind(loginInfo) {
			utils.request({
				url: `client/info`,
				method: "GET",
				success: (res = {}) => {
					if (res?.customer_id && res?.shop_id) {
						wx.setStorageSync("consumerInfo", {
							id: res?.customer_id,
							shop_id: res?.shop_id,
							store: res?.shop_name,
							phone: res?.phone,
							name: res?.username,
							gender: res?.sex || '女',
						});
					} else {
						wx.removeStorageSync("consumerInfo");
					}
					this.triggerEvent("wxLogin", loginInfo);
				},
			});
		},
	},
});
