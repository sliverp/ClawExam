/**
 * 服务端 SVG 证书图片生成器
 * 直接返回 SVG 图片，像图床一样可以被 <img> 引用
 */

import db from './db.js';
import { getExam, getQuestion } from './exam-registry.js';

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

const gradeColors = {
  'S':  { bg1: '#fbbf24', bg2: '#f59e0b', text: '#000' },
  'A+': { bg1: '#34d399', bg2: '#10b981', text: '#fff' },
  'A':  { bg1: '#6366f1', bg2: '#7c3aed', text: '#fff' },
  'B':  { bg1: '#3b82f6', bg2: '#2563eb', text: '#fff' },
  'C':  { bg1: '#f97316', bg2: '#ea580c', text: '#fff' },
  'D':  { bg1: '#ef4444', bg2: '#dc2626', text: '#fff' },
  'F':  { bg1: '#6b7280', bg2: '#4b5563', text: '#fff' },
};

const gradeLabels = {
  'S': '传说级 · 登峰造极', 'A+': '卓越 · 近乎完美',
  'A': '优秀 · 实力强劲', 'B': '良好 · 稳步前行',
  'C': '及格 · 仍需努力', 'D': '不及格 · 继续加油', 'F': '未通过 · 从头再来'
};

const catNames = {
  basic: '🧠 基本常识', tool: '🔧 工具调用', complex: '🧩 复杂推理',
  computer: '💻 终端操作', browser: '🌐 浏览器', search: '🔍 信息检索',
};

/**
 * 获取证书数据（与 api.js 中 /api/certificate 逻辑一致）
 */
function getCertData(rawToken) {
  const token = normalizeToken(rawToken);
  if (!token) return null;

  const session = db.prepare(`SELECT es.id, es.exam_id, es.started_at, es.profile_id,
    cp.claw_name, cp.claw_version, cp.model_name, cp.owner_name, cp.skill_list, cp.claw_type
    FROM exam_sessions es JOIN claw_profiles cp ON cp.id = es.profile_id WHERE es.id = ?`).get(token);
  if (!session) return null;

  const answerRows = db.prepare(`SELECT question_id, score, max_score, submitted_at FROM answers WHERE session_id = ?`).all(token);
  if (answerRows.length === 0) return null;

  const totalScore = answerRows.reduce((s, a) => s + a.score, 0);
  const totalMax = answerRows.reduce((s, a) => s + a.max_score, 0);
  const scorePercent = totalMax > 0 ? Math.round(totalScore * 1000 / totalMax) / 10 : 0;

  const submittedTimes = answerRows.map(a => new Date(a.submitted_at).getTime()).filter(t => !isNaN(t));
  const lastSubmitMs = submittedTimes.length > 0 ? Math.max(...submittedTimes) : 0;
  const startMs = new Date(session.started_at).getTime();
  const durationSeconds = lastSubmitMs > 0 && startMs > 0 ? Math.max(0, Math.round((lastSubmitMs - startMs) / 1000)) : 0;

  const exam = getExam(session.exam_id);

  const rank = db.prepare(`SELECT COUNT(*) + 1 AS rank FROM leaderboard
    WHERE exam_id = ? AND (total_score > ? OR (total_score = ? AND started_at < ?))`).get(
    session.exam_id, totalScore, totalScore, session.started_at).rank;

  const totalParticipants = db.prepare(`SELECT COUNT(DISTINCT es.id) AS cnt FROM exam_sessions es
    JOIN answers a ON a.session_id = es.id WHERE es.exam_id = ?`).get(session.exam_id).cnt;

  const beatPercent = totalParticipants > 1
    ? Math.round((totalParticipants - rank) * 1000 / (totalParticipants - 1)) / 10
    : 100;

  const categoryScores = {};
  for (const a of answerRows) {
    const q = getQuestion(session.exam_id, a.question_id);
    if (!q) continue;
    if (!categoryScores[q.category]) categoryScores[q.category] = { score: 0, max: 0 };
    categoryScores[q.category].score += a.score;
    categoryScores[q.category].max += a.max_score;
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
 * 生成证书 SVG 图片
 */
export function generateCertSvg(rawToken) {
  const d = getCertData(rawToken);
  if (!d) return null;

  const W = 760;
  const gc = gradeColors[d.grade] || gradeColors['F'];
  const gl = gradeLabels[d.grade] || '';

  // 构建分类得分行
  const cats = Object.entries(d.category_scores || {});
  let catRowsSvg = '';
  let catY = 0;
  for (const [cat, s] of cats) {
    const pct = s.max > 0 ? Math.round(s.score * 100 / s.max) : 0;
    const label = catNames[cat] || cat;
    catRowsSvg += `
      <g transform="translate(0, ${catY})">
        <rect x="0" y="0" width="680" height="40" rx="10" fill="rgba(15,23,42,0.4)" stroke="rgba(99,102,241,0.12)" stroke-width="1"/>
        <text x="18" y="26" font-size="13" font-weight="700" fill="#e2e8f0">${esc(label)}</text>
        <rect x="160" y="14" width="400" height="12" rx="6" fill="rgba(5,8,16,0.6)"/>
        <rect x="160" y="14" width="${pct * 4}" height="12" rx="6" fill="url(#barGrad)"/>
        <text x="662" y="26" font-size="13" font-weight="800" fill="#22d3ee" text-anchor="end">${s.score}/${s.max}</text>
      </g>`;
    catY += 48;
  }
  const catSectionH = cats.length > 0 ? catY + 20 : 0;

  // 技能标签
  const skills = d.profile.skill_list || [];
  let skillsSvg = '';
  let skillX = 0;
  const skillY = 0;
  for (const sk of skills) {
    const tw = sk.length * 13 + 28;
    if (skillX + tw > 680) { skillX = 0; }
    skillsSvg += `
      <rect x="${skillX}" y="${skillY}" width="${tw}" height="28" rx="14" fill="rgba(99,102,241,0.15)" stroke="rgba(167,139,250,0.15)" stroke-width="1"/>
      <text x="${skillX + tw/2}" y="${skillY + 18}" font-size="12" font-weight="600" fill="#a78bfa" text-anchor="middle">${esc(sk)}</text>`;
    skillX += tw + 8;
  }
  const skillSectionH = skills.length > 0 ? 48 : 0;

  // 动态计算总高度
  const headerH = 140;
  const clawH = 90;
  const gradeH = 160;
  const statsH = 90;
  const catTitleH = cats.length > 0 ? 36 : 0;
  const footerH = 130;
  const totalH = headerH + clawH + gradeH + statsH + catTitleH + catSectionH + skillSectionH + footerH + 40;

  let curY = 0;

  // --- 开始拼接 SVG ---
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${totalH}" viewBox="0 0 ${W} ${totalH}">
  <defs>
    <linearGradient id="topBar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#6366f1"/>
      <stop offset="33%" stop-color="#22d3ee"/>
      <stop offset="66%" stop-color="#a78bfa"/>
      <stop offset="100%" stop-color="#6366f1"/>
    </linearGradient>
    <linearGradient id="titleGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fff"/>
      <stop offset="60%" stop-color="#22d3ee"/>
      <stop offset="100%" stop-color="#a78bfa"/>
    </linearGradient>
    <linearGradient id="gradeGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${gc.bg1}"/>
      <stop offset="100%" stop-color="${gc.bg2}"/>
    </linearGradient>
    <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#6366f1"/>
      <stop offset="100%" stop-color="#22d3ee"/>
    </linearGradient>
    <linearGradient id="accentGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#22d3ee"/>
      <stop offset="100%" stop-color="#a78bfa"/>
    </linearGradient>
    <linearGradient id="brandGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#6366f1"/>
      <stop offset="100%" stop-color="#22d3ee"/>
    </linearGradient>
  </defs>

  <!-- 背景 -->
  <rect width="${W}" height="${totalH}" rx="24" fill="#0a0f1e"/>
  <rect width="${W}" height="${totalH}" rx="24" fill="rgba(15,23,42,0.9)" stroke="rgba(99,102,241,0.12)" stroke-width="1"/>

  <!-- 顶部渐变条 -->
  <rect x="0" y="0" width="${W}" height="4" rx="2" fill="url(#topBar)"/>`;

  // --- Header ---
  curY = 48;
  svg += `
  <text x="${W/2}" y="${curY}" text-anchor="middle" font-size="12" font-weight="700" fill="#64748b" letter-spacing="6">CLAWEXAM CERTIFICATE</text>`;
  curY += 40;
  svg += `
  <text x="${W/2}" y="${curY}" text-anchor="middle" font-size="34" font-weight="900" fill="url(#titleGrad)">能力认证证书</text>`;
  curY += 32;
  svg += `
  <text x="${W/2}" y="${curY}" text-anchor="middle" font-size="16" font-weight="500" fill="#a78bfa">📋 ${esc(d.exam_name)}</text>`;
  curY += 40;

  // --- Claw Info ---
  svg += `
  <text x="${W/2}" y="${curY}" text-anchor="middle" font-size="30" font-weight="900" fill="#fff">${esc(d.profile.claw_name)}</text>`;
  curY += 28;

  const metaItems = [
    `品种 ${d.profile.claw_type}`,
    `版本 v${d.profile.claw_version}`,
    `Model ${d.profile.model_name}`
  ];
  const metaStr = metaItems.join('    ');
  svg += `
  <text x="${W/2}" y="${curY}" text-anchor="middle" font-size="13" fill="#94a3b8">${esc(metaStr)}</text>`;
  curY += 40;

  // --- Grade Circle ---
  const gradeCx = W / 2;
  const gradeCy = curY + 55;
  svg += `
  <circle cx="${gradeCx}" cy="${gradeCy}" r="52" fill="url(#gradeGrad)"/>
  <text x="${gradeCx}" y="${gradeCy + 16}" text-anchor="middle" font-size="42" font-weight="900" fill="${gc.text}">${esc(d.grade)}</text>`;
  curY = gradeCy + 68;
  svg += `
  <text x="${W/2}" y="${curY}" text-anchor="middle" font-size="13" fill="#64748b" font-weight="500">${esc(gl)}</text>`;
  curY += 36;

  // --- Stats Grid (4 columns) ---
  const statsData = [
    { val: `${d.score.total}/${d.score.max}`, label: '总得分' },
    { val: `#${d.rank}`, label: '排名' },
    { val: `${d.beat_percent}%`, label: '打败龙虾' },
    { val: formatDur(d.duration_seconds), label: '用时' },
  ];
  const statW = 160;
  const statGap = 14;
  const statStartX = (W - (statW * 4 + statGap * 3)) / 2;
  for (let i = 0; i < 4; i++) {
    const sx = statStartX + i * (statW + statGap);
    svg += `
    <rect x="${sx}" y="${curY}" width="${statW}" height="65" rx="14" fill="rgba(15,23,42,0.4)" stroke="rgba(99,102,241,0.12)" stroke-width="1"/>
    <text x="${sx + statW/2}" y="${curY + 30}" text-anchor="middle" font-size="20" font-weight="900" fill="url(#accentGrad)">${esc(statsData[i].val)}</text>
    <text x="${sx + statW/2}" y="${curY + 50}" text-anchor="middle" font-size="11" font-weight="500" fill="#64748b">${esc(statsData[i].label)}</text>`;
  }
  curY += 85;

  // --- Category Scores ---
  if (cats.length > 0) {
    svg += `
    <text x="40" y="${curY}" font-size="12" font-weight="600" fill="#64748b" letter-spacing="1.5">各维度得分</text>`;
    curY += 20;
    svg += `<g transform="translate(40, ${curY})">${catRowsSvg}</g>`;
    curY += catSectionH;
  }

  // --- Skills ---
  if (skills.length > 0) {
    svg += `<g transform="translate(40, ${curY})">${skillsSvg}</g>`;
    curY += skillSectionH;
  }

  // --- Footer ---
  svg += `
  <line x1="0" y1="${curY}" x2="${W}" y2="${curY}" stroke="rgba(99,102,241,0.12)" stroke-width="1"/>`;
  curY += 24;

  // 准考证号
  svg += `
  <rect x="${W/2 - 220}" y="${curY}" width="440" height="30" rx="8" fill="rgba(5,8,16,0.5)" stroke="rgba(99,102,241,0.12)" stroke-width="1"/>
  <text x="${W/2}" y="${curY + 20}" text-anchor="middle" font-size="11" font-family="monospace" fill="#64748b">准考证号: ${esc(d.exam_token)}</text>`;
  curY += 40;

  // 考试时间
  svg += `
  <text x="${W/2}" y="${curY}" text-anchor="middle" font-size="12" fill="#64748b">考试时间: ${esc(d.started_at)}</text>`;
  curY += 24;

  // Brand
  svg += `
  <text x="${W/2}" y="${curY}" text-anchor="middle" font-size="13" font-weight="700" fill="url(#brandGrad)">🐾 ClawExam — OpenClaw AI 能力测试平台</text>`;

  svg += '\n</svg>';

  return svg;
}
