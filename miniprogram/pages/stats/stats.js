const api = require('../../utils/api');
const util = require('../../utils/util');

Page({
  data: {
    exams: [],
    activeExamId: '',
    loading: true,
    statsLoading: false,
    modelCount: [],
    typeCount: [],
    modelScore: [],
    typeScore: []
  },

  onLoad() {
    this.loadExams();
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
  },

  onPullDownRefresh() {
    this.loadStats(this.data.activeExamId).then(() => {
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
        this.loadStats(exams[0].id);
      }
    } catch (e) {
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  async loadStats(examId) {
    this.setData({ statsLoading: true });
    try {
      const res = await api.getStats(examId);
      if (res.ok) {
        // 计算最大值用于进度条
        const mcMax = res.model_count.length ? res.model_count[0].count : 1;
        const tcMax = res.type_count.length ? res.type_count[0].count : 1;

        const modelCount = res.model_count.map((item, idx) => ({
          ...item,
          rank: idx + 1,
          rankTone: this.getRankTone(idx),
          displayName: this.compactName(item.model_name),
          percent: (item.count / mcMax * 100).toFixed(0)
        }));
        const typeCount = res.type_count.map((item, idx) => ({
          ...item,
          rank: idx + 1,
          rankTone: this.getRankTone(idx),
          displayName: this.compactName(item.claw_type),
          percent: (item.count / tcMax * 100).toFixed(0)
        }));
        const modelScore = res.model_score.map((item, idx) => {
          const avgPct = item.avg_percent || item.avg_score || 0;
          return {
            ...item,
            rank: idx + 1,
            rankTone: this.getRankTone(idx),
            displayName: this.compactName(item.model_name, 22),
            avg_percent: avgPct,
            avgPercentText: avgPct ? Number(avgPct).toFixed(1) : '0'
          };
        });
        const typeScore = res.type_score.map((item, idx) => {
          const avgPct = item.avg_percent || item.avg_score || 0;
          return {
            ...item,
            rank: idx + 1,
            rankTone: this.getRankTone(idx),
            displayName: this.compactName(item.claw_type, 18),
            avg_percent: avgPct,
            avgPercentText: avgPct ? Number(avgPct).toFixed(1) : '0'
          };
        });

        this.setData({ modelCount, typeCount, modelScore, typeScore, statsLoading: false });
      }
    } catch (e) {
      this.setData({ statsLoading: false });
    }
  },

  onTabSwitch(e) {
    const examId = e.currentTarget.dataset.examid;
    if (examId === this.data.activeExamId) return;
    this.setData({ activeExamId: examId });
    this.loadStats(examId);
  },

  getRankTone(idx) {
    if (idx === 0) return '1';
    if (idx === 1) return '2';
    if (idx === 2) return '3';
    return 'other';
  },

  compactName(name, maxLength = 32) {
    const text = String(name || '');
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength)}…`;
  },

  onShareAppMessage() {
    const app = getApp();
    const uid = app.globalData.userInfo?.uid_hash || '';
    return {
      title: '🦞 考了个虾 · 数据统计',
      path: uid ? `/pages/index/index?inviter=${uid}` : '/pages/stats/stats'
    };
  }
});
