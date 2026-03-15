const api = require('../../utils/api');
const util = require('../../utils/util');

Page({
  data: {
    isLoggedIn: false,
    showLoginPopup: false,
    userInfo: null,
    bestScores: [],
    friendCount: 0,
    loading: false,
    topScore: null
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
        let topScore = null;
        const bestScores = exams.map(exam => {
          const score = (scoresRes.scores || []).find(s => s.exam_id === exam.id);
          const pct = score ? Number(score.best_percent || 0) : 0;
          const grade = score ? (util.getGrade ? util.getGrade(pct) : (pct >= 95 ? 'S' : pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : 'D')) : '';
          const item = {
            exam_id: exam.id,
            exam_title: exam.name || exam.id,
            exam_color: util.examColor(exam.id),
            has_score: !!score,
            ...(score || {}),
            percentText: score ? pct.toFixed(1) : '0',
            grade: grade,
            durationText: score ? util.formatDuration(score.best_duration) : '',
            session_id: score ? score.session_id : ''
          };
          if (score && (!topScore || pct > Number(topScore.percentText))) {
            topScore = {
              ...item,
              beatPercent: Math.min(99, Math.floor(pct * 1.02))
            };
          }
          return item;
        });
        this.setData({ bestScores, topScore });
      }

      if (friendsRes.ok) {
        this.setData({ friendCount: (friendsRes.friends || []).length });
      }
    } catch (e) {
      console.error('加载数据失败:', e);
    }

    this.setData({ loading: false });
  },

  onViewCert(e) {
    const token = e.currentTarget.dataset.token;
    if (token) {
      wx.navigateTo({ url: `/pages/cert/cert?token=${token}` });
    }
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
            friendCount: 0,
            topScore: null
          });
        }
      }
    });
  },

  onShareAppMessage() {
    const uid = this.data.userInfo?.uid_hash || '';
    return {
      title: '🦞 我的虾考了高分！你的虾行不行？',
      path: uid ? `/pages/index/index?inviter=${uid}` : '/pages/index/index'
    };
  }
});
