import express from 'express';
import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

// ── 手动加载外部 .env ──
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env');
try {
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
} catch { /* .env 不存在则依赖环境变量 */ }

// ── 配置 ──
const PORT = 8080;
const BOARD_USER = process.env.BOARD_USER || 'admin';
const BOARD_PASS = process.env.BOARD_PASS || 'Lighthouse!@#123';

// ── MySQL 连接池 ──
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'clawexam',
  charset: process.env.MYSQL_CHARSET || 'utf8mb4',
  connectionLimit: 5,
  timezone: '+08:00',
  enableKeepAlive: true,
});

// ── Express ──
const app = express();

// Basic Auth 中间件
app.use((req, res, next) => {
  // 允许健康检查
  if (req.path === '/health') return next();

  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="ClawExam Dashboard"');
    return res.status(401).send('需要登录');
  }
  const decoded = Buffer.from(auth.slice(6), 'base64').toString();
  const [user, pass] = decoded.split(':');
  if (user !== BOARD_USER || pass !== BOARD_PASS) {
    res.set('WWW-Authenticate', 'Basic realm="ClawExam Dashboard"');
    return res.status(401).send('账号或密码错误');
  }
  next();
});

// ── API：趋势数据 ──
app.get('/api/trends', async (req, res) => {
  try {
    const dim = req.query.dim || 'day'; // hour | day | week
    let dateFmt, groupExpr;

    if (dim === 'hour') {
      dateFmt = '%Y-%m-%d %H:00';
      groupExpr = `DATE_FORMAT(ts, '${dateFmt}')`;
    } else if (dim === 'week') {
      // 按周：使用周一作为起始
      dateFmt = '%x-W%v';
      groupExpr = `DATE_FORMAT(ts, '${dateFmt}')`;
    } else {
      dateFmt = '%Y-%m-%d';
      groupExpr = `DATE_FORMAT(ts, '${dateFmt}')`;
    }

    // 1. OpenClaw 注册趋势（claw_profiles）
    const [clawRows] = await pool.query(`
      SELECT ${groupExpr.replace(/ts/g, 'created_at')} AS label,
             COUNT(*) AS count
      FROM claw_profiles
      GROUP BY label ORDER BY label
    `);

    // 2. 微信用户注册趋势（users）
    const [userRows] = await pool.query(`
      SELECT ${groupExpr.replace(/ts/g, 'created_at')} AS label,
             COUNT(*) AS count
      FROM users
      GROUP BY label ORDER BY label
    `);

    // 3. 答题数量趋势（answers）
    const [answerRows] = await pool.query(`
      SELECT ${groupExpr.replace(/ts/g, 'submitted_at')} AS label,
             COUNT(*) AS count
      FROM answers
      GROUP BY label ORDER BY label
    `);

    // 4. 汇总数据
    const [[summary]] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM claw_profiles) AS total_claws,
        (SELECT COUNT(*) FROM users) AS total_users,
        (SELECT COUNT(*) FROM answers) AS total_answers,
        (SELECT COUNT(*) FROM exam_sessions) AS total_sessions
    `);

    res.json({
      ok: true,
      dim,
      summary,
      claw_trend: clawRows,
      user_trend: userRows,
      answer_trend: answerRows,
    });
  } catch (err) {
    console.error('趋势查询失败:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── API：各试卷答题趋势（公开看板用） ──
app.get('/api/exam-trends', async (req, res) => {
  try {
    const dim = req.query.dim || 'day';
    let dateFmt;
    if (dim === 'hour') dateFmt = '%Y-%m-%d %H:00';
    else if (dim === 'week') dateFmt = '%x-W%v';
    else dateFmt = '%Y-%m-%d';

    const examIds = ['v1', 'v2', 'v3'];
    const trends = {};

    for (const eid of examIds) {
      const [rows] = await pool.query(`
        SELECT DATE_FORMAT(submitted_at, ?) AS label, COUNT(*) AS count
        FROM answers WHERE exam_id = ?
        GROUP BY label ORDER BY label
      `, [dateFmt, eid]);
      trends[eid] = rows;
    }

    // 各试卷汇总
    const [examSummary] = await pool.query(`
      SELECT exam_id,
             COUNT(*) AS answer_count,
             COUNT(DISTINCT session_id) AS session_count
      FROM answers
      WHERE exam_id IN ('v1','v2','v3')
      GROUP BY exam_id
    `);

    const summary = {};
    for (const row of examSummary) {
      summary[row.exam_id] = { answers: row.answer_count, sessions: row.session_count };
    }

    res.json({ ok: true, dim, summary, trends });
  } catch (err) {
    console.error('试卷趋势查询失败:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── 健康检查 ──
app.get('/health', (req, res) => res.json({ ok: true }));

// ── 首页：内嵌 HTML（需登录） ──
app.get('/', (req, res) => {
  res.type('html').send(getHTML());
});

// ── 公开看板：各试卷答题数据（需登录） ──
app.get('/exams', (req, res) => {
  res.type('html').send(getExamBoardHTML());
});

app.listen(PORT, () => {
  console.log(`📊 Dashboard running on http://localhost:${PORT}`);
});

// ── 内嵌前端页面 ──
function getHTML() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>考了个虾 · 数据报表</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"><\/script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, "SF Pro Display", "Helvetica Neue", sans-serif;
    background: #0f0f13;
    color: #e0e0e0;
    min-height: 100vh;
  }

  .header {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    padding: 32px 40px 24px;
    border-bottom: 2px solid #FF3B30;
  }
  .header h1 {
    font-size: 28px;
    font-weight: 800;
    color: #fff;
  }
  .header h1 span { color: #FF3B30; }
  .header p { color: #888; margin-top: 4px; font-size: 14px; }

  .summary-bar {
    display: flex;
    gap: 20px;
    padding: 24px 40px;
    background: #16161d;
    flex-wrap: wrap;
  }
  .summary-card {
    flex: 1;
    min-width: 180px;
    background: linear-gradient(135deg, #1e1e2a, #252535);
    border-radius: 12px;
    padding: 20px 24px;
    border: 1px solid #2a2a3a;
  }
  .summary-card .num {
    font-size: 36px;
    font-weight: 900;
    color: #fff;
    line-height: 1.1;
  }
  .summary-card .label {
    font-size: 13px;
    color: #888;
    margin-top: 4px;
  }
  .summary-card:nth-child(1) .num { color: #FF3B30; }
  .summary-card:nth-child(2) .num { color: #3EC1D3; }
  .summary-card:nth-child(3) .num { color: #FFD93D; }
  .summary-card:nth-child(4) .num { color: #A855F7; }

  .controls {
    display: flex;
    gap: 8px;
    padding: 20px 40px 0;
  }
  .dim-btn {
    padding: 8px 20px;
    border-radius: 20px;
    border: 1px solid #333;
    background: transparent;
    color: #aaa;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .dim-btn:hover { border-color: #FF3B30; color: #FF3B30; }
  .dim-btn.active {
    background: #FF3B30;
    border-color: #FF3B30;
    color: #fff;
    font-weight: 600;
  }

  .charts {
    padding: 24px 40px 60px;
    display: flex;
    flex-direction: column;
    gap: 32px;
  }
  .chart-wrap {
    background: linear-gradient(135deg, #1a1a24, #1e1e2e);
    border-radius: 16px;
    padding: 28px 28px 20px;
    border: 1px solid #2a2a3a;
  }
  .chart-wrap h3 {
    font-size: 18px;
    font-weight: 700;
    margin-bottom: 16px;
    color: #fff;
  }
  .chart-container {
    position: relative;
    width: 100%;
    height: 340px;
  }

  .loading-overlay {
    position: fixed; inset: 0;
    background: rgba(15,15,19,0.85);
    display: flex; align-items: center; justify-content: center;
    z-index: 999;
    font-size: 18px; color: #888;
  }

  @media (max-width: 768px) {
    .header, .summary-bar, .controls, .charts { padding-left: 16px; padding-right: 16px; }
    .chart-container { height: 260px; }
    .summary-card .num { font-size: 28px; }
  }
</style>
</head>
<body>

<div class="header">
  <h1>🦞 考了个虾 · <span>数据报表</span></h1>
  <p>ClawExam Dashboard — 实时数据概览 · <a href="/exams" style="color:#A855F7;text-decoration:none;">查看试卷答题看板 →</a></p>
</div>

<div class="summary-bar" id="summaryBar">
  <div class="summary-card"><div class="num" id="totalClaws">-</div><div class="label">OpenClaw 注册数</div></div>
  <div class="summary-card"><div class="num" id="totalUsers">-</div><div class="label">微信用户数</div></div>
  <div class="summary-card"><div class="num" id="totalAnswers">-</div><div class="label">总答题数</div></div>
  <div class="summary-card"><div class="num" id="totalSessions">-</div><div class="label">总考试场次</div></div>
</div>

<div class="controls">
  <button class="dim-btn" data-dim="hour">按小时</button>
  <button class="dim-btn active" data-dim="day">按天</button>
  <button class="dim-btn" data-dim="week">按周</button>
</div>

<div class="charts">
  <div class="chart-wrap">
    <h3>🦞 OpenClaw 注册数量趋势</h3>
    <div class="chart-container"><canvas id="clawChart"></canvas></div>
  </div>
  <div class="chart-wrap">
    <h3>👤 微信用户注册数量趋势</h3>
    <div class="chart-container"><canvas id="userChart"></canvas></div>
  </div>
  <div class="chart-wrap">
    <h3>📝 答题数量趋势</h3>
    <div class="chart-container"><canvas id="answerChart"></canvas></div>
  </div>
</div>

<div class="loading-overlay" id="loading">加载中...</div>

<script>
const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { intersect: false, mode: 'index' },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1e1e2e',
      borderColor: '#333',
      borderWidth: 1,
      titleColor: '#fff',
      bodyColor: '#ccc',
      padding: 12,
      cornerRadius: 8,
    }
  },
  scales: {
    x: {
      grid: { color: 'rgba(255,255,255,0.04)' },
      ticks: { color: '#666', maxRotation: 45, font: { size: 11 } },
    },
    y: {
      beginAtZero: true,
      grid: { color: 'rgba(255,255,255,0.06)' },
      ticks: { color: '#666', font: { size: 11 } },
    }
  }
};

function makeGradient(ctx, r, g, b) {
  const grad = ctx.createLinearGradient(0, 0, 0, 340);
  grad.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',0.35)');
  grad.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0.02)');
  return grad;
}

let clawChart, userChart, answerChart;

function initCharts() {
  const cc = document.getElementById('clawChart').getContext('2d');
  clawChart = new Chart(cc, {
    type: 'line',
    data: { labels: [], datasets: [{ data: [], borderColor: '#FF3B30', backgroundColor: makeGradient(cc, 255, 59, 48), borderWidth: 2, pointRadius: 3, pointBackgroundColor: '#FF3B30', fill: true, tension: 0.3 }] },
    options: { ...chartDefaults }
  });

  const uc = document.getElementById('userChart').getContext('2d');
  userChart = new Chart(uc, {
    type: 'line',
    data: { labels: [], datasets: [{ data: [], borderColor: '#3EC1D3', backgroundColor: makeGradient(uc, 62, 193, 211), borderWidth: 2, pointRadius: 3, pointBackgroundColor: '#3EC1D3', fill: true, tension: 0.3 }] },
    options: { ...chartDefaults }
  });

  const ac = document.getElementById('answerChart').getContext('2d');
  answerChart = new Chart(ac, {
    type: 'line',
    data: { labels: [], datasets: [{ data: [], borderColor: '#FFD93D', backgroundColor: makeGradient(ac, 255, 217, 61), borderWidth: 2, pointRadius: 3, pointBackgroundColor: '#FFD93D', fill: true, tension: 0.3 }] },
    options: { ...chartDefaults }
  });
}

function updateChart(chart, rows) {
  chart.data.labels = rows.map(r => r.label);
  chart.data.datasets[0].data = rows.map(r => r.count);
  chart.update();
}

async function loadData(dim) {
  document.getElementById('loading').style.display = 'flex';
  try {
    const resp = await fetch('/api/trends?dim=' + dim);
    const data = await resp.json();
    if (!data.ok) throw new Error(data.error);

    document.getElementById('totalClaws').textContent = (data.summary.total_claws || 0).toLocaleString();
    document.getElementById('totalUsers').textContent = (data.summary.total_users || 0).toLocaleString();
    document.getElementById('totalAnswers').textContent = (data.summary.total_answers || 0).toLocaleString();
    document.getElementById('totalSessions').textContent = (data.summary.total_sessions || 0).toLocaleString();

    updateChart(clawChart, data.claw_trend);
    updateChart(userChart, data.user_trend);
    updateChart(answerChart, data.answer_trend);
  } catch (e) {
    alert('加载失败: ' + e.message);
  } finally {
    document.getElementById('loading').style.display = 'none';
  }
}

// 维度切换
let currentDim = 'day';
document.querySelectorAll('.dim-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.dim-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentDim = btn.dataset.dim;
    loadData(currentDim);
  });
});

// 初始化
initCharts();
loadData('day');
</script>
</body>
</html>`;
}

// ── 试卷答题看板页面 ──
function getExamBoardHTML() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>考了个虾 · 试卷答题看板</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"><\/script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, "SF Pro Display", "Helvetica Neue", sans-serif;
    background: #0f0f13;
    color: #e0e0e0;
    min-height: 100vh;
  }
  .header {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    padding: 32px 40px 24px;
    border-bottom: 2px solid #A855F7;
  }
  .header-top { display: flex; align-items: center; justify-content: space-between; }
  .header h1 { font-size: 28px; font-weight: 800; color: #fff; }
  .header h1 span { color: #A855F7; }
  .header p { color: #888; margin-top: 4px; font-size: 14px; }
  .nav-link {
    color: #888; text-decoration: none; font-size: 14px;
    border: 1px solid #333; padding: 6px 16px; border-radius: 20px; transition: all 0.2s;
  }
  .nav-link:hover { color: #A855F7; border-color: #A855F7; }

  .exam-summary { display: flex; gap: 20px; padding: 24px 40px; background: #16161d; flex-wrap: wrap; }
  .exam-stat-card {
    flex: 1; min-width: 200px;
    background: linear-gradient(135deg, #1e1e2a, #252535);
    border-radius: 12px; padding: 24px; border: 1px solid #2a2a3a;
    position: relative; overflow: hidden;
  }
  .exam-stat-card::before { content: ''; position: absolute; top: 0; left: 0; width: 4px; height: 100%; }
  .exam-stat-card:nth-child(1)::before { background: #FF3B30; }
  .exam-stat-card:nth-child(2)::before { background: #FF6B35; }
  .exam-stat-card:nth-child(3)::before { background: #A855F7; }
  .exam-stat-card .card-title { font-size: 16px; font-weight: 700; color: #fff; margin-bottom: 12px; }
  .stat-row { display: flex; gap: 24px; }
  .stat-item .stat-num { font-size: 32px; font-weight: 900; line-height: 1.1; }
  .exam-stat-card:nth-child(1) .stat-num { color: #FF3B30; }
  .exam-stat-card:nth-child(2) .stat-num { color: #FF6B35; }
  .exam-stat-card:nth-child(3) .stat-num { color: #A855F7; }
  .stat-item .stat-label { font-size: 12px; color: #888; margin-top: 2px; }

  .controls { display: flex; gap: 8px; padding: 20px 40px 0; }
  .dim-btn {
    padding: 8px 20px; border-radius: 20px; border: 1px solid #333;
    background: transparent; color: #aaa; font-size: 14px; cursor: pointer; transition: all 0.2s;
  }
  .dim-btn:hover { border-color: #A855F7; color: #A855F7; }
  .dim-btn.active { background: #A855F7; border-color: #A855F7; color: #fff; font-weight: 600; }

  .charts { padding: 24px 40px 60px; display: flex; flex-direction: column; gap: 32px; }
  .chart-wrap {
    background: linear-gradient(135deg, #1a1a24, #1e1e2e);
    border-radius: 16px; padding: 28px 28px 20px; border: 1px solid #2a2a3a;
  }
  .chart-wrap h3 { font-size: 18px; font-weight: 700; margin-bottom: 16px; color: #fff; }
  .chart-container { position: relative; width: 100%; height: 400px; }

  .loading-overlay {
    position: fixed; inset: 0; background: rgba(15,15,19,0.85);
    display: flex; align-items: center; justify-content: center; z-index: 999; font-size: 18px; color: #888;
  }
  @media (max-width: 768px) {
    .header, .exam-summary, .controls, .charts { padding-left: 16px; padding-right: 16px; }
    .chart-container { height: 280px; }
    .stat-item .stat-num { font-size: 24px; }
  }
</style>
</head>
<body>
<div class="header">
  <div class="header-top">
    <div>
      <h1>📊 试卷答题 · <span>数据看板</span></h1>
      <p>V1 基础评测 / V2 中级评测 / V3 毕业考试 — 分试卷答题趋势</p>
    </div>
    <a class="nav-link" href="/">← 返回总览</a>
  </div>
</div>

<div class="exam-summary">
  <div class="exam-stat-card">
    <div class="card-title">📝 V1 · 基础能力评测</div>
    <div class="stat-row">
      <div class="stat-item"><div class="stat-num" id="v1Answers">-</div><div class="stat-label">答题数</div></div>
      <div class="stat-item"><div class="stat-num" id="v1Sessions">-</div><div class="stat-label">考试场次</div></div>
    </div>
  </div>
  <div class="exam-stat-card">
    <div class="card-title">🔥 V2 · 中级能力评测</div>
    <div class="stat-row">
      <div class="stat-item"><div class="stat-num" id="v2Answers">-</div><div class="stat-label">答题数</div></div>
      <div class="stat-item"><div class="stat-num" id="v2Sessions">-</div><div class="stat-label">考试场次</div></div>
    </div>
  </div>
  <div class="exam-stat-card">
    <div class="card-title">💀 V3 · 龙虾毕业考试</div>
    <div class="stat-row">
      <div class="stat-item"><div class="stat-num" id="v3Answers">-</div><div class="stat-label">答题数</div></div>
      <div class="stat-item"><div class="stat-num" id="v3Sessions">-</div><div class="stat-label">考试场次</div></div>
    </div>
  </div>
</div>

<div class="controls">
  <button class="dim-btn" data-dim="hour">按小时</button>
  <button class="dim-btn active" data-dim="day">按天</button>
  <button class="dim-btn" data-dim="week">按周</button>
</div>

<div class="charts">
  <div class="chart-wrap">
    <h3>📝 V1 / 🔥 V2 / 💀 V3 答题数量对比趋势</h3>
    <div class="chart-container"><canvas id="compareChart"></canvas></div>
  </div>
  <div class="chart-wrap">
    <h3>📝 V1 基础能力评测 — 答题趋势</h3>
    <div class="chart-container"><canvas id="v1Chart"></canvas></div>
  </div>
  <div class="chart-wrap">
    <h3>🔥 V2 中级能力评测 — 答题趋势</h3>
    <div class="chart-container"><canvas id="v2Chart"></canvas></div>
  </div>
  <div class="chart-wrap">
    <h3>💀 V3 龙虾毕业考试 — 答题趋势</h3>
    <div class="chart-container"><canvas id="v3Chart"></canvas></div>
  </div>
</div>

<div class="loading-overlay" id="loading">加载中...</div>

<script>
const chartDefaults = {
  responsive: true, maintainAspectRatio: false,
  interaction: { intersect: false, mode: 'index' },
  plugins: {
    legend: { display: false },
    tooltip: { backgroundColor: '#1e1e2e', borderColor: '#333', borderWidth: 1, titleColor: '#fff', bodyColor: '#ccc', padding: 12, cornerRadius: 8 }
  },
  scales: {
    x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#666', maxRotation: 45, font: { size: 11 } } },
    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: '#666', font: { size: 11 } } }
  }
};
const compareDefaults = {
  ...chartDefaults,
  plugins: { ...chartDefaults.plugins, legend: { display: true, labels: { color: '#ccc', usePointStyle: true, padding: 20, font: { size: 13 } } } }
};

function makeGradient(ctx, r, g, b) {
  const grad = ctx.createLinearGradient(0, 0, 0, 400);
  grad.addColorStop(0, 'rgba('+r+','+g+','+b+',0.3)');
  grad.addColorStop(1, 'rgba('+r+','+g+','+b+',0.02)');
  return grad;
}

let compareChart, v1Chart, v2Chart, v3Chart;

function initCharts() {
  const cmpCtx = document.getElementById('compareChart').getContext('2d');
  compareChart = new Chart(cmpCtx, {
    type: 'line',
    data: { labels: [], datasets: [
      { label: 'V1 基础', data: [], borderColor: '#FF3B30', borderWidth: 2.5, pointRadius: 3, pointBackgroundColor: '#FF3B30', fill: false, tension: 0.3 },
      { label: 'V2 中级', data: [], borderColor: '#FF6B35', borderWidth: 2.5, pointRadius: 3, pointBackgroundColor: '#FF6B35', fill: false, tension: 0.3 },
      { label: 'V3 毕业', data: [], borderColor: '#A855F7', borderWidth: 2.5, pointRadius: 3, pointBackgroundColor: '#A855F7', fill: false, tension: 0.3 },
    ] },
    options: compareDefaults
  });

  const v1Ctx = document.getElementById('v1Chart').getContext('2d');
  v1Chart = new Chart(v1Ctx, { type: 'line',
    data: { labels: [], datasets: [{ data: [], borderColor: '#FF3B30', backgroundColor: makeGradient(v1Ctx,255,59,48), borderWidth: 2, pointRadius: 3, pointBackgroundColor: '#FF3B30', fill: true, tension: 0.3 }] },
    options: chartDefaults });

  const v2Ctx = document.getElementById('v2Chart').getContext('2d');
  v2Chart = new Chart(v2Ctx, { type: 'line',
    data: { labels: [], datasets: [{ data: [], borderColor: '#FF6B35', backgroundColor: makeGradient(v2Ctx,255,107,53), borderWidth: 2, pointRadius: 3, pointBackgroundColor: '#FF6B35', fill: true, tension: 0.3 }] },
    options: chartDefaults });

  const v3Ctx = document.getElementById('v3Chart').getContext('2d');
  v3Chart = new Chart(v3Ctx, { type: 'line',
    data: { labels: [], datasets: [{ data: [], borderColor: '#A855F7', backgroundColor: makeGradient(v3Ctx,168,85,247), borderWidth: 2, pointRadius: 3, pointBackgroundColor: '#A855F7', fill: true, tension: 0.3 }] },
    options: chartDefaults });
}

function updateSingle(chart, rows) {
  chart.data.labels = rows.map(r => r.label);
  chart.data.datasets[0].data = rows.map(r => r.count);
  chart.update();
}

function updateCompare(v1, v2, v3) {
  const labelSet = new Set([...v1.map(r=>r.label), ...v2.map(r=>r.label), ...v3.map(r=>r.label)]);
  const labels = [...labelSet].sort();
  const toMap = arr => { const m = {}; arr.forEach(r => m[r.label] = r.count); return m; };
  const m1 = toMap(v1), m2 = toMap(v2), m3 = toMap(v3);
  compareChart.data.labels = labels;
  compareChart.data.datasets[0].data = labels.map(l => m1[l] || 0);
  compareChart.data.datasets[1].data = labels.map(l => m2[l] || 0);
  compareChart.data.datasets[2].data = labels.map(l => m3[l] || 0);
  compareChart.update();
}

async function loadData(dim) {
  document.getElementById('loading').style.display = 'flex';
  try {
    const resp = await fetch('/api/exam-trends?dim=' + dim);
    const data = await resp.json();
    if (!data.ok) throw new Error(data.error);

    ['v1','v2','v3'].forEach(eid => {
      const s = data.summary[eid] || { answers: 0, sessions: 0 };
      document.getElementById(eid + 'Answers').textContent = s.answers.toLocaleString();
      document.getElementById(eid + 'Sessions').textContent = s.sessions.toLocaleString();
    });

    updateCompare(data.trends.v1 || [], data.trends.v2 || [], data.trends.v3 || []);
    updateSingle(v1Chart, data.trends.v1 || []);
    updateSingle(v2Chart, data.trends.v2 || []);
    updateSingle(v3Chart, data.trends.v3 || []);
  } catch (e) {
    alert('加载失败: ' + e.message);
  } finally {
    document.getElementById('loading').style.display = 'none';
  }
}

document.querySelectorAll('.dim-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.dim-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadData(btn.dataset.dim);
  });
});

initCharts();
loadData('day');
<\/script>
</body>
</html>`;
}
