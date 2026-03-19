Component({
  data: {
    selected: 0,
    list: [
      {
        pagePath: '/pages/index/index',
        text: '首页',
        icon: '🦞'
      },
      {
        pagePath: '/pages/stats/stats',
        text: '统计',
        icon: '📊'
      },
      {
        pagePath: '/pages/profile/profile',
        text: '我的',
        icon: '👤'
      }
    ]
  },
  methods: {
    switchTab(e) {
      const data = e.currentTarget.dataset;
      wx.switchTab({
        url: data.path
      });
    }
  }
});
