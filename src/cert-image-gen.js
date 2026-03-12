/**
 * 服务端 SVG 证书图片生成器 — Neobrutalism 风格
 * 直接返回 SVG 图片，像图床一样可以被 <img> 引用
 *
 * 设计特征：
 * - 奶油色背景 + 粗黑边框 (3px)
 * - 硬阴影 (无模糊纯色偏移)
 * - 高饱和度色块 (红、黄、蓝、紫、橙)
 * - 龙虾主题元素
 * - Space Grotesk 字体
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';
import { getExam, getQuestion } from './exam-registry.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 预加载二维码图片为 base64（只读一次）
let qrcodeBase64 = '';
try {
  const qrPath = path.join(__dirname, '..', 'data', 'qrcode.png');
  console.log('二维码路径:', qrPath, '存在:', fs.existsSync(qrPath));
  const qrBuf = fs.readFileSync(qrPath);
  qrcodeBase64 = `data:image/png;base64,${qrBuf.toString('base64')}`;
  console.log('二维码加载成功, base64 长度:', qrcodeBase64.length);
} catch (e) {
  console.warn('二维码图片加载失败:', e.message);
}

function normalizeToken(input) {
  if (!input) return input;
  const hex = input.replace(/-/g, '').toLowerCase();
  if (/^[0-9a-f]{32}$/.test(hex)) {
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
  }
  return input;
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDur(seconds) {
  if (!seconds || seconds <= 0) return '-';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h${m}m${s}s`;
  if (m > 0) return `${m}m${s}s`;
  return `${s}s`;
}

// Neobrutalism 配色
const COLORS = {
  bg: '#FFFBEB',
  cream: '#FFF8E1',
  fg: '#1a1a1a',
  red: '#E63B2E',
  orange: '#FF6B35',
  yellow: '#FFD93D',
  blue: '#3EC1D3',
  purple: '#B388FF',
  pink: '#FF6B6B',
  green: '#6EE7B7',
  white: '#FFFFFF',
};

const gradeStyles = {
  'S':  { bg: COLORS.yellow, text: COLORS.fg, label: '传说级 · 登峰造极' },
  'A+': { bg: COLORS.blue,   text: COLORS.white, label: '卓越 · 近乎完美' },
  'A':  { bg: COLORS.purple, text: COLORS.white, label: '优秀 · 实力强劲' },
  'B':  { bg: COLORS.blue,   text: COLORS.white, label: '良好 · 稳步前行' },
  'C':  { bg: COLORS.orange, text: COLORS.white, label: '及格 · 仍需努力' },
  'D':  { bg: COLORS.red,    text: COLORS.white, label: '不及格 · 继续加油' },
  'F':  { bg: '#999',        text: COLORS.white, label: '未通过 · 从头再来' },
};

// 不同试卷对应的 header 颜色
const examHeaderColors = {
  'v1': { bg: '#6EE7B7', text: '#1a1a1a', accent: '#1a1a1a' },  // 初级 — 浅绿色
  'v2': { bg: '#FF6B35', text: '#FFFFFF', accent: '#FFD93D' },  // 中级 — 橙色
};
const defaultHeaderColor = { bg: COLORS.red, text: COLORS.white, accent: COLORS.yellow };

const catConfig = {
  basic:    { name: '基本常识', color: COLORS.red },
  tool:     { name: '工具调用', color: COLORS.orange },
  complex:  { name: '复杂推理', color: COLORS.purple },
  computer: { name: '终端操作', color: COLORS.blue },
  browser:  { name: '浏览器',   color: COLORS.pink },
  search:   { name: '信息检索', color: COLORS.yellow },
};

/**
 * 获取证书数据
 */
async function getCertData(rawToken) {
  const token = normalizeToken(rawToken);
  if (!token) return null;

  const session = await db.get(`SELECT es.id, es.exam_id, es.started_at, es.profile_id,
    cp.claw_name, cp.claw_version, cp.model_name, cp.owner_name, cp.skill_list, cp.claw_type
    FROM exam_sessions es JOIN claw_profiles cp ON cp.id = es.profile_id WHERE es.id = ?`, [token]);
  if (!session) return null;

  const answerRows = await db.all('SELECT question_id, score, max_score, submitted_at FROM answers WHERE session_id = ?', [token]);
  if (answerRows.length === 0) return null;

  const exam = getExam(session.exam_id);
  const totalScore = answerRows.reduce((s, a) => s + a.score, 0);

  // 计算本 session 的满分（基于 session_questions）
  const sessionQuestionIds = await db.all('SELECT question_id FROM session_questions WHERE session_id = ?', [token]);
  let sessionMax = 0;
  for (const row of sessionQuestionIds) {
    const q = getQuestion(session.exam_id, row.question_id);
    if (q) sessionMax += q.score;
  }
  const totalMax = sessionMax || exam?.total_score || answerRows.reduce((s, a) => s + a.max_score, 0);
  const scorePercent = totalMax > 0 ? Math.round(totalScore * 1000 / totalMax) / 10 : 0;

  const submittedTimes = answerRows.map(a => new Date(a.submitted_at).getTime()).filter(t => !isNaN(t));
  const lastSubmitMs = submittedTimes.length > 0 ? Math.max(...submittedTimes) : 0;
  const startMs = new Date(session.started_at).getTime();
  const durationSeconds = lastSubmitMs > 0 && startMs > 0 ? Math.max(0, Math.round((lastSubmitMs - startMs) / 1000)) : 0;

  const rankRow = await db.get(`SELECT COUNT(*) + 1 AS \`rank\` FROM leaderboard
    WHERE exam_id = ? AND (total_score > ? OR (total_score = ? AND started_at < ?))`,
    [session.exam_id, totalScore, totalScore, session.started_at]);
  const rank = rankRow.rank;

  const participantRow = await db.get(`SELECT COUNT(DISTINCT es.id) AS cnt FROM exam_sessions es
    JOIN answers a ON a.session_id = es.id WHERE es.exam_id = ?`, [session.exam_id]);
  const totalParticipants = participantRow.cnt;

  const beatPercent = totalParticipants > 1
    ? Math.round((totalParticipants - rank) * 1000 / (totalParticipants - 1)) / 10
    : 100;

  // 各维度得分：按 category 分组，受 pick_config 限制
  const categoryScores = {};
  const catAnswers = {};
  for (const a of answerRows) {
    const q = getQuestion(session.exam_id, a.question_id);
    if (!q) continue;
    if (!catAnswers[q.category]) catAnswers[q.category] = [];
    catAnswers[q.category].push(a.score);
  }
  if (exam) {
    for (const [cat, scores] of Object.entries(catAnswers)) {
      let limit = scores.length;
      if (exam.pick_config && exam.pick_config[cat] != null) {
        limit = Math.min(limit, exam.pick_config[cat]);
      }
      scores.sort((a, b) => b - a);
      const topScores = scores.slice(0, limit);
      const perScore = exam.questions.find(q => q.category === cat)?.score || 0;
      categoryScores[cat] = {
        score: topScores.reduce((s, v) => s + v, 0),
        max: limit * perScore,
      };
    }
  } else {
    for (const [cat, scores] of Object.entries(catAnswers)) {
      categoryScores[cat] = { score: scores.reduce((s, v) => s + v, 0), max: 0 };
    }
  }

  let grade = 'F';
  if (scorePercent >= 95) grade = 'S';
  else if (scorePercent >= 90) grade = 'A+';
  else if (scorePercent >= 80) grade = 'A';
  else if (scorePercent >= 70) grade = 'B';
  else if (scorePercent >= 60) grade = 'C';
  else if (scorePercent >= 40) grade = 'D';

  return {
    exam_token: token,
    exam_id: session.exam_id,
    exam_name: exam?.name || session.exam_id,
    profile: {
      claw_name: session.claw_name,
      claw_version: session.claw_version,
      claw_type: session.claw_type || 'OpenClaw',
      model_name: session.model_name,
      owner_name: session.owner_name,
      skill_list: JSON.parse(session.skill_list || '[]'),
    },
    score: { total: totalScore, max: totalMax, percent: scorePercent },
    grade,
    rank,
    total_participants: totalParticipants,
    beat_percent: beatPercent,
    category_scores: categoryScores,
    started_at: session.started_at,
    duration_seconds: durationSeconds,
  };
}

/**
 * 绘制 Neobrutalism 风格的矩形（粗边框 + 硬阴影）
 */
function neoRect(x, y, w, h, fill, shadowOffset = 4) {
  return `<rect x="${x + shadowOffset}" y="${y + shadowOffset}" width="${w}" height="${h}" fill="${COLORS.fg}"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${COLORS.fg}" stroke-width="3"/>`;
}

/**
 * 生成证书 SVG 图片 — Neobrutalism 风格
 */
export async function generateCertSvg(rawToken) {
  const d = await getCertData(rawToken);
  if (!d) return null;

  const W = 800;
  const BW = 3; // border width
  const gs = gradeStyles[d.grade] || gradeStyles['F'];

  const cats = Object.entries(d.category_scores || {});
  const skills = d.profile.skill_list || [];

  const headerH = 100;      // 顶部标题栏
  const clawInfoH = 110;    // 虾名 + 元信息
  const gradeH = 180;       // 等级徽章
  const statsH = 100;       // 四格统计
  const catRowH = 52;
  const footerContentH = 220;

  // 用占位符，绘制完毕后替换为实际高度
  const HEIGHT_PLACEHOLDER = '__TOTAL_HEIGHT__';

  let curY = 0;

  // ===== 开始拼接 SVG（高度先用占位符）=====
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${HEIGHT_PLACEHOLDER}" viewBox="0 0 ${W} ${HEIGHT_PLACEHOLDER}">
  <defs>
    <style>
      text { font-family: 'Noto Sans CJK SC', 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif; }
    </style>
    <!-- 点阵纹理 -->
    <pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1" fill="${COLORS.fg}" opacity="0.06"/>
    </pattern>
  </defs>

  <!-- 外框：硬阴影（尺寸占位，绘制完成后替换） -->
  <rect x="8" y="8" width="${W - 8}" height="${HEIGHT_PLACEHOLDER}_INNER" fill="${COLORS.fg}"/>
  <rect x="0" y="0" width="${W - 8}" height="${HEIGHT_PLACEHOLDER}_INNER" fill="${COLORS.bg}" stroke="${COLORS.fg}" stroke-width="${BW}"/>

  <!-- 点阵纹理覆盖 -->
  <rect x="0" y="0" width="${W - 8}" height="${HEIGHT_PLACEHOLDER}_INNER" fill="url(#dots)"/>`;

  const contentW = W - 8;
  const innerLeft = 40;
  const innerRight = contentW - 40;
  const innerW = innerRight - innerLeft;

  // ===== 顶部标题栏（根据试卷级别变色）=====
  const hc = examHeaderColors[d.exam_id] || defaultHeaderColor;
  svg += `
  <rect x="0" y="0" width="${contentW}" height="${headerH}" fill="${hc.bg}" stroke="${COLORS.fg}" stroke-width="${BW}"/>
  <text x="${contentW / 2}" y="38" text-anchor="middle" font-size="11" font-weight="800" fill="${hc.accent}" letter-spacing="6" text-transform="uppercase">CLAWEXAM CERTIFICATE</text>
  <text x="${contentW / 2}" y="72" text-anchor="middle" font-size="32" font-weight="800" fill="${hc.text}">能力认证证书</text>
  <text x="${contentW / 2}" y="92" text-anchor="middle" font-size="14" font-weight="600" fill="${hc.accent}">${esc(d.exam_name)}</text>`;
  curY = headerH;

  // ===== 虾名 + 元信息 =====
  svg += `
  <text x="${contentW / 2}" y="${curY + 50}" text-anchor="middle" font-size="36" font-weight="800" fill="${COLORS.fg}">${esc(d.profile.claw_name)}</text>`;

  // 三个标签芯片
  const chipData = [
    { text: d.profile.claw_type, bg: COLORS.orange },
    { text: d.profile.model_name, bg: COLORS.blue },
    { text: `v${d.profile.claw_version}`, bg: COLORS.purple },
  ];
  const chipW = 140;
  const chipH = 28;
  const chipGap = 12;
  const totalChipW = chipData.length * chipW + (chipData.length - 1) * chipGap;
  let chipX = (contentW - totalChipW) / 2;
  const chipY = curY + 66;

  for (const chip of chipData) {
    // 硬阴影
    svg += `<rect x="${chipX + 3}" y="${chipY + 3}" width="${chipW}" height="${chipH}" fill="${COLORS.fg}"/>`;
    svg += `<rect x="${chipX}" y="${chipY}" width="${chipW}" height="${chipH}" fill="${chip.bg}" stroke="${COLORS.fg}" stroke-width="2"/>`;
    svg += `<text x="${chipX + chipW / 2}" y="${chipY + 19}" text-anchor="middle" font-size="12" font-weight="800" fill="${COLORS.white}">${esc(chip.text)}</text>`;
    chipX += chipW + chipGap;
  }
  curY += clawInfoH;

  // ===== 分割线 =====
  svg += `<line x1="0" y1="${curY}" x2="${contentW}" y2="${curY}" stroke="${COLORS.fg}" stroke-width="${BW}"/>`;

  // ===== 等级徽章区域 =====
  const gradeCx = contentW / 2;
  const gradeCy = curY + 80;
  const gradeSize = 90;

  // 等级方块（Neobrutalism 用方形，不用圆形）
  svg += `
  <rect x="${gradeCx - gradeSize / 2 + 6}" y="${gradeCy - gradeSize / 2 + 6}" width="${gradeSize}" height="${gradeSize}" fill="${COLORS.fg}"/>
  <rect x="${gradeCx - gradeSize / 2}" y="${gradeCy - gradeSize / 2}" width="${gradeSize}" height="${gradeSize}" fill="${gs.bg}" stroke="${COLORS.fg}" stroke-width="${BW}"/>
  <text x="${gradeCx}" y="${gradeCy + 20}" text-anchor="middle" font-size="52" font-weight="800" fill="${gs.text}">${esc(d.grade)}</text>`;

  // 等级标签
  svg += `
  <text x="${gradeCx}" y="${gradeCy + gradeSize / 2 + 28}" text-anchor="middle" font-size="16" font-weight="800" fill="${COLORS.fg}">${esc(gs.label)}</text>
  <text x="${gradeCx}" y="${gradeCy + gradeSize / 2 + 48}" text-anchor="middle" font-size="14" font-weight="600" fill="#666">得分率 ${d.score.percent}%</text>`;
  curY += gradeH;

  // ===== 分割线 =====
  svg += `<line x1="0" y1="${curY}" x2="${contentW}" y2="${curY}" stroke="${COLORS.fg}" stroke-width="${BW}"/>`;

  // ===== 四格统计 =====
  const statsData = [
    { val: `${d.score.total}/${d.score.max}`, label: '总得分', bg: COLORS.yellow },
    { val: `#${d.rank}`, label: '排名', bg: COLORS.blue },
    { val: `${d.beat_percent}%`, label: '打败龙虾', bg: COLORS.green },
    { val: formatDur(d.duration_seconds), label: '用时', bg: COLORS.purple },
  ];
  const statCellW = contentW / 4;

  for (let i = 0; i < 4; i++) {
    const sx = i * statCellW;
    // 单元格背景
    svg += `<rect x="${sx}" y="${curY}" width="${statCellW}" height="${statsH}" fill="${COLORS.bg}" stroke="${COLORS.fg}" stroke-width="${i < 3 ? BW : 0}"/>`;
    // 右边框
    if (i < 3) {
      svg += `<line x1="${sx + statCellW}" y1="${curY}" x2="${sx + statCellW}" y2="${curY + statsH}" stroke="${COLORS.fg}" stroke-width="${BW}"/>`;
    }
    // 小色块标记
    svg += `<rect x="${sx + statCellW / 2 - 24}" y="${curY + 14}" width="48" height="6" fill="${statsData[i].bg}"/>`;
    // 数值
    svg += `<text x="${sx + statCellW / 2}" y="${curY + 55}" text-anchor="middle" font-size="24" font-weight="800" fill="${COLORS.fg}">${esc(statsData[i].val)}</text>`;
    // 标签
    svg += `<text x="${sx + statCellW / 2}" y="${curY + 78}" text-anchor="middle" font-size="11" font-weight="700" fill="#888" letter-spacing="1">${esc(statsData[i].label)}</text>`;
  }
  curY += statsH;

  // ===== 分割线 =====
  svg += `<line x1="0" y1="${curY}" x2="${contentW}" y2="${curY}" stroke="${COLORS.fg}" stroke-width="${BW}"/>`;

  // ===== 各维度得分 =====
  if (cats.length > 0) {
    curY += 20;
    svg += `<text x="${contentW / 2}" y="${curY + 20}" text-anchor="middle" font-size="12" font-weight="800" fill="${COLORS.fg}" letter-spacing="4">各维度得分</text>`;
    curY += 50;

    for (const [cat, s] of cats) {
      const pct = s.max > 0 ? Math.round(s.score * 100 / s.max) : 0;
      const cfg = catConfig[cat] || { name: cat, color: COLORS.red };
      const barLeft = innerLeft + 120;
      const barW = innerW - 120 - 70;
      const fillW = Math.round(pct * barW / 100);

      // 行背景（Neobrutalism 卡片）
      svg += `<rect x="${innerLeft + 3}" y="${curY + 3}" width="${innerW}" height="40" fill="${COLORS.fg}"/>`;
      svg += `<rect x="${innerLeft}" y="${curY}" width="${innerW}" height="40" fill="${COLORS.white}" stroke="${COLORS.fg}" stroke-width="2"/>`;

      // 维度名
      svg += `<text x="${innerLeft + 14}" y="${curY + 26}" font-size="13" font-weight="800" fill="${COLORS.fg}">${esc(cfg.name)}</text>`;

      // 进度条背景
      svg += `<rect x="${barLeft}" y="${curY + 13}" width="${barW}" height="16" fill="${COLORS.cream}" stroke="${COLORS.fg}" stroke-width="2"/>`;
      // 进度条填充
      if (fillW > 0) {
        svg += `<rect x="${barLeft}" y="${curY + 13}" width="${fillW}" height="16" fill="${cfg.color}"/>`;
      }

      // 分数
      svg += `<text x="${innerRight - 8}" y="${curY + 27}" text-anchor="end" font-size="13" font-weight="800" fill="${COLORS.fg}">${s.score}/${s.max}</text>`;

      curY += catRowH;
    }
    curY += 10;
  }

  // ===== 技能标签 =====
  if (skills.length > 0) {
    curY += 8;
    let skillX = innerLeft;
    const skillRowY = curY;
    const tagH = 26;
    const tagColors = [COLORS.yellow, COLORS.blue, COLORS.purple, COLORS.orange, COLORS.green, COLORS.pink];

    for (let i = 0; i < skills.length; i++) {
      const sk = skills[i];
      const tw = sk.length * 12 + 24;
      const tc = tagColors[i % tagColors.length];

      if (skillX + tw > innerRight) {
        skillX = innerLeft;
        curY += tagH + 10;
      }

      // 硬阴影标签
      svg += `<rect x="${skillX + 3}" y="${curY + 3}" width="${tw}" height="${tagH}" fill="${COLORS.fg}"/>`;
      svg += `<rect x="${skillX}" y="${curY}" width="${tw}" height="${tagH}" fill="${tc}" stroke="${COLORS.fg}" stroke-width="2"/>`;
      svg += `<text x="${skillX + tw / 2}" y="${curY + 18}" text-anchor="middle" font-size="11" font-weight="800" fill="${COLORS.fg}">${esc(sk)}</text>`;
      skillX += tw + 10;
    }
    curY += tagH + 10;
  }

  // ===== 底部信息 + 二维码 =====
  svg += `<line x1="0" y1="${curY}" x2="${contentW}" y2="${curY}" stroke="${COLORS.fg}" stroke-width="${BW}"/>`;

  const footerY = curY;
  const qrSize = 170;
  svg += `<rect x="0" y="${footerY}" width="${contentW}" height="${footerContentH}" fill="${COLORS.fg}"/>`;

  if (qrcodeBase64) {
    // 左侧：二维码（大尺寸，无额外方框）
    const qrX = 25;
    const qrY = footerY + (footerContentH - qrSize) / 2;
    svg += `<image xlink:href="${qrcodeBase64}" x="${qrX}" y="${qrY}" width="${qrSize}" height="${qrSize}"/>`;

    // 右侧：文字信息
    const textLeft = qrX + qrSize + 30;
    const textCenterX = textLeft + (contentW - textLeft - 20) / 2;

    // 醒目提示语（更大更粗 + 白色描边效果）
    svg += `<text x="${textCenterX}" y="${footerY + 45}" text-anchor="middle" font-size="28" font-weight="900" fill="${COLORS.yellow}" letter-spacing="2">快来测测你的龙虾</text>`;
    svg += `<text x="${textCenterX}" y="${footerY + 80}" text-anchor="middle" font-size="28" font-weight="900" fill="${COLORS.yellow}" letter-spacing="2">是什么等级！</text>`;

    // 扫码提示
    svg += `<text x="${textCenterX}" y="${footerY + 108}" text-anchor="middle" font-size="14" font-weight="700" fill="${COLORS.white}">← 扫描二维码立即挑战</text>`;

    // 准考证号
    svg += `<text x="${textCenterX}" y="${footerY + 140}" text-anchor="middle" font-size="10" font-family="'Courier New', monospace" fill="#888">准考证号: ${esc(d.exam_token)}</text>`;

    // 考试时间
    svg += `<text x="${textCenterX}" y="${footerY + 162}" text-anchor="middle" font-size="11" fill="#888">考试时间: ${esc(d.started_at)}</text>`;

    // 品牌
    svg += `<text x="${textCenterX}" y="${footerY + 190}" text-anchor="middle" font-size="13" font-weight="800" fill="${COLORS.yellow}">ClawExam — OpenClaw AI 能力测试平台</text>`;
  } else {
    // 无二维码时居中显示文字
    svg += `<text x="${contentW / 2}" y="${footerY + 50}" text-anchor="middle" font-size="28" font-weight="900" fill="${COLORS.yellow}" letter-spacing="2">快来测测你的龙虾是什么等级！</text>`;
    svg += `<text x="${contentW / 2}" y="${footerY + 90}" text-anchor="middle" font-size="11" font-family="'Courier New', monospace" fill="#888">准考证号: ${esc(d.exam_token)}</text>`;
    svg += `<text x="${contentW / 2}" y="${footerY + 120}" text-anchor="middle" font-size="12" fill="#888">考试时间: ${esc(d.started_at)}</text>`;
    svg += `<text x="${contentW / 2}" y="${footerY + 155}" text-anchor="middle" font-size="14" font-weight="800" fill="${COLORS.yellow}">ClawExam — OpenClaw AI 能力测试平台</text>`;
  }

  svg += '\n</svg>';

  // ===== 计算实际总高度并替换占位符 =====
  const totalH = curY + footerContentH + 8; // 8 为外框硬阴影偏移
  const innerH = totalH - 8;
  svg = svg.replaceAll(HEIGHT_PLACEHOLDER + '_INNER', String(innerH));
  svg = svg.replaceAll(HEIGHT_PLACEHOLDER, String(totalH));

  return svg;
}
