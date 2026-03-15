import { COLORS, W, H } from './renderer.js';
import { showToast } from './toast.js';
import * as api from '../api.js';

// 小游戏中的登录弹窗
// 小游戏不能用 <button open-type="chooseAvatar">
// 需要用 wx.createUserInfoButton 或手动调用 wx.getUserInfo
// 但实际上小游戏的头像/昵称获取也是通过 wx.getUserInfo (低版本) 或用户自行输入

export class LoginPopup {
  constructor(app) {
    this.app = app;
    this.visible = false;
    this.nickname = '';
    this.loading = false;
    this._callback = null;
    this._userInfoBtn = null;
  }

  show(callback) {
    this.visible = true;
    this._callback = callback;
    this.app.render();
    // 创建微信原生 UserInfoButton（小游戏唯一的获取用户信息方式）
    this._createUserInfoButton();
  }

  hide() {
    this.visible = false;
    this.nickname = '';
    this.loading = false;
    this._destroyUserInfoButton();
    this.app.render();
  }

  _createUserInfoButton() {
    this._destroyUserInfoButton();
    const btnWidth = 200;
    const btnHeight = 40;
    const x = (W - btnWidth) / 2;
    const y = H / 2 + 10;

    try {
      this._userInfoBtn = wx.createUserInfoButton({
        type: 'text',
        text: '微信授权登录',
        style: {
          left: x, top: y, width: btnWidth, height: btnHeight,
          lineHeight: btnHeight,
          backgroundColor: '#E63B2E',
          color: '#ffffff',
          textAlign: 'center',
          fontSize: 16,
          borderRadius: 0
        }
      });

      this._userInfoBtn.onTap((res) => {
        if (res.userInfo) {
          this._doLogin(res.userInfo.nickName, res.userInfo.avatarUrl);
        } else {
          // 用户拒绝授权，走手动输入昵称的方式
          this._manualLogin();
        }
      });
    } catch (e) {
      // createUserInfoButton 不可用时，走手动输入
      console.warn('createUserInfoButton not available:', e);
    }
  }

  _destroyUserInfoButton() {
    if (this._userInfoBtn) {
      this._userInfoBtn.destroy();
      this._userInfoBtn = null;
    }
  }

  _manualLogin() {
    // 弹出输入框手动输入昵称
    wx.showModal({
      title: '输入昵称',
      editable: true,
      placeholderText: '输入你的昵称',
      success: (res) => {
        if (res.confirm && res.content) {
          this._doLogin(res.content.trim(), '');
        }
      }
    });
  }

  async _doLogin(nickname, avatarUrl) {
    if (!nickname) { showToast('昵称不能为空'); return; }
    this.loading = true;
    this.app.render();
    this._destroyUserInfoButton();

    try {
      const loginRes = await new Promise((resolve, reject) => {
        wx.login({ success: resolve, fail: reject });
      });

      const res = await api.wxLogin({
        code: loginRes.code,
        nickname: nickname,
        avatar_url: avatarUrl || ''
      });

      if (res.ok) {
        this.app.login(res.app_token, {
          uid_hash: res.uid_hash,
          nickname: res.nickname,
          avatar_url: res.avatar_url
        });
        showToast('登录成功');
        this.visible = false;
        this.loading = false;

        // 同步成绩到微信云存储
        this._syncInitialScore();

        if (this._callback) this._callback();
        this._callback = null;
      } else {
        showToast(res.error || '登录失败');
        this.loading = false;
      }
    } catch (e) {
      console.error('登录失败:', e);
      showToast('登录失败');
      this.loading = false;
    }
    this.app.render();
  }

  _syncInitialScore() {
    // 登录成功后尝试同步一次成绩
    api.getMyBestScores().then(res => {
      if (res.ok && res.scores?.length) {
        const best = res.scores.sort((a, b) => (b.best_percent || 0) - (a.best_percent || 0))[0];
        if (best) {
          wx.setUserCloudStorage({
            KVDataList: [{
              key: 'score',
              value: JSON.stringify({
                score: Number(best.best_percent || 0).toFixed(1),
                grade: best.grade || '',
                exam: best.exam_id,
                claw: best.claw_name || '',
                model: best.model_name || '',
                nickname: this.app.globalData.userInfo?.nickname || ''
              })
            }],
            success: () => console.log('成绩已同步到微信云存储'),
            fail: (e) => console.warn('同步失败:', e)
          });
        }
      }
    }).catch(() => {});
  }

  draw(renderer) {
    if (!this.visible) return;
    const R = renderer;
    const ctx = R.ctx;

    // 遮罩
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, W, H);

    // 弹窗
    const popW = W - 60;
    const popH = 200;
    const popX = 30;
    const popY = (H - popH) / 2 - 30;

    R.drawCard(popX, popY, popW, popH, { fill: COLORS.white });
    R.drawText(popX + popW / 2, popY + 16, '🦞 登录虾场', { fontSize: 18, bold: true, align: 'center' });
    R.drawText(popX + popW / 2, popY + 42, '使用微信账号快速登录', { fontSize: 12, color: COLORS.gray, align: 'center' });

    if (this.loading) {
      R.drawText(popX + popW / 2, popY + popH / 2, '登录中...', { fontSize: 14, color: COLORS.gray, align: 'center' });
    }
    // UserInfoButton 会覆盖在 Canvas 上，由微信原生渲染

    // 手动输入按钮（备用）
    R.drawButton(popX + 20, popY + popH - 80, popW - 40, 32, '手动输入昵称登录', {
      bg: COLORS.blue, color: COLORS.fg, fontSize: 12,
      handler: () => this._manualLogin(),
      scrollable: false
    });

    // 暂不登录
    R.drawText(popX + popW / 2, popY + popH - 34, '暂不登录', {
      fontSize: 12, color: COLORS.gray, align: 'center'
    });
    R.addTouch(popX + popW / 2 - 40, popY + popH - 38, 80, 24, () => this.hide(), false);
  }
}
