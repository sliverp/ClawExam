const api = require('../../utils/api');
const util = require('../../utils/util');

Page({
  data: {
    isLoggedIn: false,
    showLoginPopup: false,
    showShareGuide: false,
    userInfo: null,
    bestScores: [],
    historyList: [],
    friendCount: 0,
    loading: false,
    topScore: null,
    completedExamCount: 0
  },

  async onShow() {
    const app = getApp();
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }

    // 等登录状态验证完成
    if (app.globalData.loginReady) {
      await app.globalData.loginReady;
    }

    this.setData({
      isLoggedIn: app.globalData.isLoggedIn,
      userInfo: app.globalData.userInfo
    });

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
      const [scoresRes, friendsRes, historyRes] = await Promise.all([
        api.getMyBestScores(),
        api.getFriendsList(),
        api.getMyExamHistory()
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
            session_id: score ? (score.best_session_id || score.session_id) : ''
          };
          if (score && (!topScore || pct > Number(topScore.percentText))) {
            topScore = {
              ...item,
              beatPercent: Math.min(99, Math.floor(pct * 1.02))
            };
          }
          return item;
        });
        this.setData({
          bestScores,
          topScore,
          completedExamCount: bestScores.filter(item => item.has_score).length
        });
      }

      // 全部考试历史记录
      if (historyRes.ok) {
        const examMap = {};
        exams.forEach(e => { examMap[e.id] = e; });
        const historyList = (historyRes.history || []).map(h => {
          const exam = examMap[h.exam_id];
          const pct = h.total_max > 0 ? Number((h.total_score * 100 / h.total_max).toFixed(1)) : 0;
          const grade = pct >= 95 ? 'S' : pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : pct >= 40 ? 'D' : 'F';
          return {
            id: h.id,
            exam_id: h.exam_id,
            exam_title: exam ? (exam.name || exam.id) : h.exam_id,
            exam_color: util.examColor(h.exam_id),
            claw_name: h.claw_name,
            model_name: h.model_name,
            total_score: h.total_score,
            total_max: h.total_max,
            percentText: pct.toFixed(1),
            grade,
            started_at: h.started_at,
            dateText: util.formatTime ? util.formatTime(new Date(h.started_at)) : h.started_at,
            answered_count: h.answered_count
          };
        });
        this.setData({ historyList });
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

  onOpenShareGuide() {
    this.setData({ showShareGuide: true });
  },

  onCloseShareGuide() {
    this.setData({ showShareGuide: false });
  },

  onShareFriendSuccess() {
    this.setData({ showShareGuide: false });
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
            historyList: [],
            friendCount: 0,
            topScore: null,
            completedExamCount: 0
          });
        }
      }
    });
  },

  onShareAppMessage() {
    const uid = this.data.userInfo?.uid_hash || '';
    const topScore = this.data.topScore;
    return {
      title: topScore
        ? `🦞 我的虾在「${topScore.exam_title}」考了 ${topScore.percentText}%！`
        : '🦞 我的虾考了高分！你的虾行不行？',
      path: uid ? `/pages/index/index?inviter=${uid}` : '/pages/index/index'
    };
  },

  onShareTimeline() {
    const uid = this.data.userInfo?.uid_hash || '';
    const topScore = this.data.topScore;
    return {
      title: topScore
        ? `我的虾在「${topScore.exam_title}」考了 ${topScore.percentText}%`
        : '考了个虾 · 你的虾到底行不行？',
      query: uid ? `inviter=${uid}` : ''
    };
  }
});
