const api = require('../../utils/api');
const util = require('../../utils/util');

Page({
  data: {
    isLoggedIn: false,
    showLoginPopup: false,
    arenas: [],
    loading: false,
    joinCode: '',
    exams: [],
    createExamId: '',
    creating: false
  },

  async onShow() {
    const app = getApp();

    // 等登录状态验证完成
    if (app.globalData.loginReady) {
      await app.globalData.loginReady;
    }

    const isLoggedIn = app.globalData.isLoggedIn;
    const exams = (app.globalData.exams || []).map(e => ({
      ...e,
      color: util.examColor(e.id)
    }));
    this.setData({
      isLoggedIn,
      exams,
      createExamId: this.data.createExamId || exams[0]?.id || ''
    });

    if (!isLoggedIn) {
      app.checkLoginOrPrompt('登录后才能创建和加入竞技场，是否现在登录？');
    } else {
      this.loadMyArenas();
    }
  },

  onPullDownRefresh() {
    if (this.data.isLoggedIn) {
      this.loadMyArenas().then(() => wx.stopPullDownRefresh());
    } else {
      wx.stopPullDownRefresh();
    }
  },

  async loadMyArenas() {
    this.setData({ loading: true });
    try {
      const res = await api.getMyArenas();
      if (res.ok) {
        const examMap = (this.data.exams || []).reduce((acc, exam) => {
          acc[exam.id] = exam;
          return acc;
        }, {});
        const arenas = (res.arenas || []).map(a => ({
          ...a,
          created_at_text: util.formatTime(a.created_at),
          exam_color: util.examColor(a.exam_id),
          statusText: a.status === 'finished' ? '已结束' : '进行中',
          exam_title: examMap[a.exam_id]?.name || a.exam_name || a.exam_id,
          exam_version: a.exam_id
        }));
        this.setData({ arenas, loading: false });
      } else {
        this.setData({ loading: false });
      }
    } catch (e) {
      console.error('加载竞技场列表失败:', e);
      this.setData({ loading: false });
    }
  },

  onSelectExam(e) {
    const examId = e.currentTarget.dataset.examid;
    this.setData({ createExamId: examId });
  },

  async onCreate() {
    const examId = this.data.createExamId;
    if (!examId) {
      wx.showToast({ title: '请先选择试卷', icon: 'none' });
      return;
    }
    this.setData({ creating: true });
    try {
      const result = await api.createArena({ exam_id: examId });
      if (result.ok) {
        wx.navigateTo({ url: `/pages/arena/arena?id=${result.arena.id}` });
      } else {
        wx.showToast({ title: result.error || '创建失败', icon: 'none' });
      }
    } catch (e) {
      wx.showToast({ title: '创建失败', icon: 'none' });
    }
    this.setData({ creating: false });
  },

  onJoinCodeInput(e) {
    this.setData({ joinCode: e.detail.value.toUpperCase() });
  },

  onJoinByCode() {
    const code = this.data.joinCode.trim();
    if (!code) {
      wx.showToast({ title: '请输入房间号', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: `/pages/arena/arena?id=${code}` });
  },

  onGoArena(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/arena/arena?id=${id}` });
  },

  onGoLogin() {
    this.setData({ showLoginPopup: true });
  },

  onLoginClose() {
    this.setData({ showLoginPopup: false });
  },

  onLoginSuccess() {
    this.setData({ showLoginPopup: false, isLoggedIn: true });
    this.loadMyArenas();
  },

  onShareAppMessage() {
    const uid = getApp().globalData.userInfo?.uid_hash || '';
    return {
      title: '🦞 来竞技场PK！看看谁的虾更厉害！',
      path: uid ? `/pages/index/index?inviter=${uid}` : '/pages/index/index'
    };
  }
});
