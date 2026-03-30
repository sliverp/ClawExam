const api = require('../../utils/api');
const util = require('../../utils/util');

Page({
  data: {
    isLoggedIn: false,
    showLoginPopup: false,
    leaderboard: [],
    exams: [],
    activeExamId: '',
    loading: false,
    myUid: '',
    friendCount: 0
  },

  async onShow() {
    const app = getApp();

    // 等登录状态验证完成
    if (app.globalData.loginReady) {
      await app.globalData.loginReady;
    }

    const isLoggedIn = app.globalData.isLoggedIn;
    this.setData({
      isLoggedIn,
      myUid: app.globalData.userInfo?.uid_hash || ''
    });

    if (!isLoggedIn) {
      app.checkLoginOrPrompt('登录后才能查看好友排行榜，是否现在登录？');
    } else {
      this.loadData();
    }
  },

  onPullDownRefresh() {
    if (this.data.isLoggedIn) {
      this.loadData().then(() => wx.stopPullDownRefresh());
    } else {
      wx.stopPullDownRefresh();
    }
  },

  async loadData() {
    const app = getApp();
    const exams = app.globalData.exams;
    if (exams.length) {
      const activeExamId = this.data.activeExamId || exams[0].id;
      this.setData({
        exams: exams.map(e => ({ ...e, color: util.examColor(e.id) })),
        activeExamId
      });
      // 并行加载排行榜和好友总数
      const [, friendsRes] = await Promise.all([
        this.loadLeaderboard(activeExamId),
        api.getFriendsList()
      ]);
      if (friendsRes && friendsRes.ok) {
        this.setData({ friendCount: (friendsRes.friends || []).length });
      }
    }
  },

  async loadLeaderboard(examId) {
    this.setData({ loading: true });
    try {
      const res = await api.getFriendsLeaderboard(examId);
      if (res.ok) {
        const leaderboard = (res.leaderboard || []).map((item, idx) => ({
          ...item,
          rank: idx + 1,
          is_me: item.uid_hash === this.data.myUid,
          durationText: util.formatDuration(item.best_duration),
          percentText: Number(item.best_percent || 0).toFixed(1),
          scoreValue: Number(item.total_score || 0),
          maxValue: Number(item.total_max || 0),
          dateText: item.started_at ? this.formatLeaderboardTime(item.started_at) : ''
        }));
        this.setData({ leaderboard, loading: false });
      } else {
        this.setData({ loading: false });
      }
    } catch (e) {
      console.error('好友排行榜加载失败:', e);
      this.setData({ loading: false });
    }
  },

  onTabSwitch(e) {
    const examId = e.currentTarget.dataset.examid;
    if (examId === this.data.activeExamId) return;
    this.setData({ activeExamId: examId });
    this.loadLeaderboard(examId);
  },

  formatLeaderboardTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return '';
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / 86400000);
    if (days <= 0) return '今天';
    if (days < 30) return `${days}天前`;
    return `${date.getMonth() + 1}月${date.getDate()}日`;
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
      myUid: getApp().globalData.userInfo?.uid_hash || ''
    });
    this.loadData();
  },

  onShareAppMessage() {
    const uid = this.data.myUid;
    return {
      title: '🦞 快来看看你的虾能考多少分！',
      path: uid ? `/pages/index/index?inviter=${uid}` : '/pages/index/index'
    };
  }
});
