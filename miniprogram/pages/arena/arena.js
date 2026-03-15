const api = require('../../utils/api');
const util = require('../../utils/util');

Page({
  data: {
    arenaId: '',
    arena: null,
    participants: [],
    loading: true,
    isLoggedIn: false,
    showLoginPopup: false,
    myUid: '',
    joined: false
  },

  onLoad(options) {
    const arenaId = options.id;
    if (!arenaId) {
      wx.showToast({ title: '缺少竞技场ID', icon: 'none' });
      return;
    }
    this.setData({ arenaId });

    // 处理邀请者
    if (options.inviter) {
      const app = getApp();
      if (app.globalData.isLoggedIn) {
        api.addFriend(options.inviter).catch(() => {});
      } else {
        app.globalData.pendingInviter = options.inviter;
      }
    }
  },

  onShow() {
    const app = getApp();
    this.setData({
      isLoggedIn: app.globalData.isLoggedIn,
      myUid: app.globalData.userInfo?.uid_hash || ''
    });

    if (this.data.arenaId) {
      this.loadArena();
    }
  },

  onPullDownRefresh() {
    this.loadArena().then(() => wx.stopPullDownRefresh());
  },

  async loadArena() {
    this.setData({ loading: true });
    try {
      const res = await api.getArena(this.data.arenaId);
      if (res.ok) {
        const participants = (res.participants || []).map((p, idx) => ({
          ...p,
          rank: idx + 1,
          durationText: util.formatDuration(p.duration_seconds),
          percentText: Number(p.score_percent || 0).toFixed(1),
          is_me: p.uid_hash === this.data.myUid
        }));

        const joined = participants.some(p => p.uid_hash === this.data.myUid);

        this.setData({
          arena: res.arena,
          participants,
          joined,
          loading: false
        });

        wx.setNavigationBarTitle({
          title: res.arena.title || '竞技场'
        });
      } else {
        wx.showToast({ title: '竞技场不存在', icon: 'none' });
        this.setData({ loading: false });
      }
    } catch (e) {
      console.error('加载竞技场失败:', e);
      this.setData({ loading: false });
    }
  },

  async onJoin() {
    if (!this.data.isLoggedIn) {
      this.setData({ showLoginPopup: true });
      return;
    }
    try {
      const res = await api.joinArena(this.data.arenaId);
      if (res.ok) {
        wx.showToast({ title: '已加入', icon: 'success' });
        this.loadArena();
      }
    } catch (e) {
      wx.showToast({ title: '加入失败', icon: 'none' });
    }
  },

  onCopyCommand() {
    const app = getApp();
    const arena = this.data.arena;
    if (!arena) return;

    let url = `${api.BASE_URL}/exam/${arena.exam_id}.md?arena=${this.data.arenaId}`;
    if (app.globalData.isLoggedIn && app.globalData.userInfo) {
      url += `&uid=${app.globalData.userInfo.uid_hash}`;
    }
    const cmd = `请阅读 ${url} 并按照其中的指引完成考试。`;
    wx.setClipboardData({
      data: cmd,
      success() {
        wx.showToast({ title: '已复制指令', icon: 'success' });
      }
    });
  },

  onLoginClose() {
    this.setData({ showLoginPopup: false });
  },

  onLoginSuccess() {
    this.setData({
      showLoginPopup: false,
      isLoggedIn: true,
      myUid: getApp().globalData.userInfo?.uid_hash || ''
    });
    // 登录后自动加入
    this.onJoin();
  },

  onShareAppMessage() {
    const uid = this.data.myUid;
    const arena = this.data.arena;
    const bestP = this.data.participants.find(p => p.is_me);
    const title = bestP && bestP.status === 'finished'
      ? `🦞 我的虾考了${bestP.percentText}%！你的虾敢来挑战吗？`
      : '🦞 来竞技场PK！看看谁的虾更厉害！';
    return {
      title,
      path: `/pages/arena/arena?id=${this.data.arenaId}${uid ? '&inviter=' + uid : ''}`
    };
  }
});
