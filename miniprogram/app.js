App({
  globalData: {
    exams: [],
    examsLoaded: false,
    userInfo: null,
    appToken: null,
    isLoggedIn: false,
    pendingInviter: null,
    loginReady: null  // Promise，resolve 后表示登录状态已确认
  },

  onLaunch() {
    this.loadExams();
    this.checkLoginStatus();
  },

  loadExams() {
    const api = require('./utils/api');
    api.getExams().then(res => {
      if (res.ok) {
        this.globalData.exams = res.exams;
        this.globalData.examsLoaded = true;
      }
    }).catch(() => {});
  },

  checkLoginStatus() {
    const token = wx.getStorageSync('app_token');
    const userInfo = wx.getStorageSync('user_info');
    if (token && userInfo) {
      // 先恢复本地缓存状态
      this.globalData.appToken = token;
      this.globalData.userInfo = userInfo;
      this.globalData.isLoggedIn = true;
      // 向后端验证 token 有效性，并用最新数据更新
      const api = require('./utils/api');
      this.globalData.loginReady = api.getUserInfo().then(res => {
        if (res.ok && res.user) {
          // 用后端最新数据更新本地缓存
          const freshInfo = {
            uid_hash: res.user.uid_hash,
            nickname: res.user.nickname,
            avatar_url: res.user.avatar_url
          };
          this.globalData.userInfo = freshInfo;
          wx.setStorageSync('user_info', freshInfo);
        }
      }).catch((err) => {
        // authRequest 遇到 401 会自动 silentReLogin 重试
        // 如果重试后还是失败才到这里
        if (err && err.statusCode === 401) {
          // 静默重登也失败了，登出
          this.logout();
        } else {
          // 网络异常：保持本地登录态
          console.warn('checkLoginStatus 网络异常，保持本地登录态');
        }
      });
    } else {
      this.globalData.loginReady = Promise.resolve();
    }
  },

  login(token, userInfo) {
    this.globalData.appToken = token;
    this.globalData.userInfo = userInfo;
    this.globalData.isLoggedIn = true;
    wx.setStorageSync('app_token', token);
    wx.setStorageSync('user_info', userInfo);

    // 处理暂存的邀请者
    if (this.globalData.pendingInviter) {
      const api = require('./utils/api');
      api.addFriend(this.globalData.pendingInviter).catch(() => {});
      this.globalData.pendingInviter = null;
    }
  },

  logout() {
    this.globalData.appToken = null;
    this.globalData.userInfo = null;
    this.globalData.isLoggedIn = false;
    wx.removeStorageSync('app_token');
    wx.removeStorageSync('user_info');
  },

  /**
   * 静默重新登录：用 wx.login() 获取新 code，携带本地缓存的昵称/头像
   * 自动调 /api/wx-login 续期 token，用户无感知
   */
  async silentReLogin() {
    try {
      const cachedInfo = wx.getStorageSync('user_info');
      if (!cachedInfo || !cachedInfo.nickname) {
        this.logout();
        return;
      }
      const { code } = await wx.login();
      const api = require('./utils/api');
      const res = await api.wxLogin({
        code,
        nickname: cachedInfo.nickname,
        avatar_url: cachedInfo.avatar_url || ''
      });
      if (res.ok) {
        this.login(res.app_token, {
          uid_hash: res.uid_hash,
          nickname: res.nickname,
          avatar_url: res.avatar_url
        });
      } else {
        this.logout();
      }
    } catch (e) {
      console.warn('静默重登失败:', e);
      // 静默失败不登出，保持本地态，等用户手动操作
    }
  },

  checkLoginOrPrompt(message) {
    if (this.globalData.isLoggedIn) return true;
    wx.showModal({
      title: '需要登录',
      content: message || '登录后才能使用该功能，是否现在登录？',
      confirmText: '去登录',
      cancelText: '暂不',
      success: (res) => {
        if (res.confirm) {
          const pages = getCurrentPages();
          const currentPage = pages[pages.length - 1];
          if (currentPage) {
            currentPage.setData({ showLoginPopup: true });
          }
        }
      }
    });
    return false;
  }
});
