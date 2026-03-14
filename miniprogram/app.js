App({
  globalData: {
    exams: [],
    examsLoaded: false,
    userInfo: null,
    appToken: null,
    isLoggedIn: false,
    pendingInviter: null
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
      this.globalData.appToken = token;
      this.globalData.userInfo = userInfo;
      this.globalData.isLoggedIn = true;
      const api = require('./utils/api');
      api.getUserInfo().then(res => {
        if (!res.ok) this.logout();
      }).catch(() => {});
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
