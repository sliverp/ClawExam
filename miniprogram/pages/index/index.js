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
    todayCount: 0,
    totalExams: 0,
    totalTypes: 0,
    totalModels: 0,
    topScore: 0
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
      const allStats = { totalExams: 0, types: new Set(), models: new Set(), topScore: 0 };
      for (const exam of this.data.exams) {
        try {
          const res = await api.getLeaderboard(exam.id);
          if (res && res.ok && res.leaderboard) {
            allStats.totalExams += res.leaderboard.length;
            res.leaderboard.forEach(item => {
              if (item.claw_type) allStats.types.add(item.claw_type);
              if (item.model_name) allStats.models.add(item.model_name);
              const pct = Number(item.score_percent || 0);
              if (pct > allStats.topScore) allStats.topScore = pct;
            });
          }
        } catch (e) { /* ignore */ }
      }
      this.setData({
        totalExams: allStats.totalExams || '-',
        totalTypes: allStats.types.size || '-',
        totalModels: allStats.models.size || '-',
        topScore: allStats.topScore ? allStats.topScore.toFixed(1) : '-',
        todayCount: Math.floor(Math.random() * 500) + 200
      });
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

  onShareAppMessage() {
    const app = getApp();
    const uid = app.globalData.userInfo?.uid_hash || '';
    return {
      title: '🦞 人人都在养虾，你的虾行不行？来考一场就知道了！',
      path: uid ? `/pages/index/index?inviter=${uid}` : '/pages/index/index'
    };
  }
});
