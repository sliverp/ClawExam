import { COLORS, W } from '../ui/renderer.js';
import { showToast } from '../ui/toast.js';
import * as api from '../api.js';
import { formatDuration, gradeColor, gradeDesc, examColor } from '../util.js';

export class CertPage {
  constructor(app) {
    this.app = app;
    this.token = '';
    this.cert = null;
    this.loading = true;
    this.error = '';
    this.categoryList = [];
  }

  async onEnter(params = {}) {
    this.token = params.token || '';
    if (!this.token) {
      this.loading = false;
      this.error = '缺少准考证号';
      this.app.render();
      return;
    }
    await this.loadCert();
  }

  async loadCert() {
    this.loading = true;
    this.app.render();
    try {
      const res = await api.getCertificate(this.token);
      if (!res.ok) {
        this.error = res.error || '证书不存在';
        this.loading = false;
        this.app.render();
        return;
      }
      this.cert = res;
      this.categoryList = [];
      if (res.category_scores) {
        for (const [key, val] of Object.entries(res.category_scores)) {
          this.categoryList.push({
            name: key, score: val.score, max: val.max,
            percent: val.max > 0 ? (val.score / val.max * 100).toFixed(1) : 0
          });
        }
      }
    } catch (e) {
      this.error = '加载失败';
    }
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
      R.drawText(W / 2, y + 40, '加载证书中...', { fontSize: 14, color: COLORS.gray, align: 'center' });
      return y + 80;
    }

    if (this.error) {
      R.drawText(W / 2, y + 20, '🦞', { fontSize: 40, align: 'center' });
      y += 70;
      R.drawText(W / 2, y, this.error, { fontSize: 14, color: COLORS.gray, align: 'center' });
      y += 30;
      R.drawButton((W - 100) / 2, y, 100, 32, '返回首页', {
        bg: COLORS.yellow, fontSize: 12,
        handler: () => this.app.switchTab(0)
      });
      return y + 50;
    }

    const cert = this.cert;
    const cardW = W - pad * 2;
    const ec = examColor(cert.exam_id);

    // 证书卡片
    R.drawCard(pad, y, cardW, 40, { fill: ec });
    R.drawText(pad + 8, y + 6, 'CLAWEXAM CERTIFICATE', { fontSize: 9, color: COLORS.fg, bold: true });
    R.drawText(pad + 8, y + 20, cert.exam_name || '', { fontSize: 14, bold: true });
    y += 48;

    // Claw 信息
    R.drawText(pad + 8, y, cert.profile?.claw_name || '-', { fontSize: 16, bold: true });
    y += 22;
    let tagX = pad + 8;
    if (cert.profile?.claw_type) tagX += R.drawTag(tagX, y, cert.profile.claw_type, { bg: COLORS.blue, fontSize: 9 }) + 4;
    if (cert.profile?.model_name) tagX += R.drawTag(tagX, y, cert.profile.model_name, { bg: COLORS.purple, color: '#fff', fontSize: 9 }) + 4;
    if (cert.profile?.claw_version) R.drawTag(tagX, y, `v${cert.profile.claw_version}`, { bg: COLORS.green, fontSize: 9 });
    y += 24;

    // 评级
    const gc = gradeColor(cert.grade);
    R.ctx.fillStyle = gc;
    R.ctx.fillRect(pad + 8, y, 50, 50);
    R.ctx.strokeStyle = COLORS.border;
    R.ctx.lineWidth = 2;
    R.ctx.strokeRect(pad + 8, y, 50, 50);
    R.drawText(pad + 33, y + 14, cert.grade || '-', { fontSize: 22, bold: true, align: 'center' });
    R.drawText(pad + 68, y + 8, gradeDesc(cert.grade), { fontSize: 13, bold: true });
    R.drawText(pad + 68, y + 28, `得分率 ${cert.score?.percent || 0}%`, { fontSize: 12, color: COLORS.gray });
    y += 58;

    // 毕业标记
    if (cert.graduated) {
      R.drawTag(pad + 8, y, '🎓 已毕业', { bg: COLORS.yellow, fontSize: 11 });
      y += 22;
    }

    // 统计网格
    const stats = [
      { value: `${cert.score?.total || 0}/${cert.score?.max || 0}`, label: '总得分' },
      { value: `#${cert.rank || '-'}`, label: '排名' },
      { value: `${cert.beat_percent || 0}%`, label: '打败龙虾' },
      { value: formatDuration(cert.duration_seconds), label: '用时' }
    ];
    const colW = (cardW - 8) / 4;
    for (let i = 0; i < stats.length; i++) {
      const sx = pad + 4 + i * colW;
      R.drawText(sx + colW / 2, y, stats[i].value, { fontSize: 14, bold: true, align: 'center' });
      R.drawText(sx + colW / 2, y + 18, stats[i].label, { fontSize: 9, color: COLORS.gray, align: 'center' });
    }
    y += 38;

    // 快速作答警告
    if (cert.is_speedrun) {
      R.ctx.fillStyle = '#FFF3CD';
      R.ctx.fillRect(pad, y, cardW, 30);
      R.ctx.strokeStyle = COLORS.border;
      R.ctx.strokeRect(pad, y, cardW, 30);
      R.drawText(pad + 8, y + 8, `⚠️ ${cert.speedrun_warning || '快速作答，成绩不计入排行'}`, { fontSize: 10, color: '#856404', maxWidth: cardW - 16 });
      y += 36;
    }

    // 各维度得分
    if (this.categoryList.length) {
      R.drawText(pad, y, '📊 各维度得分', { fontSize: 14, bold: true });
      y += 22;
      for (const cat of this.categoryList) {
        R.drawText(pad + 4, y, cat.name, { fontSize: 11, maxWidth: cardW / 2 });
        R.drawText(cardW, y, `${cat.score}/${cat.max}`, { fontSize: 11, align: 'right' });
        y += 16;
        const pct = Number(cat.percent);
        const fillColor = pct >= 80 ? COLORS.green : pct >= 50 ? COLORS.yellow : COLORS.pink;
        R.drawProgressBar(pad + 4, y, cardW - 8, 10, pct, fillColor);
        y += 16;
      }
      y += 8;
    }

    // 技能标签
    if (cert.profile?.skill_list?.length) {
      R.drawText(pad, y, '🛠 技能', { fontSize: 14, bold: true });
      y += 20;
      let skillX = pad + 4;
      for (const skill of cert.profile.skill_list) {
        const tw = R.drawTag(skillX, y, skill, { bg: COLORS.yellow, fontSize: 9 });
        skillX += tw + 6;
        if (skillX > W - pad - 40) { skillX = pad + 4; y += 20; }
      }
      y += 24;
    }

    // 准考证号
    R.drawText(pad + 4, y, '准考证号', { fontSize: 10, color: COLORS.gray });
    R.drawText(pad + 4, y + 14, this.token, { fontSize: 11, bold: true });
    y += 34;

    // 操作按钮
    R.drawButton(pad, y, cardW, 36, '📤 分享给好友', {
      bg: COLORS.yellow, color: COLORS.fg, fontSize: 13,
      handler: () => {
        const name = cert.profile?.claw_name || '我的虾';
        const percent = cert.score?.percent || 0;
        wx.shareAppMessage({
          title: `🦞 我养的虾「${name}」考了${percent}%，你的虾敢来挑战吗？`,
          query: `page=cert&token=${this.token}`
        });
      }
    });
    y += 44;

    R.drawButton(pad, y, cardW, 36, '🏠 返回首页', {
      bg: COLORS.blue, color: COLORS.fg, fontSize: 13,
      handler: () => this.app.switchTab(0)
    });
    y += 50;

    return y;
  }
}
