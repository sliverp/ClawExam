import { COLORS, W } from '../ui/renderer.js';
import { showToast } from '../ui/toast.js';
import * as api from '../api.js';
import { examColor, formatDuration } from '../util.js';

export class ProfilePage {
  constructor(app) {
    this.app = app;
    this.bestScores = [];
    this.friendCount = 0;
    this.loading = false;
  }

  async onEnter() {
    if (this.app.globalData.isLoggedIn) {
      await this.loadMyData();
    }
  }

  async loadMyData() {
    this.loading = true;
    this.app.render();
    try {
      const [scoresRes, friendsRes] = await Promise.all([
        api.getMyBestScores(),
        api.getFriendsList()
      ]);
      const exams = this.app.globalData.exams;
      if (scoresRes.ok) {
        this.bestScores = exams.map(exam => {
          const score = (scoresRes.scores || []).find(s => s.exam_id === exam.id);
          return {
            exam_id: exam.id,
            exam_title: exam.name || exam.id,
            exam_color: examColor(exam.id),
            has_score: !!score,
            ...(score || {}),
            percentText: score ? Number(score.best_percent || 0).toFixed(1) : '0',
            durationText: score ? formatDuration(score.best_duration) : ''
          };
        });
      }
      if (friendsRes.ok) {
        this.friendCount = (friendsRes.friends || []).length;
      }
    } catch (e) { /* ignore */ }
    this.loading = false;
    this.app.render();
  }

  draw(renderer) {
    const R = renderer;
    const pad = 15;
    let y = 0;

    // 未登录
    if (!this.app.globalData.isLoggedIn) {
      R.drawText(W / 2, y + 40, '🦞', { fontSize: 50, align: 'center' });
      y += 100;
      R.drawText(W / 2, y, '登录后查看你的虾的历史成绩', { fontSize: 14, color: COLORS.gray, align: 'center' });
      y += 30;
      R.drawButton((W - 140) / 2, y, 140, 40, '🦞 登录虾场', {
        bg: COLORS.red, color: '#fff', fontSize: 15,
        handler: () => this.app.showLoginPopup()
      });
      return y + 60;
    }

    // 用户信息卡片
    const userInfo = this.app.globalData.userInfo;
    const cardW = W - pad * 2;
    R.drawCard(pad, y + 8, cardW, 68, { fill: COLORS.white });

    // 头像区域（用色块代替，因为图片加载异步）
    R.ctx.fillStyle = COLORS.yellow;
    R.ctx.fillRect(pad + 10, y + 18, 48, 48);
    R.ctx.strokeStyle = COLORS.border;
    R.ctx.lineWidth = 2;
    R.ctx.strokeRect(pad + 10, y + 18, 48, 48);
    R.drawText(pad + 34, y + 32, '🦞', { fontSize: 24, align: 'center' });

    // 如果有头像图片，异步加载并绘制
    if (userInfo?.avatar_url && !this._avatarImg) {
      this._avatarImg = wx.createImage();
      this._avatarImg.onload = () => { this.app.render(); };
      this._avatarImg.src = userInfo.avatar_url;
    }
    if (this._avatarImg && this._avatarImg.width) {
      R.ctx.drawImage(this._avatarImg, pad + 10, y + 18, 48, 48);
      R.ctx.strokeStyle = COLORS.border;
      R.ctx.lineWidth = 2;
      R.ctx.strokeRect(pad + 10, y + 18, 48, 48);
    }

    R.drawText(pad + 68, y + 18, userInfo?.nickname || '未知', { fontSize: 16, bold: true });
    R.drawText(pad + 68, y + 38, `UID: ${userInfo?.uid_hash || '-'}`, { fontSize: 10, color: COLORS.gray });
    R.drawText(pad + 68, y + 52, `好友 ${this.friendCount} 人`, { fontSize: 11, color: COLORS.blue });
    y += 86;

    // 历史最佳成绩
    R.drawText(pad, y, '🦞 我的小龙虾历史成绩', { fontSize: 16, bold: true });
    y += 26;

    if (this.loading) {
      R.drawText(W / 2, y + 20, '加载中...', { fontSize: 13, color: COLORS.gray, align: 'center' });
      return y + 60;
    }

    for (const s of this.bestScores) {
      const cardH = s.has_score ? 75 : 52;
      R.drawCard(pad, y, cardW, cardH, { fill: COLORS.white });

      // 彩色头部
      R.ctx.fillStyle = s.exam_color;
      R.ctx.fillRect(pad, y, cardW, 24);
      R.ctx.strokeStyle = COLORS.border;
      R.ctx.lineWidth = 1;
      R.ctx.strokeRect(pad, y, cardW, 24);
      R.drawText(pad + 8, y + 5, s.exam_title, { fontSize: 12, bold: true });

      if (s.has_score) {
        R.drawText(pad + 8, y + 30, `${s.percentText}%`, { fontSize: 18, bold: true });
        if (s.grade) {
          R.drawTag(pad + 60, y + 32, s.grade, { bg: s.grade === 'S' ? COLORS.yellow : s.grade.startsWith('A') ? COLORS.green : COLORS.lightGray, fontSize: 10 });
        }
        R.drawText(pad + 8, y + 52, `${s.model_name || ''} · ${s.claw_name || ''}`, { fontSize: 10, color: COLORS.gray, maxWidth: cardW - 80 });
        R.drawText(cardW, y + 52, `⏱ ${s.durationText}`, { fontSize: 10, color: COLORS.gray, align: 'right' });
      } else {
        R.drawText(pad + 8, y + 32, '尚未参加', { fontSize: 12, color: COLORS.gray });
      }

      y += cardH + 8;
    }

    // 更多功能
    y += 4;
    R.drawCard(pad, y, cardW, 36, { fill: COLORS.white });
    R.drawText(pad + 8, y + 10, '📊 查看全站统计', { fontSize: 13 });
    R.drawText(cardW, y + 10, '→', { fontSize: 13, align: 'right' });
    R.addTouch(pad, y, cardW, 36, () => { this.app.switchTab(1); });
    y += 44;

    // 同步成绩到微信
    R.drawButton(pad, y, cardW, 36, '🔄 同步成绩到好友排行', {
      bg: COLORS.blue, color: COLORS.fg, fontSize: 13,
      handler: () => this.syncToWxCloud()
    });
    y += 44;

    // 退出登录
    R.drawButton(pad, y, cardW, 36, '退出登录', {
      bg: COLORS.lightGray, color: COLORS.fg, fontSize: 13,
      handler: () => this.onLogout()
    });
    y += 50;

    return y;
  }

  async syncToWxCloud() {
    // 把最佳成绩同步到微信云存储，供开放数据域读取
    if (!this.bestScores.length) { showToast('暂无成绩'); return; }
    const best = this.bestScores.filter(s => s.has_score)
      .sort((a, b) => Number(b.percentText) - Number(a.percentText))[0];
    if (!best) { showToast('暂无成绩'); return; }

    try {
      wx.setUserCloudStorage({
        KVDataList: [
          { key: 'score', value: JSON.stringify({
            score: best.percentText,
            grade: best.grade || '',
            exam: best.exam_title,
            claw: best.claw_name || '',
            model: best.model_name || '',
            nickname: this.app.globalData.userInfo?.nickname || ''
          })}
        ],
        success: () => { showToast('成绩已同步'); },
        fail: () => { showToast('同步失败'); }
      });
    } catch (e) { showToast('同步失败'); }
  }

  onLogout() {
    wx.showModal({
      title: '确认退出',
      content: '退出后需要重新登录',
      success: (res) => {
        if (res.confirm) {
          this.app.logout();
          this.bestScores = [];
          this.friendCount = 0;
          this._avatarImg = null;
          this.app.render();
        }
      }
    });
  }
}
