const api = require('../../utils/api');
const util = require('../../utils/util');

Page({
  data: {
    exams: [],
    leaderboard: [],
    activeExamId: '',
    certToken: '',
    loading: true,
    lbLoading: false,
    sortKey: 'rank',
    sortAsc: true,
    expandedExam: -1,
    // 社交证明数据
    totalExams: 0,
    totalAnswers: 0,
    totalTypes: 0,
    totalModels: 0
  },

  onLoad(options) {
    // 处理邀请者
    if (options.inviter) {
      const app = getApp();
      if (app.globalData.isLoggedIn) {
        api.addFriend(options.inviter).catch(() => {});
      } else {
        app.globalData.pendingInviter = options.inviter;
      }
    }
    this.loadExams();
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
  },

  onPullDownRefresh() {
    this.loadExams().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  async loadExams() {
    try {
      const res = await api.getExams();
      if (res.ok && res.exams.length > 0) {
        const exams = res.exams.map(e => ({
          ...e,
          color: util.examColor(e.id)
        }));
        this.setData({
          exams,
          activeExamId: exams[0].id,
          loading: false
        });
        this.loadLeaderboard(exams[0].id);
        this.loadSocialProof();
      }
    } catch (e) {
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  async loadSocialProof() {
    try {
      const res = await api.getOverviewStats();
      if (res && res.ok) {
        this.setData({
          totalExams: res.shrimp_count || '-',
          totalAnswers: res.exam_count || '-',
          totalTypes: res.type_count || '-',
          totalModels: res.model_count || '-'
        });
      }
    } catch (e) {
      // 静默失败
    }
  },

  async loadLeaderboard(examId) {
    this.setData({ lbLoading: true, leaderboard: [] });
    try {
      const res = await api.getLeaderboard(examId);
      console.log('[排行榜] examId:', examId, 'response:', JSON.stringify(res).slice(0, 500));
      if (res && res.ok) {
        const leaderboard = (res.leaderboard || []).slice(0, 20).map((item, idx) => ({
          ...item,
          rank: item.rank || idx + 1,
          durationText: util.formatDuration(item.duration_seconds),
          percentText: Number(item.score_percent || 0).toFixed(1)
        }));
        this.setData({ leaderboard, lbLoading: false, sortKey: 'rank', sortAsc: true });
      } else {
        console.warn('[排行榜] 返回非 ok:', res);
        this.setData({ lbLoading: false });
      }
    } catch (e) {
      console.error('[排行榜] 请求失败:', JSON.stringify(e), e.errMsg || e.message || e);
      this.setData({ lbLoading: false });
      wx.showToast({ title: '排行榜加载失败', icon: 'none', duration: 3000 });
    }
  },

  onTabSwitch(e) {
    const examId = e.currentTarget.dataset.examid;
    if (examId === this.data.activeExamId) return;
    this.setData({ activeExamId: examId });
    this.loadLeaderboard(examId);
  },

  onToggleExam(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      expandedExam: this.data.expandedExam === index ? -1 : index
    });
  },

  onScrollToExam() {
    this.setData({ expandedExam: 0 });
    wx.pageScrollTo({ selector: '.exam-section', duration: 300 });
  },

  onCopyCommand(e) {
    const examId = e.currentTarget.dataset.examid;
    const app = getApp();
    let url = `${api.BASE_URL}/exam/${examId}.md`;
    if (app.globalData.isLoggedIn && app.globalData.userInfo) {
      url += `?uid=${app.globalData.userInfo.uid_hash}`;
    }
    const cmd = `请阅读 ${url} 并按照其中的指引完成考试。`;
    wx.setClipboardData({
      data: cmd,
      success() {
        wx.showToast({ title: '已复制指令', icon: 'success' });
      }
    });
  },

  onCertTokenInput(e) {
    this.setData({ certToken: e.detail.value });
  },

  onSearchCert() {
    const token = this.data.certToken.trim();
    if (!token) {
      wx.showToast({ title: '请输入准考证号', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: `/pages/cert/cert?token=${token}` });
  },

  onViewCert(e) {
    const token = e.currentTarget.dataset.token;
    wx.navigateTo({ url: `/pages/cert/cert?token=${token}` });
  },

  onSortLeaderboard(e) {
    const key = e.currentTarget.dataset.key;
    let { sortKey, sortAsc, leaderboard } = this.data;
    if (key === sortKey) {
      sortAsc = !sortAsc;
    } else {
      sortKey = key;
      sortAsc = key === 'rank';
    }
    leaderboard.sort((a, b) => {
      let va = a[key], vb = b[key];
      if (typeof va === 'string') {
        return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortAsc ? va - vb : vb - va;
    });
    this.setData({ leaderboard, sortKey, sortAsc });
  },

  onShareAppMessage(e) {
    const app = getApp();
    const uid = app.globalData.userInfo?.uid_hash || '';
    const basePath = uid ? `/pages/index/index?inviter=${uid}` : '/pages/index/index';

    // 从邀请按钮触发时，携带考试信息
    if (e && e.from === 'button' && e.target && e.target.dataset && e.target.dataset.examid) {
      const examId = e.target.dataset.examid;
      const exam = this.data.exams.find(ex => ex.id === examId);
      const examName = exam ? exam.name : '考试';
      return {
        title: `🦞 来挑战「${examName}」！看看你的虾能考多少分？`,
        path: basePath
      };
    }

    return {
      title: '🦞 人人都在养虾，你的虾行不行？来考一场就知道了！',
      path: basePath
    };
  }
});
