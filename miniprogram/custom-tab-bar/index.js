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
        pagePath: '/pages/friends/friends',
        text: '好友',
        icon: '👥'
      },
      {
        pagePath: '/pages/arena-list/arena-list',
        text: '竞技',
        icon: '⚔️'
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
