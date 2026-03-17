const api = require('../../utils/api');
const util = require('../../utils/util');

Page({
  data: {
    exams: [],
    leaderboard: [],
    lbMySection: [],
    lbMyRank: -1,
    lbHasGap: false,
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
    totalModels: 0,
    // 竞技场菜单
    showArenaMenu: false
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
    this.setData({ lbLoading: true, leaderboard: [], lbMySection: [], lbMyRank: -1, lbHasGap: false });
    try {
      const res = await api.getLeaderboard(examId);
      console.log('[排行榜] examId:', examId, 'response:', JSON.stringify(res).slice(0, 500));
      if (res && res.ok) {
        const fullList = (res.leaderboard || []).map((item, idx) => ({
          ...item,
          rank: item.rank || idx + 1,
          durationText: util.formatDuration(item.duration_seconds),
          percentText: Number(item.score_percent || 0).toFixed(1)
        }));

        // 前三名
        const top3 = fullList.slice(0, 3);

        // 查找本人在排行榜中的位置
        const app = getApp();
        const myUid = app.globalData.userInfo?.uid_hash || '';
        let myIdx = -1;
        if (myUid) {
          myIdx = fullList.findIndex(item => item.uid_hash === myUid);
        }

        let lbMySection = [];
        let lbMyRank = -1;
        let lbHasGap = false;

        if (myIdx >= 0) {
          lbMyRank = fullList[myIdx].rank;
          // 如果本人在前3名内，不需要额外展示
          if (myIdx >= 3) {
            // 本人前后2位
            const start = Math.max(3, myIdx - 2);
            const end = Math.min(fullList.length - 1, myIdx + 2);
            for (let i = start; i <= end; i++) {
              lbMySection.push({
                ...fullList[i],
                isMe: i === myIdx
              });
            }
            // 判断是否有间隔（本人区域与前三名不连续）
            lbHasGap = start > 3;
          } else {
            // 本人在前3名中，标记一下
            top3[myIdx].isMe = true;
          }
        }

        this.setData({
          leaderboard: top3,
          lbMySection,
          lbMyRank,
          lbHasGap,
          lbLoading: false,
          sortKey: 'rank',
          sortAsc: true
        });
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

  onOpenArenaMenu() {
    this.setData({ showArenaMenu: true });
  },

  onCloseArenaMenu() {
    this.setData({ showArenaMenu: false });
  },

  onGoArenaList() {
    this.setData({ showArenaMenu: false });
    wx.navigateTo({ url: '/pages/arena-list/arena-list' });
  },

  onGoFriends() {
    this.setData({ showArenaMenu: false });
    wx.navigateTo({ url: '/pages/friends/friends' });
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
