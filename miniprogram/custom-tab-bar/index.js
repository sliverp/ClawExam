Component({
  data: {
    selected: 0,
    list: [
      {
        pagePath: "/pages/index/index",
        text: "首页",
        icon: "🏠",
      },
      {
        pagePath: "/pages/stats/stats",
        text: "统计",
        icon: "📊",
      }
    ]
  },
  methods: {
    switchTab(e) {
      const data = e.currentTarget.dataset;
      const url = this.data.list[data.index].pagePath;
      wx.switchTab({ url });
    }
  }
});
