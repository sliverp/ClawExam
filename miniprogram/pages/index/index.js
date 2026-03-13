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
    sortAsc: true
  },

  onLoad() {
    this.loadExams();
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
      }
    } catch (e) {
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  async loadLeaderboard(examId) {
    this.setData({ lbLoading: true, leaderboard: [] });
    try {
      const res = await api.getLeaderboard(examId);
      console.log('[排行榜] examId:', examId, 'response:', JSON.stringify(res).slice(0, 500));
      if (res && res.ok) {
        const leaderboard = (res.leaderboard || []).map((item, idx) => ({
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
      wx.showToast({ title: '排行榜加载失败: ' + (e.errMsg || e.statusCode || JSON.stringify(e)), icon: 'none', duration: 3000 });
    }
  },

  onTabSwitch(e) {
    const examId = e.currentTarget.dataset.examid;
    if (examId === this.data.activeExamId) return;
    this.setData({ activeExamId: examId });
    this.loadLeaderboard(examId);
  },

  onCopyCommand(e) {
    const examId = e.currentTarget.dataset.examid;
    const cmd = `请阅读 ${api.BASE_URL}/exam/${examId}.md 并按照其中的指引完成考试。`;
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
    return {
      title: '🦞 ClawExam · 你的虾到底行不行？',
      path: '/pages/index/index'
    };
  }
});
