import { COLORS, W } from '../ui/renderer.js';
import { showToast } from '../ui/toast.js';
import * as api from '../api.js';
import { formatTime } from '../util.js';

export class ArenaListPage {
  constructor(app) {
    this.app = app;
    this.arenas = [];
    this.loading = false;
  }

  async onEnter() {
    if (this.app.globalData.isLoggedIn) {
      await this.loadMyArenas();
    }
  }

  async loadMyArenas() {
    this.loading = true;
    this.app.render();
    try {
      const res = await api.getMyArenas();
      if (res.ok) {
        this.arenas = (res.arenas || []).map(a => ({ ...a, timeText: formatTime(a.created_at) }));
      }
    } catch (e) { /* ignore */ }
    this.loading = false;
    this.app.render();
  }

  draw(renderer) {
    const R = renderer;
    const pad = 15;
    let y = 0;

    // Hero
    R.drawText(W / 2, y + 10, '🏟️', { fontSize: 36, align: 'center' });
    y += 50;
    R.drawText(W / 2, y, '竞技场', { fontSize: 20, bold: true, align: 'center' });
    y += 28;

    // 未登录
    if (!this.app.globalData.isLoggedIn) {
      R.drawText(W / 2, y + 20, '🔒', { fontSize: 40, align: 'center' });
      y += 70;
      R.drawText(W / 2, y, '登录后才能创建和加入竞技场', { fontSize: 14, color: COLORS.gray, align: 'center' });
      y += 30;
      R.drawButton((W - 120) / 2, y, 120, 36, '去登录', {
        bg: COLORS.red, color: '#fff', fontSize: 14,
        handler: () => this.app.showLoginPopup()
      });
      return y + 50;
    }

    // 操作区
    R.drawButton(pad, y, W - pad * 2, 36, '+ 创建竞技场', {
      bg: COLORS.red, color: '#fff', fontSize: 14,
      handler: () => this.onCreateArena()
    });
    y += 46;

    // 加入房间
    R.drawCard(pad, y, W - pad * 2, 36);
    R.drawText(pad + 8, y + 10, '输入房间号加入...', { fontSize: 12, color: COLORS.gray });
    R.addTouch(pad, y, W - pad * 2 - 60, 36, () => this.onJoinByCode());
    R.drawButton(W - pad - 55, y + 3, 48, 30, '加入', {
      bg: COLORS.blue, color: COLORS.fg, fontSize: 12,
      handler: () => this.onJoinByCode()
    });
    y += 46;

    if (this.loading) {
      R.drawText(W / 2, y + 20, '加载中...', { fontSize: 13, color: COLORS.gray, align: 'center' });
      return y + 60;
    }

    // 竞技场列表
    if (this.arenas.length) {
      R.drawText(pad, y, '🏟️ 我的竞技场', { fontSize: 16, bold: true });
      y += 26;

      for (const arena of this.arenas) {
        const cardW = W - pad * 2;
        R.drawCard(pad, y, cardW, 68, { fill: COLORS.white });
        // 标题行
        R.drawText(pad + 8, y + 6, arena.title || `竞技场 ${arena.id}`, { fontSize: 13, bold: true, maxWidth: cardW - 80 });
        const statusBg = arena.status === 'open' ? COLORS.green : COLORS.lightGray;
        const statusText = arena.status === 'open' ? '进行中' : '已结束';
        R.drawTag(cardW - 30, y + 6, statusText, { bg: statusBg, fontSize: 9 });
        // Meta
        R.drawText(pad + 8, y + 26, `📋 ${arena.exam_id} · 房间号: ${arena.id}`, { fontSize: 10, color: COLORS.gray });
        // Bottom
        R.drawText(pad + 8, y + 46, `${arena.participant_count || 0}人参与`, { fontSize: 11 });
        R.drawText(cardW, y + 46, arena.timeText, { fontSize: 10, color: COLORS.gray, align: 'right' });
        // 点击进入
        R.addTouch(pad, y, cardW, 68, () => {
          this.app.navigateTo('arena', { id: arena.id });
        });
        y += 76;
      }
    } else {
      R.drawText(W / 2, y + 20, '🏟️', { fontSize: 36, align: 'center' });
      y += 66;
      R.drawText(W / 2, y, '还没有竞技场', { fontSize: 14, color: COLORS.gray, align: 'center' });
      y += 20;
      R.drawText(W / 2, y, '创建一个邀请朋友一起PK吧！', { fontSize: 12, color: COLORS.gray, align: 'center' });
      y += 30;
    }

    return y + 20;
  }

  onCreateArena() {
    const exams = this.app.globalData.exams;
    if (!exams.length) { showToast('试卷未加载'); return; }
    // 用 actionSheet 选择试卷
    wx.showActionSheet({
      itemList: exams.map(e => e.name || e.id),
      success: async (res) => {
        const exam = exams[res.tapIndex];
        try {
          const result = await api.createArena({ exam_id: exam.id });
          if (result.ok) {
            this.app.navigateTo('arena', { id: result.arena.id });
          } else {
            showToast(result.error || '创建失败');
          }
        } catch (e) { showToast('创建失败'); }
      }
    });
  }

  onJoinByCode() {
    wx.showModal({
      title: '加入竞技场',
      editable: true,
      placeholderText: '输入6位房间号',
      success: (res) => {
        if (res.confirm && res.content) {
          const code = res.content.trim().toUpperCase();
          if (code) {
            this.app.navigateTo('arena', { id: code });
          }
        }
      }
    });
  }
}
