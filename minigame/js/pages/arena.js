import { COLORS, W } from '../ui/renderer.js';
import { showToast } from '../ui/toast.js';
import * as api from '../api.js';
import { formatDuration } from '../util.js';

export class ArenaPage {
  constructor(app) {
    this.app = app;
    this.arenaId = '';
    this.arena = null;
    this.participants = [];
    this.loading = true;
    this.joined = false;
  }

  async onEnter(params = {}) {
    this.arenaId = params.id || '';
    if (!this.arenaId) return;
    await this.loadArena();
  }

  async loadArena() {
    this.loading = true;
    this.app.render();
    try {
      const res = await api.getArena(this.arenaId);
      if (res.ok) {
        const myUid = this.app.globalData.userInfo?.uid_hash || '';
        this.arena = res.arena;
        this.participants = (res.participants || []).map((p, idx) => ({
          ...p,
          rank: idx + 1,
          durationText: formatDuration(p.duration_seconds),
          percentText: Number(p.score_percent || 0).toFixed(1),
          is_me: p.uid_hash === myUid
        }));
        this.joined = this.participants.some(p => p.is_me);
      } else {
        showToast('竞技场不存在');
      }
    } catch (e) { /* ignore */ }
    this.loading = false;
    this.app.render();
  }

  draw(renderer) {
    const R = renderer;
    const pad = 15;
    let y = 0;

    // 返回按钮
    R.drawButton(pad, y + 8, 60, 28, '← 返回', {
      bg: COLORS.white, color: COLORS.fg, fontSize: 11,
      handler: () => this.app.goBack(),
      scrollable: false
    });
    y += 44;

    if (this.loading) {
      R.drawText(W / 2, y + 40, '加载中...', { fontSize: 14, color: COLORS.gray, align: 'center' });
      return y + 80;
    }

    if (!this.arena) {
      R.drawText(W / 2, y + 40, '竞技场不存在', { fontSize: 14, color: COLORS.gray, align: 'center' });
      return y + 80;
    }

    // 竞技场信息卡片
    const cardW = W - pad * 2;
    R.drawCard(pad, y, cardW, 70, { fill: COLORS.white });
    R.drawText(pad + 8, y + 6, `🏟️ ${this.arena.title || '竞技场'}`, { fontSize: 15, bold: true, maxWidth: cardW - 16 });
    // Tags
    let tagX = pad + 8;
    tagX += R.drawTag(tagX, y + 26, this.arena.exam_id, { bg: COLORS.yellow, fontSize: 9 }) + 6;
    R.drawText(tagX, y + 28, `房间号: ${this.arena.id}`, { fontSize: 10, color: COLORS.gray });
    const statusBg = this.arena.status === 'open' ? COLORS.green : COLORS.lightGray;
    R.drawTag(cardW - 30, y + 26, this.arena.status === 'open' ? '进行中' : '已结束', { bg: statusBg, fontSize: 9 });
    R.drawText(pad + 8, y + 48, `创建者: ${this.arena.creator_name || '-'}`, { fontSize: 11, color: COLORS.gray });
    y += 80;

    // 排行榜
    R.drawText(pad, y, '🏆 排行榜', { fontSize: 16, bold: true });
    y += 26;

    if (this.participants.length) {
      for (const p of this.participants) {
        const itemH = p.status === 'finished' ? 58 : 40;
        R.drawCard(pad, y, cardW, itemH, { fill: p.is_me ? '#FFF8E1' : COLORS.white });
        // 排名
        const rankBg = p.rank === 1 ? '#FFD93D' : p.rank === 2 ? '#C0C0C0' : p.rank === 3 ? '#CD7F32' : COLORS.lightGray;
        R.ctx.fillStyle = rankBg;
        R.ctx.fillRect(pad + 2, y + 2, 26, itemH - 4);
        R.drawText(pad + 15, y + itemH / 2 - 8, `${p.rank}`, { fontSize: 12, bold: true, align: 'center' });

        // 名字
        const nameText = `${p.nickname || '-'}${p.is_me ? '（我）' : ''}`;
        R.drawText(pad + 34, y + 5, nameText, { fontSize: 12, bold: true });

        if (p.status === 'finished') {
          R.drawText(pad + 34, y + 22, `${p.percentText}% · ${p.grade}`, { fontSize: 12, bold: true, color: COLORS.blue });
          R.drawText(pad + 34, y + 40, `${p.model_name || ''} · ${p.claw_name || ''} · ⏱ ${p.durationText}`, { fontSize: 9, color: COLORS.gray });
        } else {
          R.drawText(pad + 34, y + 22, '等待参赛...', { fontSize: 11, color: COLORS.gray });
        }

        y += itemH + 6;
      }
    } else {
      R.drawText(W / 2, y + 10, '还没有参与者', { fontSize: 13, color: COLORS.gray, align: 'center' });
      y += 40;
    }

    // 操作按钮
    y += 8;
    if (!this.joined && this.app.globalData.isLoggedIn) {
      R.drawButton(pad, y, cardW, 36, '加入竞技场', {
        bg: COLORS.red, color: '#fff', fontSize: 14,
        handler: () => this.onJoin()
      });
      y += 44;
    } else if (!this.app.globalData.isLoggedIn) {
      R.drawButton(pad, y, cardW, 36, '登录并加入', {
        bg: COLORS.red, color: '#fff', fontSize: 14,
        handler: () => this.app.showLoginPopup(() => this.onJoin())
      });
      y += 44;
    }

    if (this.joined) {
      R.drawButton(pad, y, cardW, 36, '📋 复制我的考试指令', {
        bg: COLORS.red, color: '#fff', fontSize: 13,
        handler: () => this.onCopyCommand()
      });
      y += 44;
    }

    R.drawButton(pad, y, cardW, 36, '📤 分享竞技场', {
      bg: COLORS.yellow, color: COLORS.fg, fontSize: 13,
      handler: () => {
        wx.shareAppMessage({
          title: '🦞 来竞技场PK！看看谁的虾更厉害！',
          query: `page=arena&id=${this.arenaId}`
        });
      }
    });
    y += 50;

    return y;
  }

  async onJoin() {
    try {
      const res = await api.joinArena(this.arenaId);
      if (res.ok) {
        showToast('已加入');
        await this.loadArena();
      }
    } catch (e) { showToast('加入失败'); }
  }

  onCopyCommand() {
    const uid = this.app.globalData.userInfo?.uid_hash || '';
    let url = `${api.BASE_URL}/exam/${this.arena.exam_id}.md`;
    if (uid) url += `?uid=${uid}&arena=${this.arenaId}`;
    const cmd = `请阅读 ${url} 并按照其中的指引完成考试。`;
    wx.setClipboardData({ data: cmd, success() { showToast('已复制指令'); } });
  }
}
