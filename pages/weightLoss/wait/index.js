const app = getApp();
const { utils } = app;

// ArrayBuffer 转 16进制字符串数组
const ab2hex = buffer => {
	return Array.prototype.map.call(new Uint8Array(buffer), bit => ("00" + bit.toString(16)).slice(-2));
};

Page({
	data: {
		showLogin: false,
		isDiscoveryStart: false,
		isOpenBluetoothAdapter: false,
		isBLEConnecting: false,
		weight: 0,
		isKilo: false,
	},
	onLoad() {
		if (!wx.getStorageSync("loginInfo")?.openId) {
			this.setData({
				showLogin: true,
				consumerInfo: wx.getStorageSync("consumerInfo") || {},
			});
		}
		this.openBluetoothAdapter();
	},
	reWeight() {
		this.setData({
			weight: 0,
		});
	},
	openBluetoothAdapter() {
		wx.openBluetoothAdapter({
			mode: 'central',
			success: () => {
				this.setData({
					isOpenBluetoothAdapter: true,
				});
				this.startBluetoothDevicesDiscovery();
			},
			fail: e => {
				if (e.errCode === 10001) {
					wx.showToast({
						title: "请打开蓝牙",
						icon: "none",
					});
					wx.onBluetoothAdapterStateChange((e) => {
						e.available && this.startBluetoothDevicesDiscovery();
					});
				}
			},
		});
	},
	startBluetoothDevicesDiscovery() {
		if (!this.data.isDiscoveryStart) {
			this.setData({
				isDiscoveryStart: true,
			});
			wx.showLoading({
				title: '搜索设备中...',
			});
			wx.startBluetoothDevicesDiscovery({
				success: () => {
					this.onBluetoothDeviceFound();
				}
			});
		}
	},
	onBluetoothDeviceFound() {
		wx.hideLoading();
		wx.onBluetoothDeviceFound((res) => {
			const { devices } = this.data;
			res.devices.forEach(device => {
				const name = (device.name || device.localName);
				if (name && /YANGSHOU-/.test(name)) {
					this.onCreateBLEConnection(device.deviceId);
				}
			});
		});
	},
	onCreateBLEConnection(deviceId) {
		this.setData({
			isDiscoveryStart: false,
		});
		wx.stopBluetoothDevicesDiscovery();
		this.createBLEConnection(deviceId);
	},
	createBLEConnection(deviceId) {
		wx.showLoading({
			title: "连接设备中...",
		});
		wx.createBLEConnection({
			deviceId,
			success: () => {
				this.setData({
					isBLEConnecting: true,
					show: false,
				});
				wx.hideLoading();
				// 连接成功，获取服务
				this.getBLEDeviceServices(deviceId);
				this.onBLEConnectionStateChange(deviceId);
			},
			fail: () => {
				wx.showToast({
					title: "连接失败",
					icon: "none",
				});
			},
		});
	},
	onBLEConnectionStateChange(deviceId) {
		wx.onBLEConnectionStateChange(res => {
			// 该方法回调中可以用于处理连接意外断开等异常情况
			if (!res.connected) {
				this.createBLEConnection(deviceId);
			}
		});
	},
	getBLEDeviceServices(deviceId) {
		wx.getBLEDeviceServices({
			deviceId,
			success: res => {
				res.services.forEach(service => {
					const { uuid } = service;
					this.getBLEDeviceCharacteristics(deviceId, uuid);
				});
			},
		});
	},
	getBLEDeviceCharacteristics(deviceId, serviceId) {
		wx.getBLEDeviceCharacteristics({
			deviceId,
			serviceId,
			success: res => {
				res.characteristics.forEach(characteristic => {
					// notify
					if (/FFE1/.test(characteristic.uuid)) {
						// 必须先启用 wx.notifyBLECharacteristicValueChange 才能监听到设备 onBLECharacteristicValueChange 事件
						wx.notifyBLECharacteristicValueChange({
							deviceId,
							serviceId,
							characteristicId: characteristic.uuid,
							state: true,
							type: "notification",
							success: () => {
								wx.onBLECharacteristicValueChange(res => {
									const hexArr = ab2hex(res?.value) || [];
									/*
									* 十六进制 转 十进制 parseInt(0xFF, 16)
									* 十进制 转 二进制 (十进制数).toString(2)
									*/
									const wArr = hexArr.map(x => parseInt(x, 16) & 0b00001111);
									const weight = wArr[1] * 1000 + wArr[2] * 100 + wArr[3] * 10 +  wArr[4] +  wArr[6] * 0.1;
									const isKilo = parseInt(hexArr[8], 16) === 0x6B && parseInt(hexArr[9], 16) === 0x67;
									if (this.data.weight >= weight) return;
									this.setData({
										weight,
										isKilo,
									});
								});
							},
						});
					}
				});
			},
		});
	},
	onUnload() {
		const { isBLEConnecting, isOpenBluetoothAdapter, deviceId } = this.data;
		if (isBLEConnecting) {
			wx.closeBLEConnection({
				deviceId,
			});
			this.setData({
				isBLEConnecting: false,
			});
		}
		if (isOpenBluetoothAdapter) {
			wx.closeBluetoothAdapter();
			this.setData({
				isOpenBluetoothAdapter: false,
			});
		}
	},
	wxLogin(ev) {
		const { detail: loginInfo } = ev;
		const consumerInfo = wx.getStorageSync("consumerInfo");
		if (loginInfo?.openId) {
			this.setData({
				showLogin: false,
			}, () => {
				if (consumerInfo?.id) {
					this.setData({
						consumerInfo,
					});
				}
			});
		}
	},
	saveCurrentWeight() {
		const { weight, consumerInfo, isKilo } = this.data;
		utils.request(
			{
				url: "member/weight-update",
				data: {
					// 店铺id
					shop_id: consumerInfo.shop_id,
					customer_id: consumerInfo.id,
					ymd: utils.formatTime(new Date(), "YYYY-MM-DD"),
					weight: isKilo ? weight * 2 : weight,
				},
				method: "POST",
				success: () => {
					wx.showToast({
						title: "保存成功",
						icon: "none",
					});
					setTimeout(() => {
						wx.reLaunch({
							url: "/pages/weightLoss/index",
						});
					}, 1000);
				},
				isShowLoading: true,
			},
		);
	},
});
