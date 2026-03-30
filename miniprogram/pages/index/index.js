const api = require('../../utils/api');
const util = require('../../utils/util');

Page({
  data: {
    exams: [],
    heroImageUrl: util.assetUrl('home/hero/504dc413-30ff-42f0-af08-2d399e703344.png'),
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
    showArenaMenu: false,
    // 排行榜状态
    lbHasRecord: false,  // 当前登录用户是否在此exam有排行记录
    lbTotalCount: 0,     // 排行榜总人数
    // 登录引导
    showLoginGuide: false,
    showLoginPopup: false,
    pendingCopyExamId: ''  // 暂存待复制的考试ID
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
    this.setData({ 
      lbLoading: true, 
      leaderboard: [], 
      lbMySection: [], 
      lbMyRank: -1, 
      lbHasGap: false,
      lbHasRecord: false,
      lbTotalCount: 0
    });
    try {
      const app = getApp();
      const uid = app.globalData.isLoggedIn ? (app.globalData.userInfo?.uid_hash || '') : '';
      const res = await api.getLeaderboard(examId, uid);
      console.log('[排行榜] examId:', examId, 'uid:', uid, 'response:', JSON.stringify(res).slice(0, 500));
      if (res && res.ok) {
        const formatItem = (item) => ({
          ...item,
          durationText: util.formatDuration(item.duration_seconds),
          percentText: Number(item.score_percent || 0).toFixed(1)
        });

        // 未登录时后端返回100条，小程序只取前10条展示
        const rawList = (res.leaderboard || []).map(formatItem);
        const lbHasRecord = res.has_record || false;
        const leaderboard = lbHasRecord ? rawList : rawList.slice(0, 10);
        const lbMySection = (res.my_section || []).map(formatItem);
        const lbMyRank = res.my_rank || -1;
        const lbHasGap = res.has_gap || false;
        const lbTotalCount = res.total_count || 0;

        this.setData({
          leaderboard,
          lbMySection,
          lbMyRank,
          lbHasGap,
          lbHasRecord,
          lbTotalCount,
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

    // 未登录时弹出登录引导
    if (!app.globalData.isLoggedIn) {
      this.setData({ showLoginGuide: true, pendingCopyExamId: examId });
      return;
    }

    this._doCopy(examId);
  },

  _doCopy(examId) {
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

  // 腾讯安全认证徽章点击 → 查看扫描证书
  onSecurityBadgeTap(e) {
    const examId = e.currentTarget.dataset.examid;
    const certUrls = {
      v1: 'https://tix.qq.com/search/skill?keyword=9ef8083278387fcdb42ba101f3cd21e7',
      v2: 'https://tix.qq.com/search/skill?keyword=9f0d49e09b8d25e038c028be9dc925cb',
      v3: 'https://tix.qq.com/search/skill?keyword=7c46e10d397ab421ee2d808953306e4c'
    };
    const url = certUrls[examId];
    if (url) {
      wx.showModal({
        title: '腾讯安全 Skill 扫描证书',
        content: '该试卷已通过腾讯安全扫描认证，点击"复制链接"可在浏览器中查看完整证书。',
        confirmText: '复制链接',
        cancelText: '关闭',
        success(res) {
          if (res.confirm) {
            wx.setClipboardData({
              data: url,
              success() {
                wx.showToast({ title: '链接已复制，请在浏览器中打开', icon: 'none', duration: 2500 });
              }
            });
          }
        }
      });
    }
  },

  // 登录引导弹框
  onCloseLoginGuide() {
    this.setData({ showLoginGuide: false, pendingCopyExamId: '' });
  },

  onLoginGuideConfirm() {
    this.setData({ showLoginGuide: false, showLoginPopup: true });
  },

  onLoginGuideSkip() {
    const examId = this.data.pendingCopyExamId;
    this.setData({ showLoginGuide: false, pendingCopyExamId: '' });
    if (examId) {
      this._doCopy(examId);
    }
  },

  onLoginPopupClose() {
    // 用户关闭登录弹窗，仍然执行复制
    const examId = this.data.pendingCopyExamId;
    this.setData({ showLoginPopup: false, pendingCopyExamId: '' });
    if (examId) {
      this._doCopy(examId);
    }
  },

  onLoginSuccess() {
    // 登录成功后执行复制（此时带uid）
    const examId = this.data.pendingCopyExamId;
    this.setData({ showLoginPopup: false, pendingCopyExamId: '' });
    if (examId) {
      this._doCopy(examId);
    }
    // 刷新排行榜以显示用户排名
    this.loadLeaderboard(this.data.activeExamId);
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
    if (!token) {
      return;
    }
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
