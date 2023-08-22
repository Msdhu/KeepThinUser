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
		this.timer = [];

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
			wx.startBluetoothDevicesDiscovery({
				services: [ "FEE7" ],
				success: () => {
					this.onBluetoothDeviceFound();
				}
			});
		}
	},
	onBluetoothDeviceFound() {
		wx.onBluetoothDeviceFound((res) => {
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
		wx.createBLEConnection({
			deviceId,
			success: () => {
				this.setData({
					isBLEConnecting: true,
				});
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
					if (uuid.indexOf('FEE7') > -1) {
						this.getBLEDeviceCharacteristics(deviceId, uuid);
					}
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
					if (characteristic.properties.notify || characteristic.properties.indicate) {
						// 必须先启用 wx.notifyBLECharacteristicValueChange 才能监听到设备 onBLECharacteristicValueChange 事件
						wx.notifyBLECharacteristicValueChange({
							deviceId,
							serviceId,
							characteristicId: characteristic.uuid,
							state: true,
							type: 'notification',
							success: () => {
								wx.onBLECharacteristicValueChange((res) => {
									const { value } = res;
									console.log('characteristic', res)
									console.log('value', ab2hex(value));
								});
							},
						})
					}
					const timer = setInterval((characteristic) => {
						wx.readBLECharacteristicValue({
							deviceId,
							serviceId,
							characteristicId: characteristic.uuid,
						});
					}, 100);

					this.timer.push(timer);
				});
				console.log("timer", this.timer);
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
	clearTimer() {
		this.timer.length && this.timer.forEach(timer => clearInterval(timer));
	},
	onHide() {
		this.clearTimer();
		this.cloasBLE();
	},
	onUnload() {
		this.clearTimer();
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
