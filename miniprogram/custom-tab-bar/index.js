Component({
  data: {
    selected: 0,
    list: [
      {
        pagePath: '/pages/index/index',
        text: '首页',
        iconNormal: '/assets/icon/【烤虾】未选择状态.png',
        iconActive: '/assets/icon/【考虾】选择状态.png'
      },
      {
        pagePath: '/pages/stats/stats',
        text: '统计',
        iconNormal: '/assets/icon/【统计】未选择状态.png',
        iconActive: '/assets/icon/【统计】选择状态.png'
      },
      {
        pagePath: '/pages/profile/profile',
        text: '我的',
        iconNormal: '/assets/icon/【我的】未选择状态.png',
        iconActive: '/assets/icon/【我的】选择状态.png'
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
