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
						console.log(loginInfo, userInfo);
						const { code } = loginInfo;
						const { errMsg, rawData, signature, encryptedData, userInfo: info, iv } = userInfo;
						const { country, city, language, nickName, avatarUrl, gender, province } = info;

						// TODO: 测试使用
						wx.setStorageSync("loginInfo", {
							openId: '95ca5a7c919b654974472440eb11397b',
							nickName,
							avatarUrl,
						});
						this.triggerEvent("wxLogin", {
							openId: '95ca5a7c919b654974472440eb11397b',
							nickName,
							avatarUrl,
						});
						return;

						utils.request({
							// TODO: change url and data
							url: `login/index`,
							data: {
								appid: "wx98da64eff90a57f7",
								wxCode: code,
								errMsg,
								rawData,
								signature,
								encryptedData,
								iv,
								userInfo: {
									country,
									city,
									language,
									nickName,
									avatarUrl,
									gender,
									province,
								},
							},
							isShowLoading: true,
							method: "POST",
							success: res => {
								wx.setStorageSync("loginInfo", res);
								this.triggerEvent("wxLogin", res);
							},
						});
					})
					.catch(() => {});
			}
		},
	},
});
