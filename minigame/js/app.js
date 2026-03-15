import { canvas } from './libs/adapter.js';
import { Renderer, W, H, DPR } from './ui/renderer.js';
import { drawTabBar, TAB_H } from './ui/tab-bar.js';
import { drawToast } from './ui/toast.js';
import { LoginPopup } from './ui/login-popup.js';
import { HomePage } from './pages/home.js';
import { StatsPage } from './pages/stats.js';
import { FriendsPage } from './pages/friends.js';
import { ArenaListPage } from './pages/arena-list.js';
import { ArenaPage } from './pages/arena.js';
import { ProfilePage } from './pages/profile.js';
import { CertPage } from './pages/cert.js';
import * as api from './api.js';

export class App {
  constructor() {
    this.renderer = new Renderer(canvas);
    this.globalData = {
      exams: [],
      examsLoaded: false,
      userInfo: null,
      appToken: null,
      isLoggedIn: false,
      pendingInviter: null
    };

    // 5个 Tab 页
    this.tabPages = [
      new HomePage(this),
      new StatsPage(this),
      new FriendsPage(this),
      new ArenaListPage(this),
      new ProfilePage(this)
    ];

    // 非 Tab 子页面（堆栈）
    this.subPages = {
      arena: new ArenaPage(this),
      cert: new CertPage(this)
    };

    this.activeTab = 0;
    this.pageStack = []; // 子页面栈 [{ name, params }]
    this.loginPopup = new LoginPopup(this);

    this._renderPending = false;
    this._frameId = null;
  }

  start() {
    this.checkLoginStatus();
    this.loadExams();

    // 处理场景参数（从分享进入）
    const launchInfo = wx.getLaunchOptionsSync();
    if (launchInfo.query) {
      this._handleLaunchQuery(launchInfo.query);
    }

    // 分享配置
    wx.showShareMenu({ withShareTicket: true });
    wx.onShareAppMessage(() => {
      const uid = this.globalData.userInfo?.uid_hash || '';
      return {
        title: '🦞 人人都在养虾，你的虾行不行？来考一场就知道了！',
        query: uid ? `inviter=${uid}` : ''
      };
    });

    // 首页进入
    this.tabPages[0].onEnter();

    // 启动渲染循环
    this._startRenderLoop();
  }

  _handleLaunchQuery(query) {
    // 处理从分享卡片进入的参数
    if (query.inviter) {
      if (this.globalData.isLoggedIn) {
        api.addFriend(query.inviter).catch(() => {});
      } else {
        this.globalData.pendingInviter = query.inviter;
      }
    }
    // 跳转到指定页面
    if (query.page === 'arena' && query.id) {
      setTimeout(() => this.navigateTo('arena', { id: query.id }), 500);
    } else if (query.page === 'cert' && query.token) {
      setTimeout(() => this.navigateTo('cert', { token: query.token }), 500);
    }
  }

  checkLoginStatus() {
    const token = wx.getStorageSync('app_token');
    const userInfo = wx.getStorageSync('user_info');
    if (token && userInfo) {
      this.globalData.appToken = token;
      this.globalData.userInfo = userInfo;
      this.globalData.isLoggedIn = true;
      api.getUserInfo().then(res => {
        if (!res.ok) this.logout();
      }).catch(() => {});
    }
  }

  async loadExams() {
    try {
      const res = await api.getExams();
      if (res.ok) {
        this.globalData.exams = res.exams;
        this.globalData.examsLoaded = true;
      }
    } catch (e) { /* ignore */ }
  }

  login(token, userInfo) {
    this.globalData.appToken = token;
    this.globalData.userInfo = userInfo;
    this.globalData.isLoggedIn = true;
    wx.setStorageSync('app_token', token);
    wx.setStorageSync('user_info', userInfo);
    // 处理待定邀请者
    if (this.globalData.pendingInviter) {
      api.addFriend(this.globalData.pendingInviter).catch(() => {});
      this.globalData.pendingInviter = null;
    }
  }

  logout() {
    this.globalData.appToken = null;
    this.globalData.userInfo = null;
    this.globalData.isLoggedIn = false;
    wx.removeStorageSync('app_token');
    wx.removeStorageSync('user_info');
  }

  // 切换 Tab
  switchTab(index) {
    if (index === this.activeTab && !this.pageStack.length) return;
    // 清空子页面栈
    this.pageStack = [];
    const prevTab = this.activeTab;
    this.activeTab = index;
    // 通知离开
    if (this.tabPages[prevTab]?.onLeave) this.tabPages[prevTab].onLeave();
    // 重置滚动
    this.renderer.scrollY = 0;
    // 通知进入
    this.tabPages[index].onEnter();
    this.render();
  }

  // 导航到子页面
  navigateTo(pageName, params = {}) {
    const page = this.subPages[pageName];
    if (!page) return;
    this.pageStack.push({ name: pageName, params });
    this.renderer.scrollY = 0;
    page.onEnter(params);
    this.render();
  }

  // 返回
  goBack() {
    if (this.pageStack.length) {
      this.pageStack.pop();
      this.renderer.scrollY = 0;
      this.render();
    }
  }

  // 显示登录弹窗
  showLoginPopup(callback) {
    this.loginPopup.show(callback);
  }

  // 请求渲染
  render() {
    this._renderPending = true;
  }

  _startRenderLoop() {
    const loop = () => {
      this._frameId = requestAnimationFrame(loop);
      if (this._renderPending || this.renderer._needRender) {
        this._renderPending = false;
        this.renderer._needRender = false;
        this._draw();
      }
    };
    loop();
    // 初次渲染
    this._renderPending = true;
  }

  _draw() {
    const R = this.renderer;
    R.clear();

    // 判断当前活跃页面
    const currentSubPage = this.pageStack.length
      ? this.subPages[this.pageStack[this.pageStack.length - 1].name]
      : null;

    const showTabBar = !currentSubPage;
    const scrollBottom = showTabBar ? H - TAB_H : H;

    // 绘制滚动内容
    R.beginScrollArea(0, scrollBottom);
    let contentHeight;
    if (currentSubPage) {
      contentHeight = currentSubPage.draw(R) || 0;
    } else {
      contentHeight = this.tabPages[this.activeTab].draw(R) || 0;
    }
    R.updateScroll(contentHeight);
    R.endScrollArea();

    // TabBar
    if (showTabBar) {
      drawTabBar(R, this.activeTab, (idx) => this.switchTab(idx));
    }

    // Toast
    drawToast(R.ctx);

    // 登录弹窗（最上层）
    this.loginPopup.draw(R);
  }
}
