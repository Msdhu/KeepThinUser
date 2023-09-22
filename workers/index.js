const autoSwitchKey = ["PRESS", "SPINE", "ACTIVE", "RELAX", "SLEEP", "RELIEF"];

worker.onMessage(res => {
	const hexArr = res.data;
	/*
	 * 十六进制 转 十进制 parseInt(0xFF, 16)
	 * 十进制 转 二进制 (十进制数).toString(2)
	 */
	// 开关状态 ([2: 6])
	const isSwitchKeyPress = ((parseInt(hexArr[2], 16) & 0b01000000) ^ 0b01000000) === 0;
	// 2 表示 暂停状态，即暂停按钮被按下，0 表示 运行状态 ([2: 2])
	const isStopKeyPress = ((parseInt(hexArr[2], 16) & 0b00000010) ^ 0b00000010) === 0;
	// 手动 ([14: 2 ~ 6])
	const isHandKeyPress = ((parseInt(hexArr[14], 16) & 0b01111100) ^ 0b01111100) === 0;
	// 热敷 ([3: 6])
	const isHotKeyPress = ((parseInt(hexArr[3], 16) & 0b01000000) ^ 0b01000000) === 0;

	// 机芯按摩位置(定位 [4: 3 ~ 5]): 局部(isPart)，定点(isPoint)
	const isPart = ((parseInt(hexArr[4], 16) & 0b00111000) ^ 0b00010000) === 0;
	const isPoint = ((parseInt(hexArr[4], 16) & 0b00111000) ^ 0b00011000) === 0;

	// 按摩手法([2: 2 ~ 5]): 正揉(isKnead)/捶打(isKnock)/滚压(isKpress)
	const isKnead = ((parseInt(hexArr[2], 16) & 0b00111100) ^ 0b00000100) === 0;
	const isKnock = ((parseInt(hexArr[2], 16) & 0b00111100) ^ 0b00001000) === 0;
	const isKpress = ((parseInt(hexArr[2], 16) & 0b00111100) ^ 0b00010100) === 0;

  // 是否开机复位中
  const isPowerReset = ((parseInt(hexArr[8], 16) & 0b00001111) ^ 0b00000001) === 0;
  // 是否体型检测中
  const isDetecting = ((parseInt(hexArr[10], 16) & 0b01000000) ^ 0b01000000) === 0;

	worker.postMessage({
		"KEY_MAP.SWITCH.isActive": isSwitchKeyPress,
		"KEY_MAP.STOP.isActive": isStopKeyPress,
		"KEY_MAP.HOT.isActive": isHotKeyPress,
		...autoSwitchKey.reduce((res, key, index) => {
			// 0b00000100 - 0b00011000 (02 - 07 自动程序)
			const flag = ((parseInt(hexArr[14], 16) & 0b01111100) ^ (0b00000000 + index * 4)) === 0;
			res[`KEY_MAP.${key}.isActive`] = flag;
			return res;
		}, {}),
    isPowerReset,
    isDetecting,
		isStart: isSwitchKeyPress,
		isHand: isHandKeyPress,
		// 手动 + 按摩手法：滚压 -> 按摩速度(+/-)按钮 disabled
		disabledSpeed: !isHandKeyPress || isKpress,
		// 手动 + 按摩手法: !(正揉(isKnead) || 捶打(isKnock) || 滚压(isKpress)) -> 宽度调节按钮 disabled
		disabledWidthSwitch: !isHandKeyPress || !(isKnead || isKnock || isKpress),
		// 手动 + 机芯按摩位置：!(局部(isPart) || 定点(isPoint)) -> 向上/向下调节按钮 disabled
		disabledWalk: !isHandKeyPress || !(isPart || isPoint),
	});
});
