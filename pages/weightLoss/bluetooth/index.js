const utils = require("../../../utils/util");

// ArrayBuffer 转 16进制字符串数组
const ab2hex = buffer => {
	const hexArr = Array.prototype.map.call(new Uint8Array(buffer), bit => ("00" + bit.toString(16)).slice(-2));
	return hexArr;
};

const keepKey = ['SWITCH', 'STOP', 'ZERO_CONTROL', 'HOT'];

Page({
	data: {
		KEY_MAP: {
			SWITCH: { value: 0x01, isActive: false, },
			HAND: { value: 0x20, isActive: false, },
			POS: { value: 0x2a, isActive: false, },
			STOP: { value: 0x70, isActive: false, },
			TIME: { value: 0x56, isActive: false, },
			AUTO: { value: 0x10, isActive: false, },
			RECOVER: { value: 0x11, isActive: false, },
			ACTIVE: { value: 0x12, isActive: false, },
			SLEEP: { value: 0x13, isActive: false, },
			RELIEF: { value: 0x14, isActive: false, },
			RELAX: { value: 0x15, isActive: false, },
			WIDTH: { value: 0x2e, isActive: false, },
			"ZERO_CONTROL": { value: 0x73, isActive: false, },
			"ZERO_PLUS": { value: 0x38, isActive: false, },
			"ZERO_MINUS": { value: 0x39, isActive: false, },
			"ZERO_UP_START": { value: 0x60, isActive: false, },
			"ZERO_UP_END": { value: 0x61, isActive: false, },
			"ZERO_DOWN_START": { value: 0x62, isActive: false, },
			"ZERO_DOWN_END": { value: 0x63, isActive: false, },
			HOT: { value: 0x75, isActive: false, },
			ROLLER: { value: 0x3a, isActive: false, },
		},
		isStart: false,
		isZeroControl: false,
		isOpenBluetoothAdapter: false,
		isBLEConnecting: false,
		isDiscoveryStart: false,
		devices: [],
		deviceId: "",
		serviceId: "",
		characteristicId: "",
		show: false,
	},
	onClose() {
		this.setData({
			show: false,
		});
	},
	openBluetoothAdapter() {
		this.setData({
			show: true,
		});
		wx.openBluetoothAdapter({
			mode: "central",
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
					wx.onBluetoothAdapterStateChange(e => {
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
				title: "搜索设备中...",
			});
			wx.startBluetoothDevicesDiscovery({
				success: () => {
					this.onBluetoothDeviceFound();
				},
			});
		}
	},
	onBluetoothDeviceFound() {
		wx.hideLoading();
		wx.onBluetoothDeviceFound(res => {
			const { devices } = this.data;
			res.devices.forEach(device => {
				const name = device.name || device.localName;
				if (name && !/未知/.test(name)) {
					if (devices.findIndex(item => item.deviceId === device.deviceId) === -1) {
						devices.push(device);
					}
				}
			});
			this.setData({
				devices: devices.sort((e, t) => t.RSSI - e.RSSI),
			});
		});
	},
	onKeyPress: utils.throttle(function (ev) {
		const key = ev.target.dataset?.key;
		// 是否绑定了 touchstart 和 touchend 事件
		const hasBindTouch = !!ev.target.dataset?.hasBindTouch;
		if (hasBindTouch) return;

		key && this.writeBLECharacteristicValue(key);
	}, 500),
	writeBLECharacteristicValue(key) {
		const { deviceId, serviceId, characteristicId, isBLEConnecting, isStart, isZeroControl, KEY_MAP } = this.data;
		// 蓝牙是否连接
		if (!(isBLEConnecting && deviceId && serviceId && characteristicId)) return;
		// 其他按钮必须要在开关按键生效后才可以点击
		if (key !== 'SWITCH' && !isStart) return;
		// 控制零重力的按钮必须在零重力按键生效后才可以点击
		if (key !== 'ZERO_CONTROL' && /ZERO/.test(key) && !isZeroControl) return

		// create buffer data
		const buffer = new ArrayBuffer(4); // 缓冲区； 4 字节
		const view = new DataView(buffer, 0); // 视图，操作缓冲区
		view.setInt8(0, 0xf0);
		view.setInt8(1, 0x82);
		view.setInt8(2, KEY_MAP[key].value);
		view.setInt8(3, 0xf1);

		wx.writeBLECharacteristicValue({
			deviceId,
			serviceId,
			characteristicId,
			value: buffer,
			success: () => {
				if (key === 'SWITCH') {
					this.setData({
						isStart: !KEY_MAP[key].isActive,
					}, () => {
						if (!this.data.isStart) {
							this.setData({
								...keepKey.reduce((res, key) => {
									res[`KEY_MAP.${key}.isActive`] = false;
									return res;
								}, {}),
								isZeroControl: false,
							});
						}
					});
				}
				if (key === 'ZERO_CONTROL') {
					this.setData({
						isZeroControl: !isZeroControl,
					});
				}
				// 回弹按下的按钮
				if (keepKey.includes(key)) {
					this.setData({
						[`KEY_MAP.${key}.isActive`]: !KEY_MAP[key].isActive,
					});
				}
			},
		});
	},
	onCreateBLEConnection(ev) {
		const deviceId = ev.currentTarget.dataset.deviceId;
		this.setData({
			deviceId,
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
				console.log("onBLEConnectionStateChange", res);
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
					// write
					if (/AE01/.test(characteristic.uuid)) {
						// 记录 write characteristic 对应的 serviceId、characteristicId
						this.setData({
							serviceId,
							characteristicId: characteristic.uuid,
						});
					}
					// notify
					if (/AE02/.test(characteristic.uuid)) {
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
									if (hexArr.length === 4) return;
									/*
									 * 十六进制 转 十进制 parseInt(0xFF, 16)
									 * 十进制 转 二进制 (十进制数).toString(2)
									*/
									// 开关状态
									const isSwitchKeyPress = (parseInt(hexArr[2], 16) & 0b01000000) === Number(0b01000000);
									// 2 表示 暂停状态，即暂停按钮被按下，0 表示 运行状态
									const isStopKeyPress = (parseInt(hexArr[2], 16) & 0b00000010) === Number(0b00000010);
									this.setData({
										isStart: isSwitchKeyPress,
										"KEY_MAP.SWITCH.isActive": isSwitchKeyPress,
										"KEY_MAP.STOP.isActive": isStopKeyPress,
									});
								});
							},
						});
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
});
