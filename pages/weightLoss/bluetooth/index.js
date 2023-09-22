const worker = wx.createWorker('workers/index.js')

// ArrayBuffer 转 16进制字符串数组
const ab2hex = buffer => {
	const hexArr = Array.prototype.map.call(new Uint8Array(buffer), bit => ("00" + bit.toString(16)).slice(-2));
	return hexArr;
};

const autoSwitchKey = ["ACTIVE", "SLEEP", "RELIEF", "RELAX", "SPINE", "PRESS"];
const keepKey = ["SWITCH", "STOP", "HOT", ...autoSwitchKey];

Page({
	data: {
		KEY_MAP: {
			SWITCH: { value: 0x01, isActive: false, },
			HAND: { value: 0x20, },
			// 全局(isFull)，局部(isPart)，定点(isPoint)
			POS: { value: 0x2a, isFull: false, isPart: false, isPoint: false },
			// 暂停，正揉(isKnead)/捶打(isKnock)/滚压(isKpress)
			STOP: { value: 0x70, isActive: false, isKnead: false, isKnock: false, isKpress: false },
			TIME: { value: 0x56 },
			ACTIVE: { value: 0x12, isActive: false, },
			SLEEP: { value: 0x13, isActive: false, },
			RELIEF: { value: 0x14, isActive: false, },
			RELAX: { value: 0x15, isActive: false, },
			SPINE: { value: 0x16, isActive: false, },
			PRESS: { value: 0x17, isActive: false, },
			WIDTH: { value: 0x2e },
			"ZERO": { value: 0x73 },
			"SPEED_INC": { value: 0x39 },
			"SPEED_DEC": { value: 0x38 },
			"WALK_UP_START": { value: 0x60 },
			"WALK_UP_END": { value: 0x61 },
			"WALK_DOWN_START": { value: 0x62 },
			"WALK_DOWN_END": { value: 0x63 },
			"BACK_UP_START": { value: 0x64 },
			"BACK_UP_END": { value: 0x65 },
			"BACK_DOWN_START": { value: 0x66 },
			"BACK_DOWN_END": { value: 0x67 },
			"LEG_UP_START": { value: 0x68 },
			"LEG_UP_END": { value: 0x69 },
			"LEG_DOWN_START": { value: 0x6a },
			"LEG_DOWN_END": { value: 0x6b },
			"LEG_EXTEND_UP_START": { value: 0x6c },
			"LEG_EXTEND_UP_END": { value: 0x6d },
			"LEG_EXTEND_DOWN_START": { value: 0x6e },
			"LEG_EXTEND_DOWN_END": { value: 0x6f },
			HOT: { value: 0x75, isActive: false, },
			ROLLER: { value: 0x3a },
		},
		isOpenBluetoothAdapter: false,
		isBLEConnecting: false,
		isDiscoveryStart: false,
		devices: [],
		deviceId: "",
		serviceId: "",
		characteristicId: "",
		show: false,
		// 是否开机复位中
		isPowerReset: false,
		// 是否体型检测中
		isDetecting: false,
		isStart: false,
		isHand: false,
		disabledSpeed: true,
		disabledWidthSwitch: true,
		disabledWalk: true,
	},
	onShow() {
		worker.onMessage((res) => {
			if (this.data.isPowerReset) {
				wx.showLoading({
					title: '关机复位中',
				});
			} else {
				wx.hideLoading();
			}
			if (this.data.isDetecting) {
				wx.showLoading({
					title: '体型检测中',
				});
			} else {
				wx.hideLoading();
			}

			this.setData({ ...res });
		});
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
	onKeyPress(ev) {
		const { disabled, start: key } = ev.target.dataset;
		if (disabled) return;

		key && this.writeBLECharacteristicValue(key);
	},
	onKeyUp(ev) {
		const { disabled, end: key } = ev.target.dataset;
		if (disabled) return;

		key && this.writeBLECharacteristicValue(key);
	},
	writeBLECharacteristicValue(key) {
		const { deviceId, serviceId, characteristicId, isBLEConnecting, isHand, KEY_MAP } = this.data;
		// 蓝牙是否连接
		if (!(isBLEConnecting && deviceId && serviceId && characteristicId)) return;

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
				if (keepKey.includes(key)) {
					this.setData({
						[`KEY_MAP.${key}.isActive`]: !KEY_MAP[key].isActive,
					});
				}
				if (autoSwitchKey.includes(key)) {
					this.setData({
						...autoSwitchKey.reduce((res, x) => {
							if (key !== x) {
								res[`KEY_MAP.${x}.isActive`] = false;
							}
							return res;
						}, {}),
						isHand: false,
					});
				}
				// 开关
				if (key === "SWITCH") {
					this.setData({
						isStart: !KEY_MAP[key].isActive,
					}, () => {
						if (!this.data.isStart) {
							this.setData({
								...keepKey.reduce((res, key) => {
									res[`KEY_MAP.${key}.isActive`] = false;
									return res;
								}, {}),
								isHand: false,
							});
						}
					});
				}
				// 手动
				if (key === "HAND") {
					this.setData({
						isHand: !isHand,
					}, () => {
						const { isKnead, isKnock, isKpress } = KEY_MAP["STOP"];
						const { isPart, isPoint } = KEY_MAP["POS"];

						// isHand: true(手动) / false(自动)
						const { isHand } = this.data;
						this.setData({
							// 手动 + 按摩手法：滚压 -> 按摩速度(+/-)按钮 disabled
							disabledSpeed: !isHand || isKpress,
							// 手动 + 按摩手法: !(正揉(isKnead) || 捶打(isKnock) || 滚压(isKpress)) -> 宽度调节按钮 disabled
							disabledWidthSwitch: !isHand || !(isKnead || isKnock || isKpress),
							// 手动 + 机芯按摩位置：!(局部(isPart) || 定点(isPoint)) -> 向上/向下调节按钮 disabled
							disabledWalk: !isHand || !(isPart || isPoint),
						});
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

									worker.postMessage({
										data: hexArr,
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
