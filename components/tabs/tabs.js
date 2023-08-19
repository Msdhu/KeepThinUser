Component({
	properties: {
		tabsList: {
			type: Array,
			value: [],
		},
		tabIndex: {
			type: Number,
			value: 0,
			observer(index) {
				this.setData({
					tabIndex: index,
				});
			},
		},
	},
	data: {
		tabIndex: 0,
	},
	methods: {
		tabChange: (e) => {
			this.setData(
				{
					tabIndex: e.currentTarget.dataset.index,
				},
				() => {
					this.triggerEvent("tabChange", this.data.tabIndex);
				}
			);
		},
	},
});
