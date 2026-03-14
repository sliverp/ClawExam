const api = require('../../utils/api');
const util = require('../../utils/util');

Page({
  data: {
    isLoggedIn: false,
    showLoginPopup: false,
    userInfo: null,
    bestScores: [],
    friendCount: 0,
    loading: false
  },

  onShow() {
    const app = getApp();
    this.setData({
      isLoggedIn: app.globalData.isLoggedIn,
      userInfo: app.globalData.userInfo
    });
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 4 });
    }

    if (app.globalData.isLoggedIn) {
      this.loadMyData();
    }
  },

  onPullDownRefresh() {
    if (this.data.isLoggedIn) {
      this.loadMyData().then(() => wx.stopPullDownRefresh());
    } else {
      wx.stopPullDownRefresh();
    }
  },

  async loadMyData() {
    this.setData({ loading: true });

    try {
      const [scoresRes, friendsRes] = await Promise.all([
        api.getMyBestScores(),
        api.getFriendsList()
      ]);

      const app = getApp();
      const exams = app.globalData.exams;

      if (scoresRes.ok) {
        const bestScores = exams.map(exam => {
          const score = (scoresRes.scores || []).find(s => s.exam_id === exam.id);
          return {
            exam_id: exam.id,
            exam_title: exam.name || exam.id,
            exam_color: util.examColor(exam.id),
            has_score: !!score,
            ...(score || {}),
            percentText: score ? Number(score.best_percent || 0).toFixed(1) : '0',
            durationText: score ? util.formatDuration(score.best_duration) : ''
          };
        });
        this.setData({ bestScores });
      }

      if (friendsRes.ok) {
        this.setData({ friendCount: (friendsRes.friends || []).length });
      }
    } catch (e) {
      console.error('加载数据失败:', e);
    }

    this.setData({ loading: false });
  },

  onGoLogin() {
    this.setData({ showLoginPopup: true });
  },

  onLoginClose() {
    this.setData({ showLoginPopup: false });
  },

  onLoginSuccess() {
    this.setData({
      showLoginPopup: false,
      isLoggedIn: true,
      userInfo: getApp().globalData.userInfo
    });
    this.loadMyData();
  },

  onGoStats() {
    wx.switchTab({ url: '/pages/stats/stats' });
  },

  onLogout() {
    wx.showModal({
      title: '确认退出',
      content: '退出后需要重新登录才能使用好友排行榜和竞技场功能',
      success: (res) => {
        if (res.confirm) {
          getApp().logout();
          this.setData({
            isLoggedIn: false,
            userInfo: null,
            bestScores: [],
            friendCount: 0
          });
        }
      }
    });
  },

  onShareAppMessage() {
    const uid = this.data.userInfo?.uid_hash || '';
    return {
      title: '🦞 人人都在养虾，来考一场就知道你的虾行不行！',
      path: uid ? `/pages/index/index?inviter=${uid}` : '/pages/index/index'
    };
  }
});
