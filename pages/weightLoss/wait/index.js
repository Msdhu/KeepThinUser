const app = getApp();
const { utils } = app;

// ArrayBuffer转16进度字符串示例
const ab2hex = (buffer) => {
  const hexArr = Array.prototype.map.call(
    new Uint8Array(buffer),
    bit => ('00' + bit.toString(16)).slice(-2)
  )
  return hexArr.join('');
}

Page({
	data: {
		showLogin: false,
		isDiscoveryStart: false,
		isOpenBluetoothAdapter: false,
		isBLEConnecting: false,
		deviceId: "",
	},
	onLoad() {
		this.timer = "";

		wx.getStorageSync("loginInfo")?.openId
			? this.init()
			: this.setData({
					showLogin: true,
			  });
	},
	init() {
		this.openBluetoothAdapter();
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
				console.log(e)
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
				// services: [ "FEE7" ],
				success: () => {
					this.onBluetoothDeviceFound();
				}
			});
		}
	},
	onBluetoothDeviceFound() {
		wx.hideLoading();
		wx.onBluetoothDeviceFound((res) => {
			console.log('res.devices', res.devices);
			res.devices.forEach((device) => {
				// 过滤出满足条件的 devices
				if ((device.name || device.localName)) {
					this.createBLEConnection(device);
					wx.stopBluetoothDevicesDiscovery();
					this.setData({
						isDiscoveryStart: false,
					});
				}
			});
		});
	},
	createBLEConnection(device) {
		const { deviceId } = device;
		this.setData({
			deviceId,
		})
		wx.showLoading({
			title: '连接设备中...',
		});
		wx.createBLEConnection({
			deviceId,
			success: () => {
				this.setData({
					isBLEConnecting: true,
				});
				wx.hideLoading();
				// 连接成功，获取服务
				this.getBLEDeviceServices(deviceId);
				this.onBLEConnectionStateChange(device);
			},
			fail: () => {
				wx.showToast({
					title: "连接失败",
					icon: "none"
				});
			}
		});
	},
	onBLEConnectionStateChange(device) {
		wx.onBLEConnectionStateChange((res) => {
			// 该方法回调中可以用于处理连接意外断开等异常情况
			if (!res.connected) {
				console.log('onBLEConnectionStateChange', res)
				this.createBLEConnection(device);
			}
		});
	},
	getBLEDeviceServices(deviceId) {
		wx.getBLEDeviceServices({
			deviceId,
			success: (res) => {
				res.services.forEach((service) => {
					const { uuid } = service;
					this.getBLEDeviceCharacteristics(deviceId, uuid);
				});
			}
		});
	},
	getBLEDeviceCharacteristics(deviceId, serviceId) {
		wx.getBLEDeviceCharacteristics({
			deviceId,
			serviceId,
			success: (res) => {
				console.log('characteristics', res.characteristics)
				res.characteristics.forEach((characteristic) => {
					if ((characteristic.properties.notify || characteristic.properties.indicate) && characteristic.properties.read) {
						// 必须先启用 wx.notifyBLECharacteristicValueChange 才能监听到设备 onBLECharacteristicValueChange 事件
						wx.notifyBLECharacteristicValueChange({
							deviceId,
							serviceId,
							characteristicId: characteristic.uuid,
							state: true,
							type: 'notification',
							success: () => {
								wx.onBLECharacteristicValueChange((res) => {
									console.log('value', res?.value);
									const hexValue = ab2hex(res?.value);
									console.log('hexValue', hexValue);
									const normalValue = parseInt(hexValue, '16');
									console.log('normalValue', normalValue);
								});
							},
						})
						if (this.timer) {
							clearInterval(this.timer);
						}
						this.timer = ((characteristic) => {
							return setInterval(() => {
								wx.readBLECharacteristicValue({
									deviceId,
									serviceId,
									characteristicId: characteristic.uuid,
								});
							}, 1000);
						})(characteristic);
					}
				});
			},
		});
	},
	cloasBLE() {
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

	onUnload() {
		this.cloasBLE();
	},
	wxLogin(ev) {
		const { detail: loginInfo } = ev;
		if (loginInfo?.openId) {
			this.setData({
				showLogin: false,
			});
		}
	},
});
