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
    showArenaMenu: false,
    // 排行榜状态
    lbMyBest: null,  // 当前登录用户在此exam的最佳成绩
    lbHasNoData: false,  // 标记是否未参加过此考试
    lbShowEmpty: false  // 是否显示"快来考试"提示
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
      lbMyBest: null,
      lbHasNoData: false
    });
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

        // 如果登录了，获取用户自己的最佳成绩
        const app = getApp();
        let myBestScore = null;
        let myRank = -1;
        let lbMySection = [];
        let lbHasNoData = false;

        if (app.globalData.isLoggedIn) {
          try {
            const scoresRes = await api.getMyBestScores();
            if (scoresRes && scoresRes.ok && scoresRes.scores) {
              // 找到当前exam的最佳成绩
              myBestScore = scoresRes.scores.find(s => s.exam_id === examId);
              
              if (myBestScore) {
                // 在排行榜中查找匹配的位置（基于score_percent和duration_seconds）
                myRank = fullList.findIndex(item => 
                  Math.abs(item.score_percent - myBestScore.score_percent) < 0.01 &&
                  item.duration_seconds === myBestScore.duration_seconds &&
                  item.claw_name === myBestScore.claw_name
                );

                if (myRank >= 0) {
                  const actualRank = myRank + 1;
                  console.log('[排行榜] 找到用户的虾在排行榜中的位置:', actualRank);
                  
                  // 如果本人在前3名内，标记一下
                  if (myRank < 3) {
                    top3[myRank].isMe = true;
                    myBestScore.rank = actualRank;
                  } else {
                    // 本人不在前3名，展示本人前后各2位
                    const start = Math.max(3, myRank - 2);
                    const end = Math.min(fullList.length - 1, myRank + 2);
                    for (let i = start; i <= end; i++) {
                      lbMySection.push({
                        ...fullList[i],
                        isMe: i === myRank
                      });
                    }
                    // 判断是否有间隔
                    const hasGap = start > 3;
                    this.setData({ lbHasGap: hasGap });
                    myBestScore.rank = actualRank;
                  }
                } else {
                  console.warn('[排行榜] 未能在排行榜中找到用户的虾，可能被过滤或未提交');
                  lbHasNoData = true;
                }
              } else {
                // 用户在此exam没有最佳成绩
                console.log('[排行榜] 用户在此exam未参加过考试');
                lbHasNoData = true;
              }
            }
          } catch (e) {
            console.warn('[排行榜] 获取用户最佳成绩失败:', e);
            // 静默失败，只展示全局排行榜
          }
        }

        // 计算是否显示"快来考试"提示：未参加且本人不在前3名中
        const meInTop3 = top3.some(item => item.isMe);
        const lbShowEmpty = lbHasNoData && !meInTop3;

        this.setData({
          leaderboard: top3,
          lbMySection,
          lbMyRank: myRank >= 0 ? myRank + 1 : -1,
          lbMyBest: myBestScore,
          lbHasNoData,
          lbShowEmpty,
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
