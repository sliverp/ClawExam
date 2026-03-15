import { COLORS, W, H } from '../ui/renderer.js';
import { showToast } from '../ui/toast.js';
import { TAB_H } from '../ui/tab-bar.js';

// 好友排行榜页面
// 关键：使用微信小游戏独有的开放数据域 getFriendCloudStorage
// 好友排行的 Canvas 由开放数据域独立绘制到 sharedCanvas 上
// 主域只需要把 sharedCanvas 贴到主 canvas 上

export class FriendsPage {
  constructor(app) {
    this.app = app;
    this.sharedCanvas = null;
    this.openDataContext = null;
    this.inited = false;
    this.exams = [];
    this.activeExamId = '';
  }

  onEnter() {
    if (!this.openDataContext) {
      this.openDataContext = wx.getOpenDataContext();
      this.sharedCanvas = this.openDataContext.canvas;
    }
    // 从 app 获取试卷列表
    this.exams = this.app.globalData.exams || [];
    if (this.exams.length && !this.activeExamId) {
      this.activeExamId = this.exams[0].id;
    }
    // 通知开放数据域渲染好友排行榜
    this.requestFriendsData();
  }

  requestFriendsData() {
    if (!this.openDataContext) return;
    this.openDataContext.postMessage({
      type: 'getFriends',
      examId: this.activeExamId
    });
  }

  onLeave() {
    // 通知开放数据域隐藏
    if (this.openDataContext) {
      this.openDataContext.postMessage({ type: 'hide' });
    }
  }

  draw(renderer) {
    const R = renderer;
    const pad = 15;
    let y = 0;

    // Hero
    R.drawText(W / 2, y + 10, '🏆', { fontSize: 36, align: 'center' });
    y += 50;
    R.drawText(W / 2, y, '好友排行榜', { fontSize: 20, bold: true, align: 'center' });
    y += 22;
    R.drawText(W / 2, y, '微信好友中谁的虾最强？', { fontSize: 12, color: COLORS.gray, align: 'center' });
    y += 28;

    // 需要登录提示
    if (!this.app.globalData.isLoggedIn) {
      R.drawText(W / 2, y + 20, '🔒', { fontSize: 40, align: 'center' });
      y += 70;
      R.drawText(W / 2, y, '登录后可以查看好友排行', { fontSize: 14, color: COLORS.gray, align: 'center' });
      y += 30;
      R.drawButton((W - 140) / 2, y, 140, 36, '🦞 登录虾场', {
        bg: COLORS.red, color: '#fff', fontSize: 14,
        handler: () => this.app.showLoginPopup()
      });
      return y + 50;
    }

    // Tab 切换试卷
    if (this.exams.length) {
      let tabX = pad;
      for (const exam of this.exams) {
        R.ctx.font = 'bold 12px -apple-system, sans-serif';
        const isActive = exam.id === this.activeExamId;
        const tw = R.ctx.measureText(exam.name || exam.id).width + 20;
        R.drawCard(tabX, y, tw, 26, { fill: isActive ? COLORS.yellow : COLORS.white, shadow: isActive });
        R.drawText(tabX + 10, y + 6, exam.name || exam.id, { fontSize: 12, bold: true });
        R.addTouch(tabX, y, tw, 26, () => {
          if (exam.id !== this.activeExamId) {
            this.activeExamId = exam.id;
            this.requestFriendsData();
            this.app.render();
          }
        });
        tabX += tw + 8;
      }
      y += 36;
    }

    // 在这里绘制 sharedCanvas（开放数据域的内容）
    // sharedCanvas 由开放数据域自行绘制好友列表
    if (this.sharedCanvas) {
      const scW = W - pad * 2;
      const scH = H - y - TAB_H - 20;
      // 通知开放数据域 canvas 尺寸
      this.openDataContext.postMessage({
        type: 'resize',
        width: scW * GameGlobal.pixelRatio,
        height: scH * GameGlobal.pixelRatio
      });
      // 把 sharedCanvas 绘制到主 canvas 上
      // 注意：这里 y 已经包含了滚动偏移（由 renderer 处理）
      try {
        R.ctx.drawImage(this.sharedCanvas, pad, y, scW, scH);
      } catch (e) {
        // sharedCanvas 可能还没准备好
      }
      y += scH;
    }

    // 分享按钮
    y += 10;
    R.drawButton((W - 180) / 2, y, 180, 36, '📨 分享给好友一起来', {
      bg: COLORS.red, color: '#fff', fontSize: 13,
      handler: () => {
        wx.shareAppMessage({
          title: '🦞 快来看看你的虾能考多少分！',
        });
      }
    });
    y += 50;

    return y;
  }
}
