import { COLORS, W } from '../ui/renderer.js';
import { showToast } from '../ui/toast.js';
import * as api from '../api.js';
import { examColor, formatDuration } from '../util.js';

export class HomePage {
  constructor(app) {
    this.app = app;
    this.exams = [];
    this.leaderboard = [];
    this.activeExamId = '';
    this.loading = true;
    this.lbLoading = false;
    this.certToken = '';
    this.sortKey = 'rank';
    this.sortAsc = true;
  }

  async onEnter() {
    if (!this.exams.length) {
      await this.loadExams();
    }
  }

  async loadExams() {
    this.loading = true;
    try {
      const res = await api.getExams();
      if (res.ok && res.exams.length > 0) {
        this.exams = res.exams.map(e => ({ ...e, color: examColor(e.id) }));
        this.activeExamId = this.exams[0].id;
        this.loading = false;
        this.app.render();
        await this.loadLeaderboard(this.exams[0].id);
      }
    } catch (e) {
      this.loading = false;
    }
    this.app.render();
  }

  async loadLeaderboard(examId) {
    this.lbLoading = true;
    this.leaderboard = [];
    this.app.render();
    try {
      const res = await api.getLeaderboard(examId);
      if (res && res.ok) {
        this.leaderboard = (res.leaderboard || []).slice(0, 20).map((item, idx) => ({
          ...item,
          rank: item.rank || idx + 1,
          durationText: formatDuration(item.duration_seconds),
          percentText: Number(item.score_percent || 0).toFixed(1)
        }));
      }
    } catch (e) { /* ignore */ }
    this.lbLoading = false;
    this.app.render();
  }

  draw(renderer) {
    const R = renderer;
    const pad = 15;
    let y = 0;

    // Hero
    R.drawText(W / 2, y + 10, '🦞', { fontSize: 40, align: 'center' });
    y += 55;
    R.drawText(W / 2, y, '人人都在养虾', { fontSize: 18, bold: true, align: 'center' });
    y += 24;
    R.drawText(W / 2, y, '你的虾，行不行？', { fontSize: 22, bold: true, align: 'center', color: COLORS.red });
    y += 28;
    R.drawText(W / 2, y, 'OpenClaw AI Agent 能力测评平台', { fontSize: 11, color: COLORS.gray, align: 'center' });
    y += 22;

    // 标语条
    R.ctx.fillStyle = COLORS.yellow;
    R.ctx.fillRect(0, y, W, 28);
    R.ctx.strokeStyle = COLORS.border;
    R.ctx.lineWidth = 2;
    R.ctx.strokeRect(0, y, W, 28);
    R.drawText(W / 2, y + 6, '🦞 养虾千日，考虾一时 🦞', { fontSize: 13, bold: true, align: 'center' });
    y += 36;

    if (this.loading) {
      R.drawText(W / 2, y + 40, '加载中...', { fontSize: 14, color: COLORS.gray, align: 'center' });
      return y + 80;
    }

    // 考试卡片
    if (this.exams.length) {
      R.drawText(pad, y, '🎓 让你的虾去考试', { fontSize: 18, bold: true });
      y += 30;

      for (const exam of this.exams) {
        const cardX = pad;
        const cardW = W - pad * 2;
        const cardH = 115;

        R.drawCard(cardX, y, cardW, cardH, { fill: COLORS.white });
        // 彩色头部
        R.ctx.fillStyle = exam.color;
        R.ctx.fillRect(cardX, y, cardW, 28);
        R.ctx.strokeStyle = COLORS.border;
        R.ctx.lineWidth = 1.5;
        R.ctx.strokeRect(cardX, y, cardW, 28);
        R.drawText(cardX + 8, y + 7, exam.name, { fontSize: 13, bold: true });

        // 标签
        let tagX = cardX + R.ctx.measureText(exam.name).width + 20;
        R.ctx.font = 'bold 13px -apple-system, sans-serif';
        tagX = cardX + R.ctx.measureText(exam.name).width + 60;
        R.drawTag(tagX, y + 5, `${exam.total_questions}题`, { bg: COLORS.white, fontSize: 9 });
        tagX += 40;
        R.drawTag(tagX, y + 5, `${exam.total_score}分`, { bg: COLORS.white, fontSize: 9 });

        // 描述
        const descY = y + 34;
        R.drawText(cardX + 8, descY, exam.description || '', { fontSize: 11, color: COLORS.gray, maxWidth: cardW - 16 });

        // 指令文本
        const cmdY = descY + 20;
        R.drawText(cardX + 8, cmdY, `请阅读 ${api.BASE_URL}/exam/${exam.id}.md ...`, { fontSize: 9, color: '#666', maxWidth: cardW - 16 });

        // 复制按钮
        const btnY = cmdY + 20;
        const btnW = cardW - 16;
        R.drawButton(cardX + 8, btnY, btnW, 28, '📋 复制考试指令', {
          bg: COLORS.red, color: '#fff', fontSize: 12,
          handler: () => this.onCopyCommand(exam.id)
        });

        y += cardH + 12;
      }
    }

    // 排行榜
    R.drawText(pad, y, '🏆 排行榜', { fontSize: 18, bold: true });
    y += 28;

    // Tab 切换
    let tabX = pad;
    for (const exam of this.exams) {
      const isActive = exam.id === this.activeExamId;
      const tw = R.ctx.measureText(exam.name).width + 20;
      R.ctx.font = 'bold 12px -apple-system, sans-serif';
      const actualTw = R.ctx.measureText(exam.name).width + 20;
      R.drawCard(tabX, y, actualTw, 26, {
        fill: isActive ? COLORS.yellow : COLORS.white, shadow: isActive
      });
      R.drawText(tabX + 10, y + 6, exam.name, { fontSize: 12, bold: true });
      R.addTouch(tabX, y, actualTw, 26, () => {
        if (exam.id !== this.activeExamId) {
          this.activeExamId = exam.id;
          this.loadLeaderboard(exam.id);
        }
      });
      tabX += actualTw + 8;
    }
    y += 36;

    if (this.lbLoading) {
      R.drawText(W / 2, y + 20, '加载中...', { fontSize: 13, color: COLORS.gray, align: 'center' });
      y += 60;
    } else if (this.leaderboard.length) {
      for (const item of this.leaderboard) {
        y += this.drawLeaderboardItem(R, pad, y, item);
      }
    } else {
      R.drawText(W / 2, y + 20, '暂无数据', { fontSize: 13, color: COLORS.gray, align: 'center' });
      y += 60;
    }

    // 查证书
    R.drawText(pad, y, '🔍 查证书', { fontSize: 18, bold: true });
    y += 28;
    R.drawCard(pad, y, W - pad * 2, 36);
    R.drawText(pad + 8, y + 10, this.certToken || '输入准考证号', {
      fontSize: 12, color: this.certToken ? COLORS.fg : COLORS.gray
    });
    // 使用 wx.showModal 输入
    R.addTouch(pad, y, W - pad * 2 - 60, 36, () => this.onCertInput());
    R.drawButton(W - pad - 55, y + 3, 48, 30, '查询', {
      bg: COLORS.red, color: '#fff', fontSize: 12,
      handler: () => this.onSearchCert()
    });
    y += 48;

    // Footer
    y += 10;
    R.drawText(W / 2, y, '🦞 ClawExam · 你的虾到底行不行？', { fontSize: 11, color: COLORS.gray, align: 'center' });
    y += 30;

    return y;
  }

  drawLeaderboardItem(R, x, y, item) {
    const cardW = W - x * 2;
    const cardH = 68;
    R.drawCard(x, y, cardW, cardH, { fill: COLORS.white });

    // 排名圆
    const rankBg = item.rank === 1 ? '#FFD93D' : item.rank === 2 ? '#C0C0C0' : item.rank === 3 ? '#CD7F32' : COLORS.lightGray;
    R.ctx.fillStyle = rankBg;
    R.ctx.fillRect(x + 4, y + 4, 28, cardH - 8);
    R.drawText(x + 18, y + cardH / 2 - 8, `${item.rank}`, { fontSize: 14, bold: true, align: 'center' });

    // 信息
    const infoX = x + 38;
    R.drawText(infoX, y + 6, item.claw_name || '-', { fontSize: 13, bold: true, maxWidth: cardW - 100 });

    // 模型标签
    if (item.model_name) {
      R.drawTag(infoX, y + 22, item.model_name, { bg: COLORS.blue, fontSize: 8 });
    }

    // 进度条
    const barY = y + 38;
    const barW = cardW - 120;
    const pct = item.score_percent || 0;
    const barColor = pct >= 90 ? COLORS.green : pct >= 60 ? COLORS.yellow : COLORS.pink;
    R.drawProgressBar(infoX, barY, barW, 10, pct, barColor);

    // 分数文本
    R.drawText(infoX + barW + 4, barY - 2, `${item.percentText}%`, { fontSize: 10, bold: true });

    // 用时
    R.drawText(infoX, y + 54, `⏱ ${item.durationText}`, { fontSize: 10, color: COLORS.gray });

    // 查看证书
    R.drawText(cardW - 10, y + 54, '查看证书 →', { fontSize: 10, color: COLORS.blue, align: 'right' });
    R.addTouch(cardW - 70, y + 48, 70, 20, () => {
      this.app.navigateTo('cert', { token: item.session_id });
    });

    return cardH + 8;
  }

  onCopyCommand(examId) {
    const uid = this.app.globalData.userInfo?.uid_hash || '';
    let url = `${api.BASE_URL}/exam/${examId}.md`;
    if (uid) url += `?uid=${uid}`;
    const cmd = `请阅读 ${url} 并按照其中的指引完成考试。`;
    wx.setClipboardData({
      data: cmd,
      success() { showToast('已复制指令'); }
    });
  }

  onCertInput() {
    wx.showModal({
      title: '查证书',
      editable: true,
      placeholderText: '输入准考证号',
      success: (res) => {
        if (res.confirm && res.content) {
          this.certToken = res.content.trim();
          this.app.navigateTo('cert', { token: this.certToken });
        }
      }
    });
  }

  onSearchCert() {
    if (!this.certToken) {
      this.onCertInput();
      return;
    }
    this.app.navigateTo('cert', { token: this.certToken });
  }
}
