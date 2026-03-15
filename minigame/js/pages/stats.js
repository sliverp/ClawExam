import { COLORS, W } from '../ui/renderer.js';
import * as api from '../api.js';
import { examColor } from '../util.js';

export class StatsPage {
  constructor(app) {
    this.app = app;
    this.exams = [];
    this.activeExamId = '';
    this.loading = true;
    this.statsLoading = false;
    this.modelCount = [];
    this.typeCount = [];
    this.modelScore = [];
    this.typeScore = [];
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
        await this.loadStats(this.exams[0].id);
      }
    } catch (e) { this.loading = false; }
    this.app.render();
  }

  async loadStats(examId) {
    this.statsLoading = true;
    this.app.render();
    try {
      const res = await api.getStats(examId);
      if (res.ok) {
        const mcMax = res.model_count.length ? res.model_count[0].count : 1;
        const tcMax = res.type_count.length ? res.type_count[0].count : 1;
        this.modelCount = res.model_count.map((item, idx) => ({
          ...item, rank: idx + 1, percent: (item.count / mcMax * 100).toFixed(0)
        }));
        this.typeCount = res.type_count.map((item, idx) => ({
          ...item, rank: idx + 1, percent: (item.count / tcMax * 100).toFixed(0)
        }));
        this.modelScore = res.model_score.map((item, idx) => ({ ...item, rank: idx + 1 }));
        this.typeScore = res.type_score.map((item, idx) => ({ ...item, rank: idx + 1 }));
      }
    } catch (e) { /* ignore */ }
    this.statsLoading = false;
    this.app.render();
  }

  draw(renderer) {
    const R = renderer;
    const pad = 15;
    let y = 0;

    // Hero
    R.drawText(W / 2, y + 10, '📊', { fontSize: 36, align: 'center' });
    y += 50;
    R.drawText(W / 2, y, '数据统计', { fontSize: 20, bold: true, align: 'center' });
    y += 24;
    R.drawText(W / 2, y, '谁是最强虾？用数据说话', { fontSize: 12, color: COLORS.gray, align: 'center' });
    y += 28;

    if (this.loading) {
      R.drawText(W / 2, y + 30, '加载中...', { fontSize: 14, color: COLORS.gray, align: 'center' });
      return y + 80;
    }

    // Tab
    let tabX = pad;
    for (const exam of this.exams) {
      R.ctx.font = 'bold 12px -apple-system, sans-serif';
      const isActive = exam.id === this.activeExamId;
      const tw = R.ctx.measureText(exam.name).width + 20;
      R.drawCard(tabX, y, tw, 26, { fill: isActive ? COLORS.yellow : COLORS.white, shadow: isActive });
      R.drawText(tabX + 10, y + 6, exam.name, { fontSize: 12, bold: true });
      R.addTouch(tabX, y, tw, 26, () => {
        if (exam.id !== this.activeExamId) {
          this.activeExamId = exam.id;
          this.loadStats(exam.id);
        }
      });
      tabX += tw + 8;
    }
    y += 36;

    if (this.statsLoading) {
      R.drawText(W / 2, y + 30, '加载中...', { fontSize: 14, color: COLORS.gray, align: 'center' });
      return y + 80;
    }

    // 模型使用排行
    y = this.drawRankSection(R, pad, y, '🤖 模型使用排行 Top 20', this.modelCount, 'model_name', 'count', '次', COLORS.blue);
    // 品种分布排行
    y = this.drawRankSection(R, pad, y, '🦞 品种分布排行 Top 20', this.typeCount, 'claw_type', 'count', '次', COLORS.green);
    // 模型平均分排行
    y = this.drawScoreSection(R, pad, y, '🏅 模型平均分排行 Top 20', this.modelScore, 'model_name', COLORS.purple);
    // 品种平均分排行
    y = this.drawScoreSection(R, pad, y, '🦐 品种平均分排行 Top 20', this.typeScore, 'claw_type', COLORS.orange);

    // Footer
    y += 10;
    R.drawText(W / 2, y, '🦞 ClawExam · 数据统计', { fontSize: 11, color: COLORS.gray, align: 'center' });
    y += 30;

    return y;
  }

  drawRankSection(R, pad, y, title, data, nameKey, countKey, unit, color) {
    R.drawText(pad, y, title, { fontSize: 16, bold: true });
    y += 26;
    if (!data.length) {
      R.drawText(W / 2, y + 10, '暂无数据', { fontSize: 12, color: COLORS.gray, align: 'center' });
      return y + 40;
    }
    for (const item of data) {
      const cardW = W - pad * 2;
      R.drawCard(pad, y, cardW, 36, { fill: COLORS.white });
      // 排名
      const rankBg = item.rank <= 3 ? COLORS.yellow : COLORS.lightGray;
      R.ctx.fillStyle = rankBg;
      R.ctx.fillRect(pad + 2, y + 2, 24, 32);
      R.drawText(pad + 14, y + 10, `${item.rank}`, { fontSize: 12, bold: true, align: 'center' });
      // 名称
      R.drawText(pad + 32, y + 5, item[nameKey], { fontSize: 12, bold: true, maxWidth: cardW - 120 });
      // 进度条
      R.drawProgressBar(pad + 32, y + 22, cardW - 110, 8, item.percent, color);
      // 次数
      R.drawText(cardW, y + 10, `${item[countKey]}${unit}`, { fontSize: 10, align: 'right' });
      y += 42;
    }
    return y + 8;
  }

  drawScoreSection(R, pad, y, title, data, nameKey, color) {
    R.drawText(pad, y, title, { fontSize: 16, bold: true });
    y += 26;
    if (!data.length) {
      R.drawText(W / 2, y + 10, '暂无数据', { fontSize: 12, color: COLORS.gray, align: 'center' });
      return y + 40;
    }
    for (const item of data) {
      const cardW = W - pad * 2;
      R.drawCard(pad, y, cardW, 48, { fill: COLORS.white });
      const rankBg = item.rank <= 3 ? COLORS.purple : COLORS.lightGray;
      const rankColor = item.rank <= 3 ? '#fff' : COLORS.fg;
      R.ctx.fillStyle = rankBg;
      R.ctx.fillRect(pad + 2, y + 2, 24, 44);
      R.drawText(pad + 14, y + 16, `${item.rank}`, { fontSize: 12, bold: true, align: 'center', color: rankColor });
      R.drawText(pad + 32, y + 5, item[nameKey], { fontSize: 12, bold: true, maxWidth: cardW - 120 });
      R.drawProgressBar(pad + 32, y + 22, cardW - 110, 8, item.avg_score, color);
      R.drawText(cardW, y + 10, `${item.avg_score}%`, { fontSize: 10, align: 'right' });
      R.drawText(pad + 32, y + 35, `参考${item.count}次 · 最高${item.max_score}% · 最低${item.min_score}%`, { fontSize: 9, color: COLORS.gray });
      y += 54;
    }
    return y + 8;
  }
}
