const WxCharts = require('../../utils/wxCharts.js');
const app = getApp();
const { utils } = app;

let wxChart = null;

Page({
	data: {
    navigationColor: "",
    currentWeight: "",
    loginInfo: {},
    consumerInfo: {},
    consumerDetail: {},
    // 历史体重
    chartsObj: {},
    weightHistory: [],
    // 是否显示完整手机号
		isShowPhone: true,
    windowHeight: 200,
	},
	onShow() {
    if (typeof this.getTabBar == "function") {
      this.getTabBar().setData({
        selected: 0,
      });
    }
    this.setData({
      loginInfo: wx.getStorageSync("loginInfo") || {},
      consumerInfo: wx.getStorageSync("consumerInfo") || {},
    }, () => {
      const { loginInfo, consumerInfo } = this.data
      if (loginInfo?.openId && consumerInfo?.id) {
        this.getDetailData();
        this.getWeightHistory();
      }
    });
	},
  // 获取用户详情
	getDetailData() {
		const { consumerInfo } = this.data;
		utils.request(
			{
				url: `member/tongji`,
				data: {
					shop_id: consumerInfo.shop_id,
					customer_id: consumerInfo.id,
					ymd: utils.formatTime(new Date(), "YYYY-MM-DD"),
				},
				method: "GET",
				success: res => {
					this.setData({
						currentWeight: res.current_weight,
						consumerDetail: {
							id: consumerInfo.id,
							name: consumerInfo.name,
							gender: consumerInfo.gender,
							phone: consumerInfo.phone,
							standarded: this.getStandarded(res), // 减重期  1: 巩固期 2: 匀减期 3: 速减期
							// 今日体重
							currentWeight: res.current_weight,
							// 今日减重
							todayLossedWeight: (((res.today_weight_reduce || 0) * 10000 + 1) / 10000).toFixed(1),
							// 实际减重
							realLossedWeight: (((res.real_weight_reduce || 0) * 10000 + 1) / 10000).toFixed(1),
							// 累计体重
							totalLossedWeight: (((res.total_weight_reduce || 0) * 10000 + 1) / 10000).toFixed(1),
							// 累积到店
							regiseterCount: res.arrive_count || 0,
							// 未减斤数
							unLossWeight: (((res.no_weight_reduce || 0) * 10000 + 1) / 10000).toFixed(1),
							// 最低体重
							lowestWeight: res.min_weight_reduce || 0,
							// 初始体重
							originWeight: res.weight_init || 0,
							// 标准体重
							standardWeight: res.weight_normal || 0,
							// 应减斤数
							loseWeight: (((res.weight_reduce || 0) * 10000 + 1) / 10000).toFixed(1),
						},
					});
				},
				isShowLoading: true,
			}
		);
	},
	getWeightHistory() {
		const { consumerInfo } = this.data;
		utils.request(
			{
				url: `member/weight-history`,
				data: {
					shop_id: consumerInfo.shop_id,
					customer_id: consumerInfo.id,
				},
				method: "GET",
				success: res => {
					const x_data = [], y_data = [];
					res.forEach(item => {
						x_data.unshift(item.date.slice(5))
						y_data.unshift(item.weight);
					});
					const min = Math.min.apply(Math, y_data), max = Math.max.apply(Math, y_data);
					this.setData({
						weightHistory: res || [],
						chartsObj: {
							chartTit: "历史体重",
							x_data,
							y_data,
							min,
							max,
						},
					}, () => {
						this.OnWxChart(x_data, y_data, "历史体重", min, max)
					});
				},
			}
		);
	},
	getStandarded({ weight_init, weight_normal, current_weight }) {
		const weightNormal = Number(weight_normal);
		const weightCurrent = Number(current_weight);
		const weightFlagOne = (Number(weight_init) + weightNormal) / 2;
		const weightFlagTwo = weightNormal + 5;

		if (weightFlagOne < weightFlagTwo) return 1;
		if (weightCurrent > weightFlagOne) return 3;
		else if (weightCurrent < weightFlagTwo) return 1;

		return 2;
	},
  OnWxChart(x_data, y_data, chartTit, min, max) {
		const systemInfo = wx.getSystemInfoSync();
		const width = systemInfo.windowWidth / 750 * 690 - 20, height = systemInfo.windowWidth / 750 * 700 - 100;
    this.setData({
      windowHeight: height,
    });
		wxChart = new WxCharts({
			canvasId: "lineCanvas",
			type: "line",
			categories: x_data,
			animation: !0,
			legend: !1,
			series: [{
				name: "",
				data: y_data,
				format: (t, a) => {
						return t + "斤";
				}
			}],
			xAxis: {
				disableGrid: !0
			},
			yAxis: {
				title: "",
				format: (t) => {
					return t.toFixed(2);
				},
				max: max + .8,
				min: min - .5,
				gridColor: "#D8D8D8"
			},
			width,
			height,
			dataLabel: !1,
			dataPointShape: !0,
			extra: {
				lineStyle: "curve"
			}
		});
	},
	touchcanvas(t) {
		wxChart.showToolTip(t, {
			format: (t, a) => {
				return a + " " + t.name + ":" + t.data;
			}
		});
	},

	wxLogin(ev) {
    const { detail: loginInfo } = ev;
    const consumerInfo = wx.getStorageSync("consumerInfo");
		this.setData({
      loginInfo,
    }, () => {
      if (consumerInfo?.id) {
				this.setData({
					consumerInfo,
				}, () => {
					this.getDetailData();
					this.getWeightHistory();
				});
      }
    });
	},
	scanCode() {
		this.data.loginInfo?.openId
			? wx.scanCode({
					onlyFromCamera: true,
					success: (res) => {
            wx.navigateTo({
              url: "/" + res.path,
            });
					},
			  })
			: wx.showToast({
          title: "请先登录!",
					icon: "none",
			  });
	},
  onPageScroll(e) {
		this.setData({
			navigationColor: utils.getNavColor(e),
		});
	},
  chageShowPhone() {
		this.setData({
			isShowPhone: !this.data.isShowPhone,
		});
	},
});
