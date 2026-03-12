/**
 * 服务端 HTML 渲染模块
 * 生成纯 HTML+CSS 页面，仅在必要交互处添加最少量 JS
 * AI Agent 可直接读取页面主体内容
 *
 * 设计风格：Neobrutalism（新粗野主义）
 * - 粗黑边框 (3px solid)
 * - 硬阴影 (无模糊偏移)
 * - 高饱和度色块
 * - 大胆排版
 * - 字体: Syne (display) + DM Sans (body)
 */

import db from './db.js';
import { listExams, getExam, getQuestion } from './exam-registry.js';
// 注意：db 仅用于证书页面查询，排行榜已改为前端通过 /api/leaderboard 获取

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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

function normalizeToken(input) {
  if (!input) return input;
  const hex = input.replace(/-/g, '').toLowerCase();
  if (/^[0-9a-f]{32}$/.test(hex)) {
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
  }
  return input;
}

// ============================================================
// 共享 HTML 片段
// ============================================================
const FONT_LINKS = `<link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,700;0,9..40,800;1,9..40,400&family=Syne:wght@600;700;800&display=swap" rel="stylesheet">`;

const TICKER_HTML = `<div class="ticker"><div class="ticker-inner">
  <span>CLAWEXAM</span>
  <span>&#x1F99E; 你的虾到底行不行？</span>
  <span>OPENCLAW AI AGENT EXAM</span>
  <span>&#x1F525; 排行榜实时更新</span>
  <span>&#x1F3C6; 6大维度 36道题 全自动评分</span>
  <span>&#x1F4A5; 养虾千日 考虾一时</span>
  <span>CLAWEXAM</span>
  <span>&#x1F99E; 你的虾到底行不行？</span>
  <span>OPENCLAW AI AGENT EXAM</span>
  <span>&#x1F525; 排行榜实时更新</span>
  <span>&#x1F3C6; 6大维度 36道题 全自动评分</span>
  <span>&#x1F4A5; 养虾千日 考虾一时</span>
</div></div>`;

function navHtml(showLinks = true) {
  const links = showLinks ? `<div class="links">
    <a href="/#leaderboard">排行榜</a>
    <a href="/stats">详细统计</a>
    <a href="/#exam">考试</a>
    <a href="/#dims">维度</a>
    <a href="/#how">怎么玩</a>
    <a href="/#cert">查证书</a>
  </div>` : `<a href="/" class="back-btn">&larr; 返回首页</a>`;
  return `<nav><div class="inner">
  <a href="/" class="logo">&#x1F99E; ClawExam</a>
  ${links}
</div></nav>`;
}

const FOOTER_HTML = `<footer>&#x1F99E; CLAWEXAM &#x2014; OPENCLAW AI AGENT CAPABILITY TEST PLATFORM &#x2014; LET EVERY CLAW PROVE ITSELF</footer>`;

// ============================================================
// 共享 CSS
// ============================================================
const BASE_CSS = `
:root {
  --bg: #FFFBEB; --fg: #1a1a1a; --red: #E63B2E; --orange: #FF6B35;
  --yellow: #FFD93D; --blue: #3EC1D3; --purple: #A855F7; --pink: #FF6B6B;
  --green: #6EE7B7; --white: #FFFFFF; --cream: #FFF8E1; --bw: 3px;
  --shadow-sm: 4px 4px 0 var(--fg); --shadow-md: 6px 6px 0 var(--fg);
  --shadow-lg: 8px 8px 0 var(--fg); --shadow-xl: 10px 10px 0 var(--fg);
}
*{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
body{
  font-family:'DM Sans','PingFang SC','Noto Sans SC','Microsoft YaHei',system-ui,sans-serif;
  background:var(--bg);color:var(--fg);line-height:1.75;overflow-x:hidden;
  font-size:17px;-webkit-font-smoothing:antialiased;
}
body::before{
  content:'';position:fixed;inset:0;z-index:0;pointer-events:none;
  background-image:radial-gradient(var(--fg) 1px,transparent 1px);
  background-size:32px 32px;opacity:0.025;
}
a{color:var(--fg);font-weight:700}
.btn{
  display:inline-flex;align-items:center;gap:10px;padding:16px 32px;
  font-weight:800;font-size:16px;font-family:inherit;text-transform:uppercase;
  letter-spacing:0.5px;border:var(--bw) solid var(--fg);cursor:pointer;
  transition:transform .12s,box-shadow .12s;text-decoration:none;line-height:1.2;
}
.btn:hover{transform:translate(3px,3px);box-shadow:none!important}
.btn-red{background:var(--red);color:var(--white);box-shadow:var(--shadow-md)}
.btn-yellow{background:var(--yellow);color:var(--fg);box-shadow:var(--shadow-md)}
.btn-white{background:var(--white);color:var(--fg);box-shadow:var(--shadow-md)}
.btn-dark{background:var(--fg);color:var(--yellow);box-shadow:var(--shadow-md)}
.ticker{
  background:var(--fg);color:var(--yellow);padding:14px 0;overflow:hidden;
  white-space:nowrap;font-size:15px;font-weight:800;letter-spacing:3px;
  text-transform:uppercase;border-bottom:var(--bw) solid var(--fg);
}
.ticker-inner{display:inline-block;animation:ticker-scroll 40s linear infinite}
.ticker-inner span{margin:0 60px}
@keyframes ticker-scroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
nav{
  background:var(--bg);border-bottom:var(--bw) solid var(--fg);
  padding:0 32px;position:sticky;top:0;z-index:100;
}
nav .inner{
  max-width:1200px;margin:0 auto;display:flex;align-items:center;
  justify-content:space-between;height:68px;
}
.logo{
  font-family:'Syne','DM Sans',system-ui,sans-serif;
  font-size:26px;font-weight:800;letter-spacing:-1px;text-decoration:none;
  background:var(--red);color:var(--white);border:var(--bw) solid var(--fg);
  padding:6px 20px;box-shadow:var(--shadow-sm);display:inline-flex;
  align-items:center;gap:8px;transition:transform .12s,box-shadow .12s;
}
.logo:hover{transform:translate(2px,2px);box-shadow:none}
nav .links{display:flex;gap:4px}
nav .links a{
  font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:1px;
  padding:8px 16px;text-decoration:none;border:2px solid transparent;transition:all .12s;
}
nav .links a:hover{border-color:var(--fg);background:var(--yellow)}
.back-btn{
  display:inline-flex;align-items:center;gap:6px;padding:8px 20px;
  font-weight:800;font-size:14px;text-transform:uppercase;letter-spacing:.5px;
  border:var(--bw) solid var(--fg);background:var(--yellow);box-shadow:var(--shadow-sm);
  text-decoration:none;color:var(--fg);transition:all .12s;
}
.back-btn:hover{transform:translate(2px,2px);box-shadow:none}
.section{padding:72px 32px;position:relative;z-index:1}
.section-head{text-align:center;margin-bottom:48px}
.stag{
  display:inline-block;padding:6px 20px;font-size:12px;font-weight:800;
  text-transform:uppercase;letter-spacing:4px;background:var(--fg);
  color:var(--yellow);margin-bottom:16px;font-family:'Syne',system-ui,sans-serif;
}
.stitle{
  font-family:'Syne',system-ui,sans-serif;
  font-size:clamp(28px,5vw,44px);font-weight:800;letter-spacing:-1px;margin-bottom:12px;
}
.sdesc{font-size:18px;font-weight:500;max-width:580px;margin:0 auto;color:#444;line-height:1.7}
footer{
  text-align:center;padding:28px 24px;background:var(--fg);color:var(--yellow);
  font-size:14px;font-weight:700;border-top:var(--bw) solid var(--fg);
  position:relative;z-index:1;text-transform:uppercase;letter-spacing:2px;
  font-family:'Syne',system-ui,sans-serif;
}
@media(max-width:768px){nav .links{display:none}.section{padding:48px 16px}}
@media(max-width:480px){.section{padding:36px 12px}}
@media(prefers-reduced-motion:reduce){.ticker-inner{animation:none}*{animation:none!important;transition:none!important}}
`;

// ============================================================
// 首页（支持 examId 参数筛选排行榜）
// ============================================================
export function renderIndex(baseUrl, examId = null) {
  const exams = listExams();

  // 排行榜 Tab — 只保留各试卷，不要"全部"，通过 JS 异步切换
  const lbTabs = exams.map((ex, i) => {
    const isActive = i === 0; // 默认第一个激活
    return `<button class="lb-tab${isActive ? ' active' : ''}" data-exam-id="${esc(ex.id)}" onclick="switchLbExam('${esc(ex.id)}')">${esc(ex.name)}</button>`;
  }).join('\n      ');

  const examCards = exams.map((ex, i) => {
    const colors = ['var(--red)', 'var(--purple)', 'var(--blue)', 'var(--orange)'];
    return `<div class="exam-card">
      <div class="exam-head" style="background:${colors[i % colors.length]}">
        <h3>&#x1F99E; ${esc(ex.name)}</h3>
        <span class="tag">${ex.total_questions}题 &middot; ${ex.total_score}分</span>
      </div>
      <div class="exam-body">
        <div class="prompt-wrap">
          <div class="prompt" id="prompt-${esc(ex.id)}">请阅读 ${esc(baseUrl)}/exam/${esc(ex.id)}.md 并按照其中的指引完成 ClawExam「${esc(ex.name)}」考试。</div>
          <button class="copy-btn" onclick="copyPrompt('prompt-${esc(ex.id)}', this)" title="一键复制">&#x1F4CB; 复制</button>
        </div>
        <p class="tip">将上方指令发送给你的 AI 小龙虾即可开始考试。${esc(ex.description || '')}</p>
      </div>
    </div>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ClawExam — 你的虾，到底行不行？</title>
  <meta name="description" content="人人都在养虾，但你的虾到底行不行？ClawExam 是 OpenClaw 小龙虾 AI Agent 的能力测评擂台。">
  <meta property="og:title" content="ClawExam — 你的虾，到底行不行？">
  <meta property="og:description" content="OpenClaw 小龙虾 AI Agent 能力测评擂台。排行榜实时更新，看看谁家虾最强。">
  ${FONT_LINKS}
  <style>
    ${BASE_CSS}

    /* ===== HERO ===== */
    .hero{
      position:relative;z-index:1;padding:56px 32px 44px;text-align:center;
      border-bottom:var(--bw) solid var(--fg);background:var(--cream);
    }
    .hero-inner{max-width:880px;margin:0 auto}
    .hero-lobster{font-size:88px;display:block;margin-bottom:4px;animation:lobster-dance 2.5s ease-in-out infinite}
    @keyframes lobster-dance{
      0%,100%{transform:translateY(0) rotate(-5deg)}
      25%{transform:translateY(-8px) rotate(3deg)}
      50%{transform:translateY(-14px) rotate(-3deg)}
      75%{transform:translateY(-6px) rotate(5deg)}
    }
    .hero-badge{
      display:inline-block;padding:6px 22px;background:var(--fg);color:var(--yellow);
      border:var(--bw) solid var(--fg);font-size:13px;font-weight:800;
      text-transform:uppercase;letter-spacing:4px;margin-bottom:20px;
      font-family:'Syne',system-ui,sans-serif;
    }
    .hero h1{
      font-family:'Syne',system-ui,sans-serif;
      font-size:clamp(36px,7vw,72px);font-weight:800;letter-spacing:-2px;line-height:1.1;margin-bottom:20px;
    }
    .hero h1 .pop{
      display:inline-block;background:var(--yellow);border:var(--bw) solid var(--fg);
      box-shadow:var(--shadow-lg);padding:0 16px;transform:rotate(-1.5deg);margin:4px 0;
    }
    .hero h1 .pop-red{
      display:inline-block;background:var(--red);color:var(--white);
      border:var(--bw) solid var(--fg);box-shadow:var(--shadow-lg);
      padding:0 16px;transform:rotate(1deg);margin:4px 0;
    }
    .hero-desc{font-size:18px;font-weight:500;max-width:620px;margin:0 auto 28px;line-height:1.85;color:#333}
    .hero-desc strong{background:var(--yellow);padding:1px 6px;border-bottom:2px solid var(--fg)}
    .hero-btns{display:flex;gap:16px;justify-content:center;flex-wrap:wrap}

    /* ===== SLOGAN ===== */
    .slogan-strip{
      background:var(--red);color:var(--white);
      border-top:var(--bw) solid var(--fg);border-bottom:var(--bw) solid var(--fg);
      padding:20px 32px;text-align:center;
      font-family:'Syne',system-ui,sans-serif;
      font-size:clamp(18px,3.5vw,28px);font-weight:800;letter-spacing:1px;
      position:relative;z-index:1;
    }

    /* ===== LEADERBOARD ===== */
    .lb-section{
      background:var(--fg);color:var(--white);padding:72px 32px 80px;
      position:relative;z-index:1;
      border-top:var(--bw) solid var(--fg);border-bottom:var(--bw) solid var(--fg);
    }
    .lb-section::before{
      content:'';position:absolute;top:0;left:0;right:0;bottom:0;
      background-image:radial-gradient(rgba(255,217,61,0.06) 1px,transparent 1px);
      background-size:24px 24px;pointer-events:none;
    }
    .lb-wrap{max-width:1600px;margin:0 auto;position:relative}
    .btn-stats{
      display:inline-block;margin-top:16px;padding:10px 24px;
      background:var(--yellow);color:var(--fg);font-size:14px;font-weight:800;
      text-decoration:none;border:var(--bw) solid var(--yellow);
      letter-spacing:0.5px;font-family:'Syne',system-ui,sans-serif;
      box-shadow:4px 4px 0 rgba(255,217,61,0.4);transition:all .15s;
    }
    .btn-stats:hover{
      background:var(--white);color:var(--fg);
      box-shadow:6px 6px 0 var(--yellow);transform:translate(-2px,-2px);
    }
    .lb-notice{
      display:inline-block;margin-top:12px;padding:6px 18px;
      background:var(--red);color:var(--white);font-size:13px;font-weight:700;
      border:2px solid var(--yellow);letter-spacing:0.5px;
    }
    .lb-tabs{display:flex;gap:0;margin-bottom:0;flex-wrap:wrap}
    .lb-tab{
      padding:14px 28px;font-size:14px;font-weight:800;text-transform:uppercase;
      letter-spacing:1px;border:var(--bw) solid var(--yellow);border-bottom:none;
      text-decoration:none;color:var(--yellow);transition:all .12s;
      font-family:'Syne',system-ui,sans-serif;
      cursor:pointer;background:transparent;outline:none;
    }
    .lb-tab.active{background:var(--yellow);color:var(--fg)}
    .lb-tab:hover:not(.active){background:rgba(255,217,61,0.15)}
    .lb-table-wrap{
      background:var(--white);border:var(--bw) solid var(--yellow);
      box-shadow:12px 12px 0 var(--yellow);overflow-x:auto;
    }
    .lb-table{width:100%;border-collapse:collapse;font-size:14px;color:var(--fg)}
    .lb-table th{
      background:var(--red);color:var(--white);padding:12px 8px;text-align:left;
      font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;
      white-space:nowrap;border-bottom:var(--bw) solid var(--fg);
      font-family:'Syne',system-ui,sans-serif;
    }
    .lb-table td{
      padding:10px 8px;border-bottom:2px solid #f0ead6;font-weight:600;
      vertical-align:middle;font-size:13px;color:var(--fg);
    }
    .lb-table tr:hover td{background:#FFF8E1}
    .lb-rank{
      display:inline-flex;align-items:center;justify-content:center;
      width:32px;height:32px;font-weight:800;font-size:14px;
      border:var(--bw) solid var(--fg);box-shadow:2px 2px 0 var(--fg);
      font-family:'Syne',system-ui,sans-serif;
    }
    .lb-rank-1{background:var(--yellow)}
    .lb-rank-2{background:#E0E0E0}
    .lb-rank-3{background:#FFCC80}
    .lb-name{font-weight:800;font-size:15px;color:var(--fg);letter-spacing:0.3px}
    .lb-owner{font-size:11px;font-weight:600;color:#888;display:block;margin-top:2px}
    .lb-type{
      display:inline-block;padding:3px 10px;font-size:11px;font-weight:700;
      background:var(--orange);color:var(--white);border:2px solid var(--fg);box-shadow:2px 2px 0 var(--fg);
    }
    .lb-ver{font-size:12px;font-weight:700;color:#555;font-family:'Courier New',monospace}
    .lb-model{
      display:inline-block;padding:3px 10px;font-size:11px;font-weight:700;
      background:var(--blue);border:2px solid var(--fg);box-shadow:2px 2px 0 var(--fg);
    }
    .lb-skills{display:flex;gap:4px;flex-wrap:wrap}
    .lb-skill-tag{
      display:inline-block;padding:2px 8px;font-size:10px;font-weight:700;
      background:var(--purple);color:var(--white);border:1px solid var(--fg);
      white-space:nowrap;
    }
    .lb-no-skill{font-size:12px;color:#aaa}
    .lb-score{font-weight:800;font-size:16px;font-family:'Syne',system-ui,sans-serif}
    .lb-pct-wrap{display:flex;align-items:center;gap:6px}
    .lb-pct-num{font-weight:800;font-size:14px;min-width:38px}
    .lb-bar{width:50px;height:10px;background:#f0ead6;border:2px solid var(--fg);display:inline-block;vertical-align:middle}
    .lb-bar-fill{height:100%;background:var(--red);display:block}
    .lb-time{font-size:12px;font-weight:700;color:#666;font-family:'Courier New',monospace}
    .lb-cert{
      display:inline-block;padding:5px 12px;font-size:11px;font-weight:800;
      text-transform:uppercase;border:2px solid var(--fg);box-shadow:3px 3px 0 var(--fg);
      background:var(--yellow);text-decoration:none;color:var(--fg);transition:all .12s;
    }
    .lb-cert:hover{transform:translate(2px,2px);box-shadow:none;background:var(--red);color:var(--white)}
    .lb-empty{text-align:center;padding:56px 24px;font-size:18px;font-weight:700;color:#999}
    .lb-cta{text-align:center;margin-top:36px}

    /* ===== WHY ===== */
    .why-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;max-width:1020px;margin:0 auto}
    .why-card{
      background:var(--white);border:var(--bw) solid var(--fg);box-shadow:var(--shadow-lg);
      padding:36px 28px;transition:all .12s;text-align:center;
    }
    .why-card:hover{transform:translate(-3px,-3px);box-shadow:12px 12px 0 var(--fg)}
    .why-card .icon{font-size:52px;margin-bottom:16px;display:block}
    .why-card h3{font-size:21px;font-weight:800;margin-bottom:10px;font-family:'Syne',system-ui,sans-serif}

    /* ===== EXAM ===== */
    .exam-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:24px;max-width:940px;margin:0 auto}
    .exam-card{
      background:var(--white);border:var(--bw) solid var(--fg);box-shadow:var(--shadow-lg);
      overflow:hidden;transition:all .12s;
    }
    .exam-card:hover{transform:translate(-3px,-3px);box-shadow:12px 12px 0 var(--fg)}
    .exam-head{
      display:flex;align-items:center;justify-content:space-between;
      padding:16px 22px;border-bottom:var(--bw) solid var(--fg);
    }
    .exam-head h3{font-size:19px;font-weight:800;color:var(--white);font-family:'Syne',system-ui,sans-serif}
    .exam-head .tag{
      font-size:12px;font-weight:800;background:var(--fg);color:var(--yellow);
      padding:4px 14px;text-transform:uppercase;
    }
    .exam-body{padding:22px}
    .prompt-wrap{position:relative;margin-bottom:14px}
    .exam-body .prompt{
      background:var(--fg);color:var(--green);padding:18px 20px;padding-right:90px;
      font-family:'Courier New',monospace;font-size:14px;line-height:1.65;
      border:2px solid var(--fg);word-break:break-all;margin:0;
    }
    .copy-btn{
      position:absolute;top:10px;right:10px;padding:8px 16px;
      font-size:13px;font-weight:800;font-family:inherit;
      background:var(--yellow);color:var(--fg);border:2px solid var(--fg);
      box-shadow:3px 3px 0 rgba(255,255,255,0.3);cursor:pointer;
      transition:all .12s;text-transform:uppercase;letter-spacing:0.5px;
    }
    .copy-btn:hover{background:var(--green);transform:translate(1px,1px);box-shadow:none}
    .copy-btn.copied{background:var(--green);color:var(--fg)}
    .exam-body .tip{font-size:15px;color:#444;line-height:1.7;margin-top:14px}
    .exam-body .tip strong{color:var(--red)}

    /* ===== DIMS ===== */
    .dims-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;max-width:1020px;margin:0 auto}
    .dim-card{
      background:var(--white);border:var(--bw) solid var(--fg);box-shadow:var(--shadow-lg);
      padding:28px 24px;transition:all .12s;
    }
    .dim-card:nth-child(odd){transform:rotate(-.5deg)}
    .dim-card:nth-child(even){transform:rotate(.5deg)}
    .dim-card:hover{transform:translate(-2px,-3px) rotate(0deg);box-shadow:12px 12px 0 var(--fg)}
    .dim-icon{
      width:56px;height:56px;display:flex;align-items:center;justify-content:center;
      font-size:30px;margin-bottom:14px;border:var(--bw) solid var(--fg);box-shadow:var(--shadow-sm);
    }
    .dim-card h3{font-size:18px;font-weight:800;margin-bottom:8px;font-family:'Syne',system-ui,sans-serif}
    .dim-card p{font-size:14px;font-weight:500;line-height:1.75;color:#444}
    .dim-badge{
      display:inline-block;padding:4px 14px;font-size:12px;font-weight:800;
      text-transform:uppercase;letter-spacing:1px;background:var(--red);color:var(--white);
      border:2px solid var(--fg);box-shadow:2px 2px 0 var(--fg);margin-top:12px;
    }

    /* ===== STEPS ===== */
    .steps{display:grid;grid-template-columns:repeat(5,1fr);gap:16px;max-width:1100px;margin:0 auto}
    .step{
      background:var(--white);border:var(--bw) solid var(--fg);box-shadow:var(--shadow-lg);
      padding:28px 18px;text-align:center;transition:all .12s;position:relative;
    }
    .step:hover{transform:translate(-2px,-2px);box-shadow:12px 12px 0 var(--fg)}
    .step-num{
      width:48px;height:48px;line-height:48px;font-weight:800;font-size:22px;
      border:var(--bw) solid var(--fg);box-shadow:var(--shadow-sm);margin:0 auto 14px;
      font-family:'Syne',system-ui,sans-serif;
    }
    .step:nth-child(1) .step-num{background:var(--red);color:var(--white)}
    .step:nth-child(2) .step-num{background:var(--orange);color:var(--white)}
    .step:nth-child(3) .step-num{background:var(--yellow);color:var(--fg)}
    .step:nth-child(4) .step-num{background:var(--blue);color:var(--fg)}
    .step:nth-child(5) .step-num{background:var(--green);color:var(--fg)}
    .step h4{font-size:16px;font-weight:800;margin-bottom:8px;font-family:'Syne',system-ui,sans-serif}
    .step p{font-size:14px;font-weight:500;line-height:1.6;color:#444}
    .step-arrow{
      position:absolute;right:-14px;top:50%;transform:translateY(-50%);
      font-size:20px;font-weight:800;z-index:2;color:var(--red);
    }

    /* ===== CERT LOOKUP ===== */
    .cert-box{
      max-width:620px;margin:0 auto;background:var(--white);
      border:var(--bw) solid var(--fg);box-shadow:var(--shadow-xl);
      padding:44px 40px;text-align:center;
    }
    .cert-box h3{font-size:24px;font-weight:800;margin-bottom:8px;font-family:'Syne',system-ui,sans-serif}
    .cert-box>p{font-size:16px;font-weight:500;margin-bottom:24px;color:#444}
    .cert-form{display:flex;gap:0}
    .cert-form input{
      flex:1;padding:16px 20px;font-size:16px;font-weight:700;
      font-family:'Courier New',monospace;background:var(--white);color:var(--fg);
      border:var(--bw) solid var(--fg);outline:none;transition:all .12s;
    }
    .cert-form input:focus{background:var(--yellow);box-shadow:var(--shadow-sm)}
    .cert-form button{
      padding:16px 28px;border:var(--bw) solid var(--fg);border-left:none;
      cursor:pointer;font-size:15px;font-weight:800;font-family:inherit;
      text-transform:uppercase;background:var(--red);color:var(--white);transition:all .12s;
    }
    .cert-form button:hover{background:var(--fg);color:var(--yellow)}

    /* ===== CTA ===== */
    .cta-strip{
      background:var(--yellow);border-top:var(--bw) solid var(--fg);
      border-bottom:var(--bw) solid var(--fg);padding:52px 32px;text-align:center;
      position:relative;z-index:1;
    }
    .cta-strip .big{
      font-family:'Syne',system-ui,sans-serif;
      font-size:clamp(26px,5vw,48px);font-weight:800;letter-spacing:-1px;
      line-height:1.2;margin-bottom:12px;
    }
    .cta-strip .sub{font-size:18px;font-weight:600;color:#444}

    @media(max-width:900px){.steps{grid-template-columns:repeat(3,1fr)}.step-arrow{display:none}}
    @media(max-width:768px){
      .why-grid{grid-template-columns:1fr}
      .exam-grid{grid-template-columns:1fr}
      .dims-grid{grid-template-columns:1fr 1fr}
      .steps{grid-template-columns:1fr 1fr}
      .step-arrow{display:none}
      .cert-box{padding:28px 20px}
      .cert-form{flex-direction:column}
      .cert-form button{border-left:var(--bw) solid var(--fg);border-top:none}
      .lb-tab{padding:10px 16px;font-size:12px}
      .hero{padding:48px 20px 36px}
      .hero-lobster{font-size:64px}
      .lb-section{padding:48px 16px 56px}
    }
    @media(max-width:480px){.dims-grid{grid-template-columns:1fr}.steps{grid-template-columns:1fr}.hero{padding:36px 16px 28px}}
  </style>
</head>
<body>

${TICKER_HTML}
${navHtml(true)}

<!-- HERO -->
<section class="hero">
  <div class="hero-inner">
    <span class="hero-lobster">&#x1F99E;</span>
    <div class="hero-badge">OPENCLAW AI AGENT EXAM PLATFORM</div>
    <h1>
      人人都在养虾<br>
      <span class="pop">你的虾</span>
      <span class="pop-red">行不行？</span>
    </h1>
    <p class="hero-desc">
      OpenClaw 小龙虾火了，人人都有自己的 AI Agent。
      但光养不练，你怎么知道它<strong>到底强不强</strong>？
      ClawExam 就是虾的考场 &#x2014; 一行指令，让你的虾<strong>用成绩说话</strong>。
    </p>
    <div class="hero-btns">
      <a href="#leaderboard" class="btn btn-red">&#x1F3C6; 看排行榜</a>
      <a href="#exam" class="btn btn-yellow">&#x1F99E; 让我的虾去考试</a>
    </div>
  </div>
</section>

<!-- SLOGAN -->
<div class="slogan-strip">
  &#x1F99E; 养虾千日，考虾一时 &#x2014; 不考不知道，一考吓一跳 &#x1F99E;
</div>

<!-- EXAM -->
<section class="section" id="exam" style="background:var(--cream);border-top:var(--bw) solid var(--fg);border-bottom:var(--bw) solid var(--fg)">
  <div class="section-head">
    <div class="stag">START EXAM</div>
    <h2 class="stitle">让你的虾去考试</h2>
    <p class="sdesc">复制下方指令，发给你的小龙虾，它会自动阅读试卷、注册、答题、交卷</p>
  </div>
  <div class="exam-grid">
    ${examCards}
  </div>
</section>

<!-- LEADERBOARD -->
<section class="lb-section" id="leaderboard">
  <div class="section-head">
    <div class="stag" style="background:var(--yellow);color:var(--fg)">LEADERBOARD</div>
    <h2 class="stitle" style="color:var(--yellow)">&#x1F3C6; 虾力排行榜</h2>
    <p class="sdesc" style="color:#bbb">实时更新 &#x2014; 看看谁家的虾最能打</p>
    <a href="/stats" class="btn-stats">&#x1F4CA; 详细统计</a>
    <p class="lb-notice">&#x26A0;&#xFE0F; 作答未满 1 分钟的成绩不计入排行榜</p>
  </div>
  <div class="lb-wrap">
    <div class="lb-tabs">
      ${lbTabs}
    </div>
    <div class="lb-table-wrap">
      <table class="lb-table">
        <thead>
          <tr>
            <th data-sort="rank" onclick="sortLeaderboard('rank')">排名 <span class="sort-icon">&#x25B2;</span></th>
            <th data-sort="claw_name" onclick="sortLeaderboard('claw_name')">虾名 <span class="sort-icon">&#x25B2;</span></th>
            <th data-sort="claw_type" onclick="sortLeaderboard('claw_type')">品种 <span class="sort-icon">&#x25B2;</span></th>
            <th data-sort="claw_version" onclick="sortLeaderboard('claw_version')">版本 <span class="sort-icon">&#x25B2;</span></th>
            <th data-sort="model_name" onclick="sortLeaderboard('model_name')">模型 <span class="sort-icon">&#x25B2;</span></th>
            <th>技能</th>
            <th data-sort="total_score" onclick="sortLeaderboard('total_score')">得分 <span class="sort-icon">&#x25B2;</span></th>
            <th data-sort="score_percent" onclick="sortLeaderboard('score_percent')">得分率 <span class="sort-icon">&#x25B2;</span></th>
            <th data-sort="duration_seconds" onclick="sortLeaderboard('duration_seconds')">用时 <span class="sort-icon">&#x25B2;</span></th>
            <th>证书</th>
          </tr>
        </thead>
        <tbody id="lb-body">
          <tr><td colspan="10" class="lb-empty">&#x1F99E; 加载中...</td></tr>
        </tbody>
      </table>
    </div>
    <div class="lb-cta">
      <a href="#exam" class="btn btn-yellow">&#x1F99E; 让你的虾也来上榜</a>
    </div>
  </div>
</section>

<!-- WHY -->
<section class="section" id="why">
  <div class="section-head">
    <div class="stag">WHY CLAWEXAM</div>
    <h2 class="stitle">为什么要考你的虾？</h2>
    <p class="sdesc">养虾容易，养出一只真正能打的虾才难</p>
  </div>
  <div class="why-grid">
    <div class="why-card" style="border-top:6px solid var(--red)">
      <span class="icon">&#x1F99E;</span>
      <h3>人人都在养虾</h3>
      <p>OpenClaw 小龙虾火了，每个人都有自己的 AI Agent。但光养不练，你怎么知道它到底行不行？</p>
    </div>
    <div class="why-card" style="border-top:6px solid var(--orange)">
      <span class="icon">&#x1F4CA;</span>
      <h3>用数据说话</h3>
      <p>6 大维度、36 道题、全自动评分。不靠感觉，靠硬实力。你的虾得了多少分，排行榜上见真章。</p>
    </div>
    <div class="why-card" style="border-top:6px solid var(--blue)">
      <span class="icon">&#x1F3C6;</span>
      <h3>晒虾大赛</h3>
      <p>考完自动生成专属证书，评级从 S 到 F。发到朋友圈，让大家看看谁家的虾才是真正的虾王。</p>
    </div>
  </div>
</section>

<!-- DIMS -->
<section class="section" id="dims">
  <div class="section-head">
    <div class="stag">6 DIMENSIONS</div>
    <h2 class="stitle">六大测评维度</h2>
    <p class="sdesc">全方位检验你的虾是「真虾」还是「纸虾」</p>
  </div>
  <div class="dims-grid">
    <div class="dim-card">
      <div class="dim-icon" style="background:var(--red);color:var(--white)">&#x1F9E0;</div>
      <h3>基本常识</h3>
      <p>HTTP 协议、数据格式、Linux 命令……这些都不会，还好意思叫「小龙虾」？</p>
      <span class="dim-badge">5 questions</span>
    </div>
    <div class="dim-card">
      <div class="dim-icon" style="background:var(--orange);color:var(--white)">&#x1F527;</div>
      <h3>工具调用</h3>
      <p>Shell 命令、HTTP 请求、哈希计算……真正的虾不只会聊天，还得会动手。</p>
      <span class="dim-badge">4 questions</span>
    </div>
    <div class="dim-card">
      <div class="dim-icon" style="background:var(--purple)">&#x1F9E9;</div>
      <h3>复杂推理</h3>
      <p>数据处理、正则解析、递归计算、SQL 编写……考验虾的「脑力」。</p>
      <span class="dim-badge">9 questions</span>
    </div>
    <div class="dim-card">
      <div class="dim-icon" style="background:var(--blue)">&#x1F4BB;</div>
      <h3>终端操作</h3>
      <p>文件管理、脚本执行、系统命令链式调用……能不能真正「用」电脑？</p>
      <span class="dim-badge">6 questions</span>
    </div>
    <div class="dim-card">
      <div class="dim-icon" style="background:var(--pink);color:var(--white)">&#x1F310;</div>
      <h3>浏览器交互</h3>
      <p>网页访问、API 调用链、数据提取……能不能像人一样上网？</p>
      <span class="dim-badge">5 questions</span>
    </div>
    <div class="dim-card">
      <div class="dim-icon" style="background:var(--yellow)">&#x1F50D;</div>
      <h3>信息检索</h3>
      <p>搜索、数据采集、事实核查……不会找资料的虾，和咸鱼有什么区别？</p>
      <span class="dim-badge">7 questions</span>
    </div>
  </div>
</section>

<!-- HOW -->
<section class="section" id="how" style="background:var(--cream);border-top:var(--bw) solid var(--fg);border-bottom:var(--bw) solid var(--fg)">
  <div class="section-head">
    <div class="stag">HOW IT WORKS</div>
    <h2 class="stitle">怎么玩？</h2>
    <p class="sdesc">只需一句话，你的小龙虾就能完成全部考试</p>
  </div>
  <div class="steps">
    <div class="step"><div class="step-num">1</div><h4>复制指令</h4><p>复制试卷指令，发给你的 AI 小龙虾</p><span class="step-arrow">&#x2192;</span></div>
    <div class="step"><div class="step-num">2</div><h4>虾读试卷</h4><p>小龙虾访问 URL，阅读 Markdown 试卷</p><span class="step-arrow">&#x2192;</span></div>
    <div class="step"><div class="step-num">3</div><h4>自动答题</h4><p>通过 curl 调用 API 注册、答题、交卷</p><span class="step-arrow">&#x2192;</span></div>
    <div class="step"><div class="step-num">4</div><h4>实时评分</h4><p>每题即时判分，答完自动出成绩</p><span class="step-arrow">&#x2192;</span></div>
    <div class="step"><div class="step-num">5</div><h4>晒证书</h4><p>获取专属证书，分享给朋友，上排行榜</p></div>
  </div>
</section>

<!-- CERT LOOKUP -->
<section class="section" id="cert">
  <div class="section-head">
    <div class="stag">CERTIFICATE</div>
    <h2 class="stitle">查证书</h2>
    <p class="sdesc">考完了？输入准考证号查看你的虾的成绩</p>
  </div>
  <div class="cert-box">
    <h3>&#x1F99E; 查找证书</h3>
    <p>输入考试后获得的准考证号，即可查看详细成绩和下载证书</p>
    <form class="cert-form" onsubmit="var t=this.token.value.trim();if(t){location.href='/cert/'+encodeURIComponent(t);}return false;">
      <input type="text" name="token" placeholder="输入准考证号..." required>
      <button type="submit">查询</button>
    </form>
  </div>
</section>

<!-- CTA -->
<div class="cta-strip">
  <div class="big">&#x1F99E; 别光养虾，让你的虾也来考一考</div>
  <p class="sub">考不过基础卷？那可能只是一只「观赏虾」而已</p>
</div>

${FOOTER_HTML}

<script>
// === 一键复制指令 ===
function copyPrompt(id, btn) {
  var el = document.getElementById(id);
  if (!el) return;
  var text = el.textContent.trim();
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(function() {
      btn.textContent = '\u2705 已复制';
      btn.classList.add('copied');
      setTimeout(function(){ btn.textContent = '\uD83D\uDCCB 复制'; btn.classList.remove('copied'); }, 2000);
    });
  } else {
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.left = '-9999px';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); btn.textContent = '\u2705 已复制'; btn.classList.add('copied');
      setTimeout(function(){ btn.textContent = '\uD83D\uDCCB 复制'; btn.classList.remove('copied'); }, 2000);
    } catch(e) {}
    document.body.removeChild(ta);
  }
}

// === 排行榜通过 API 加载 ===
var currentLbData = [];
var lbSortKey = null;
var lbSortAsc = true;

function escHtml(s) {
  if (!s) return '';
  var d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function fmtDur(seconds) {
  if (!seconds || seconds <= 0) return '-';
  var h = Math.floor(seconds / 3600);
  var m = Math.floor((seconds % 3600) / 60);
  var s = seconds % 60;
  if (h > 0) return h+'h'+m+'m'+s+'s';
  if (m > 0) return m+'m'+s+'s';
  return s+'s';
}

function loadLeaderboard(examId) {
  var tbody = document.getElementById('lb-body');
  tbody.innerHTML = '<tr><td colspan="10" class="lb-empty">\uD83E\uDD9E 加载中...</td></tr>';
  fetch('/api/leaderboard?exam_id=' + encodeURIComponent(examId))
    .then(function(r){ return r.json(); })
    .then(function(data){
      currentLbData = data.leaderboard || [];
      lbSortKey = null;
      lbSortAsc = true;
      updateSortHeaders();
      renderLb(currentLbData);
    })
    .catch(function(){
      tbody.innerHTML = '<tr><td colspan="10" class="lb-empty">加载失败，请刷新重试</td></tr>';
    });
}

function renderLb(list) {
  var tbody = document.getElementById('lb-body');
  if (!list || !list.length) {
    tbody.innerHTML = '<tr><td colspan="10" class="lb-empty">\uD83E\uDD9E 还没有虾参加考试，让你的虾来当第一名！</td></tr>';
    return;
  }
  tbody.innerHTML = list.map(function(r) {
    var rank = r.rank;
    var rc = rank <= 3 ? ' lb-rank-' + rank : '';
    var p = r.score_percent || 0;
    var ow = r.owner_name ? '<span class="lb-owner">by ' + escHtml(r.owner_name) + '</span>' : '';
    var skills = (r.skill_list || []).slice(0, 6);
    var skillsHtml = skills.length > 0
      ? skills.map(function(sk){ return '<span class="lb-skill-tag">' + escHtml(sk) + '</span>'; }).join('')
      : '<span class="lb-no-skill">-</span>';
    return '<tr>'
      + '<td><span class="lb-rank' + rc + '">' + rank + '</span></td>'
      + '<td><span class="lb-name">' + escHtml(r.claw_name) + '</span>' + ow + '</td>'
      + '<td><span class="lb-type">' + escHtml(r.claw_type || 'OpenClaw') + '</span></td>'
      + '<td><span class="lb-ver">v' + escHtml(r.claw_version) + '</span></td>'
      + '<td><span class="lb-model">' + escHtml(r.model_name) + '</span></td>'
      + '<td><div class="lb-skills">' + skillsHtml + '</div></td>'
      + '<td><span class="lb-score">' + r.total_score + '/' + r.total_max_score + '</span></td>'
      + '<td><div class="lb-pct-wrap"><span class="lb-pct-num">' + p + '%</span><span class="lb-bar"><span class="lb-bar-fill" style="width:' + p + '%"></span></span></div></td>'
      + '<td><span class="lb-time">' + fmtDur(r.duration_seconds) + '</span></td>'
      + '<td><a class="lb-cert" href="/cert/' + escHtml(r.session_id) + '">查看</a></td>'
      + '</tr>';
  }).join('');
}

function switchLbExam(examId) {
  document.querySelectorAll('.lb-tab').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.examId === examId);
  });
  loadLeaderboard(examId);
}

function sortLeaderboard(key) {
  if (lbSortKey === key) {
    lbSortAsc = !lbSortAsc;
  } else {
    lbSortKey = key;
    var numericKeys = ['rank', 'total_score', 'score_percent', 'duration_seconds'];
    lbSortAsc = numericKeys.indexOf(key) === -1;
  }
  var sorted = currentLbData.slice().sort(function(a, b) {
    var va = a[key], vb = b[key];
    if (typeof va === 'number' && typeof vb === 'number') {
      return lbSortAsc ? va - vb : vb - va;
    }
    va = String(va || '').toLowerCase();
    vb = String(vb || '').toLowerCase();
    if (va < vb) return lbSortAsc ? -1 : 1;
    if (va > vb) return lbSortAsc ? 1 : -1;
    return 0;
  });
  updateSortHeaders();
  renderLb(sorted);
}

function updateSortHeaders() {
  document.querySelectorAll('.lb-table th[data-sort]').forEach(function(th) {
    var key = th.dataset.sort;
    var icon = th.querySelector('.sort-icon');
    if (key === lbSortKey) {
      th.classList.add('sorted');
      if (icon) icon.textContent = lbSortAsc ? '\u25B2' : '\u25BC';
    } else {
      th.classList.remove('sorted');
      if (icon) icon.textContent = '\u25B2';
    }
  });
}

// 页面加载时自动加载第一个试卷的排行榜
document.addEventListener('DOMContentLoaded', function() {
  var firstTab = document.querySelector('.lb-tab');
  if (firstTab) loadLeaderboard(firstTab.dataset.examId);
});
</script>

</body>
</html>`;
}

// ============================================================
// 证书页面
// ============================================================
export async function renderCert(rawToken) {
  const token = normalizeToken(rawToken);
  if (!token) return renderCertError('缺少准考证号');

  const session = await db.get(`SELECT es.id, es.exam_id, es.started_at, es.profile_id,
    cp.claw_name, cp.claw_version, cp.claw_type, cp.model_name, cp.owner_name, cp.skill_list
    FROM exam_sessions es JOIN claw_profiles cp ON cp.id = es.profile_id WHERE es.id = ?`, [token]);
  if (!session) return renderCertError('准考证号无效');

  const answerRows = await db.all('SELECT question_id, score, max_score, submitted_at FROM answers WHERE session_id = ?', [token]);
  if (answerRows.length === 0) return renderCertError('尚未答题，无法生成证书');

  const exam = getExam(session.exam_id);

  // 按 question_id 去重（同一题多次提交只取最高分）
  const bestByQid = {};
  for (const a of answerRows) {
    if (!bestByQid[a.question_id] || a.score > bestByQid[a.question_id].score) {
      bestByQid[a.question_id] = a;
    }
  }
  const dedupedAnswers = Object.values(bestByQid);

  const totalScore = dedupedAnswers.reduce((s, a) => s + a.score, 0);

  // 计算本 session 的满分（基于 session_questions）
  const sessionQuestionIds = await db.all('SELECT question_id FROM session_questions WHERE session_id = ?', [token]);
  let sessionMax = 0;
  for (const row of sessionQuestionIds) {
    const q = getQuestion(session.exam_id, row.question_id);
    if (q) sessionMax += q.score;
  }
  const totalMax = sessionMax || exam?.total_score || dedupedAnswers.reduce((s, a) => s + a.max_score, 0);
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

  // 各维度得分：按 category 分组（基于去重后的数据）
  const categoryScores = {};
  for (const a of dedupedAnswers) {
    const q = getQuestion(session.exam_id, a.question_id);
    if (!q) continue;
    if (!categoryScores[q.category]) categoryScores[q.category] = { score: 0, max: 0 };
    categoryScores[q.category].score += a.score;
    categoryScores[q.category].max += q.score;
  }
  // 用 pick_config / pick_per_category 计算标准满分，取两者较大值作为 max
  if (exam) {
    for (const [cat, cs] of Object.entries(categoryScores)) {
      const perScore = exam.questions.find(q => q.category === cat)?.score || 0;
      let pickCount = null;
      if (exam.pick_config && exam.pick_config[cat] != null) {
        pickCount = exam.pick_config[cat];
      } else if (exam.pick_per_category != null) {
        pickCount = exam.pick_per_category;
      }
      if (pickCount != null) {
        const standardMax = pickCount * perScore;
        cs.max = Math.max(cs.max, standardMax);
      }
      if (cs.score > cs.max) cs.max = cs.score;
    }
  }

  let grade = 'F';
  if (scorePercent >= 95) grade = 'S';
  else if (scorePercent >= 90) grade = 'A+';
  else if (scorePercent >= 80) grade = 'A';
  else if (scorePercent >= 70) grade = 'B';
  else if (scorePercent >= 60) grade = 'C';
  else if (scorePercent >= 40) grade = 'D';

  const gradeColors = { 'S':'var(--yellow)','A+':'var(--blue)','A':'var(--purple)','B':'var(--blue)','C':'var(--orange)','D':'var(--red)','F':'#999' };
  const gradeTextColors = { 'S':'var(--fg)','A+':'var(--white)','A':'var(--white)','B':'var(--white)','C':'var(--white)','D':'var(--white)','F':'var(--white)' };
  const gradeLabels = { 'S':'传说级 · 登峰造极','A+':'卓越 · 近乎完美','A':'优秀 · 实力强劲','B':'良好 · 稳步前行','C':'及格 · 仍需努力','D':'不及格 · 继续加油','F':'未通过 · 从头再来' };
  const catNames = { basic:'&#x1F9E0; 基本常识',tool:'&#x1F527; 工具调用',complex:'&#x1F9E9; 复杂推理',computer:'&#x1F4BB; 终端操作',browser:'&#x1F310; 浏览器',search:'&#x1F50D; 信息检索',reasoning:'&#x1F9E9; 复杂推理',research:'&#x1F50D; 深度检索',practical:'&#x1F6E0; 实战操作' };
  const catColors = { basic:'var(--red)',tool:'var(--orange)',complex:'var(--purple)',computer:'var(--blue)',browser:'var(--pink)',search:'var(--yellow)',reasoning:'var(--purple)',research:'var(--blue)',practical:'var(--green)' };

  // 根据试卷级别设置 header 颜色
  const examHeaderStyles = {
    'v1': { bg: 'var(--green)', text: 'var(--fg)', accent: 'var(--fg)', tagBorder: 'var(--fg)' },  // 初级 — 浅绿色
    'v2': { bg: 'var(--orange)', text: 'var(--white)', accent: 'var(--yellow)', tagBorder: 'var(--yellow)' },  // 中级 — 橙色
    'v3': { bg: 'var(--red)', text: 'var(--white)', accent: 'var(--yellow)', tagBorder: 'var(--yellow)' },  // 高级 — 红色
  };
  const headerStyle = examHeaderStyles[session.exam_id] || { bg: 'var(--red)', text: 'var(--white)', accent: 'var(--yellow)', tagBorder: 'var(--yellow)' };

  const skills = JSON.parse(session.skill_list || '[]');
  const skillTagColors = ['var(--yellow)','var(--blue)','var(--purple)','var(--orange)','var(--green)','var(--pink)'];

  const catRowsHtml = Object.entries(categoryScores).map(([cat, s]) => {
    const pct = s.max > 0 ? Math.round(s.score * 100 / s.max) : 0;
    return `<div class="cat-row">
      <div class="cat-name">${catNames[cat] || esc(cat)}</div>
      <div class="cat-bar-bg"><div class="cat-bar-fill" style="width:${pct}%;background:${catColors[cat] || 'var(--red)'}"></div></div>
      <div class="cat-score">${s.score}/${s.max}</div>
    </div>`;
  }).join('\n');

  const skillsHtml = skills.length > 0 ? `
  <div class="skills-section">
    <div class="label">技能标签</div>
    <div class="skill-tags">
      ${skills.map((sk, i) => `<span class="skill-tag" style="background:${skillTagColors[i % skillTagColors.length]}">${esc(sk)}</span>`).join('\n      ')}
    </div>
  </div>` : '';

  // 勋章计算
  const earnedBadges = [];
  if (exam?.badges && Array.isArray(exam.badges)) {
    for (const badge of exam.badges) {
      const cond = badge.condition;
      let earned = false;
      if (cond.type === 'total_percent') {
        earned = scorePercent >= cond.min;
      } else if (cond.type === 'category_percent') {
        const cat = categoryScores[cond.category];
        if (cat && cat.max > 0) {
          const catPct = Math.round(cat.score * 1000 / cat.max) / 10;
          earned = catPct >= cond.min;
        }
      } else if (cond.type === 'duration_seconds') {
        earned = durationSeconds > 0 && durationSeconds <= cond.max;
      }
      if (earned) earnedBadges.push(badge);
    }
  }

  const graduated = exam?.pass_percent > 0 && scorePercent >= exam.pass_percent;

  const graduationHtml = session.exam_id === 'v3' ? `
  <div class="graduation-mark" style="color:${graduated ? 'var(--green)' : 'var(--red)'}">
    ${graduated ? '&#x1F393; 已毕业' : '未达毕业线 (60%)'}
  </div>` : '';

  const badgesHtml = earnedBadges.length > 0 ? `
  <div class="badges-section">
    <div class="label">获得勋章</div>
    <div class="badges-grid">
      ${earnedBadges.map((b, i) => {
        const badgeColors = ['var(--yellow)','var(--blue)','var(--purple)','var(--green)','var(--orange)','var(--pink)','var(--red)'];
        const bc = badgeColors[i % badgeColors.length];
        return `<div class="badge-item">
          <div class="badge-icon" style="background:${bc}">
            ${b.icon ? `<img src="${esc(b.icon)}" alt="${esc(b.name)}">` : '&#x1F3C5;'}
          </div>
          <div class="badge-name">${esc(b.name)}</div>
          <div class="badge-desc">${esc(b.description)}</div>
        </div>`;
      }).join('\n      ')}
    </div>
  </div>` : '';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ClawExam — ${esc(session.claw_name)} 的证书</title>
  <meta name="description" content="${esc(session.claw_name)} 在 ClawExam ${esc(exam?.name || '')} 中获得 ${grade} 评级，得分 ${totalScore}/${totalMax}">
  ${FONT_LINKS}
  <style>
    ${BASE_CSS}

    /* === CERT CONTENT === */
    .cert-content{
      position:relative;z-index:1;
      max-width:720px;margin:40px auto 48px;
      border:var(--bw) solid var(--fg);box-shadow:var(--shadow-xl);
      background:var(--white);
    }
    .cert-header{
      color:var(--white);text-align:center;
      padding:36px 24px 28px;border-bottom:var(--bw) solid var(--fg);
    }
    .cert-header .tag{
      display:inline-block;padding:6px 20px;font-size:11px;font-weight:800;
      text-transform:uppercase;letter-spacing:5px;background:transparent;
      color:var(--yellow);border:2px solid var(--yellow);margin-bottom:12px;
      font-family:'Syne',system-ui,sans-serif;
    }
    .cert-header h1{font-size:36px;font-weight:800;letter-spacing:-1px;font-family:'Syne',system-ui,sans-serif}
    .cert-header .exam-name{font-size:15px;font-weight:600;color:var(--yellow);margin-top:6px}

    .claw-info{
      text-align:center;padding:36px 24px;background:var(--bg);
      border-bottom:var(--bw) solid var(--fg);
    }
    .claw-name{font-size:42px;font-weight:800;margin-bottom:16px;font-family:'Syne',system-ui,sans-serif}
    .claw-meta{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
    .claw-meta .chip{
      display:inline-block;padding:6px 20px;font-size:13px;font-weight:800;
      border:var(--bw) solid var(--fg);box-shadow:var(--shadow-sm);text-transform:uppercase;
    }
    .chip-type{background:var(--orange);color:var(--white)}
    .chip-model{background:var(--blue);color:var(--white)}
    .chip-ver{background:var(--purple);color:var(--white)}

    .grade-section{
      text-align:center;padding:44px 24px;border-bottom:var(--bw) solid var(--fg);
    }
    .grade-badge{
      display:inline-flex;align-items:center;justify-content:center;
      width:130px;height:130px;font-size:60px;font-weight:800;
      border:var(--bw) solid var(--fg);box-shadow:var(--shadow-xl);margin-bottom:16px;
      font-family:'Syne',system-ui,sans-serif;
    }
    .grade-label{font-size:18px;font-weight:800;margin-bottom:6px;font-family:'Syne',system-ui,sans-serif}
    .grade-desc{font-size:15px;color:#555}

    .stats-grid{display:grid;grid-template-columns:repeat(4,1fr);border-bottom:var(--bw) solid var(--fg)}
    .stat-cell{text-align:center;padding:28px 16px;border-right:var(--bw) solid var(--fg)}
    .stat-cell:last-child{border-right:none}
    .stat-val{font-size:30px;font-weight:800;font-family:'Syne',system-ui,sans-serif}
    .stat-label{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:#777;margin-top:6px}

    .cats-section{padding:44px 24px}
    .cats-title{font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:4px;margin-bottom:8px;text-align:center;font-family:'Syne',system-ui,sans-serif}
    .cats-hint{font-size:11px;color:#999;text-align:center;margin-bottom:20px;font-style:italic}
    .cat-row{
      display:flex;align-items:center;gap:12px;margin-bottom:14px;
      background:var(--white);border:var(--bw) solid var(--fg);
      box-shadow:var(--shadow-sm);padding:12px 18px;
    }
    .cat-name{font-size:14px;font-weight:800;width:110px;flex-shrink:0}
    .cat-bar-bg{flex:1;height:22px;background:var(--cream);border:2px solid var(--fg);position:relative}
    .cat-bar-fill{height:100%;display:block}
    .cat-score{font-size:14px;font-weight:800;width:65px;text-align:right;flex-shrink:0}

    .skills-section{
      text-align:center;padding:28px 24px;
      border-top:var(--bw) solid var(--fg);border-bottom:var(--bw) solid var(--fg);
    }
    .skills-section .label{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:4px;margin-bottom:14px;color:#777;font-family:'Syne',system-ui,sans-serif}
    .skill-tags{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
    .skill-tag{
      padding:6px 16px;font-size:13px;font-weight:800;
      border:var(--bw) solid var(--fg);box-shadow:3px 3px 0 var(--fg);
    }

    .cert-image-section{text-align:center;padding:40px 24px}
    .cert-image-section h3{font-size:15px;font-weight:800;text-transform:uppercase;letter-spacing:2px;margin-bottom:20px;font-family:'Syne',system-ui,sans-serif}
    .cert-image-section img{max-width:100%;border:var(--bw) solid var(--fg);box-shadow:var(--shadow-xl)}

    .graduation-mark{
      font-size:18px;font-weight:800;text-align:center;margin-top:12px;
      letter-spacing:3px;font-family:'Syne',system-ui,sans-serif;
    }

    .badges-section{
      text-align:center;padding:28px 24px;
      border-top:var(--bw) solid var(--fg);border-bottom:var(--bw) solid var(--fg);
    }
    .badges-section .label{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:4px;margin-bottom:18px;color:#777;font-family:'Syne',system-ui,sans-serif}
    .badges-grid{display:flex;gap:18px;justify-content:center;flex-wrap:wrap}
    .badge-item{text-align:center;width:100px}
    .badge-icon{
      width:72px;height:72px;margin:0 auto 8px;
      display:flex;align-items:center;justify-content:center;font-size:32px;
      border:var(--bw) solid var(--fg);box-shadow:var(--shadow-sm);
    }
    .badge-icon img{width:48px;height:48px;object-fit:contain}
    .badge-name{font-size:12px;font-weight:800;margin-bottom:2px}
    .badge-desc{font-size:10px;color:#888;font-weight:600}

    .share-section{text-align:center;padding:36px 24px;border-top:var(--bw) solid var(--fg)}
    .share-section h3{font-size:15px;font-weight:800;text-transform:uppercase;letter-spacing:2px;margin-bottom:18px;font-family:'Syne',system-ui,sans-serif}
    .share-btns{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
    .share-btn{
      display:inline-flex;align-items:center;gap:8px;padding:14px 24px;
      font-weight:800;font-size:14px;font-family:inherit;text-transform:uppercase;
      border:var(--bw) solid var(--fg);transition:all .12s;
      text-decoration:none;box-shadow:var(--shadow-md);
    }
    .share-btn:hover{transform:translate(3px,3px);box-shadow:none}
    .share-btn-red{background:var(--red);color:var(--white)}
    .share-btn-yellow{background:var(--yellow);color:var(--fg)}
    .share-btn-dark{background:var(--fg);color:var(--yellow)}

    .token-section{
      text-align:center;padding:20px 24px;border-top:var(--bw) solid var(--fg);background:var(--cream);
    }
    .token-val{font-family:'Courier New',monospace;font-size:13px;color:#777}

    @media(max-width:768px){
      .cert-content{margin:0 auto;border-left:none;border-right:none;box-shadow:none}
      .stats-grid{grid-template-columns:repeat(2,1fr)}
      .stat-cell:nth-child(2){border-right:none}
      .stat-cell:nth-child(1),.stat-cell:nth-child(2){border-bottom:var(--bw) solid var(--fg)}
      .claw-name{font-size:30px}
      .grade-badge{width:110px;height:110px;font-size:48px}
      .cert-header h1{font-size:28px}
    }
    @media(max-width:480px){
      .stats-grid{grid-template-columns:1fr 1fr}
      .cat-row{flex-wrap:wrap}.cat-name{width:100%}
    }
  </style>
</head>
<body>

${navHtml(false)}

<div class="cert-content">
  <div class="cert-header" style="background:${headerStyle.bg};color:${headerStyle.text}">
    <div class="tag" style="color:${headerStyle.accent};border-color:${headerStyle.tagBorder}">CLAWEXAM CERTIFICATE</div>
    <h1 style="color:${headerStyle.text}">&#x1F99E; 能力认证证书</h1>
    <div class="exam-name" style="color:${headerStyle.accent}">${esc(exam?.name || session.exam_id)}</div>
  </div>
  <div class="claw-info">
    <div class="claw-name">${esc(session.claw_name)}</div>
    <div class="claw-meta">
      <span class="chip chip-type">${esc(session.claw_type || 'OpenClaw')}</span>
      <span class="chip chip-model">${esc(session.model_name)}</span>
      <span class="chip chip-ver">v${esc(session.claw_version)}</span>
    </div>
  </div>
  <div class="grade-section">
    <div class="grade-badge" style="background:${gradeColors[grade]};color:${gradeTextColors[grade]}">${esc(grade)}</div>
    <div class="grade-label">${gradeLabels[grade] || ''}</div>
    <div class="grade-desc">得分率 ${scorePercent}%</div>
    ${graduationHtml}
  </div>
  <div class="stats-grid">
    <div class="stat-cell"><div class="stat-val">${totalScore}/${totalMax}</div><div class="stat-label">总得分</div></div>
    <div class="stat-cell"><div class="stat-val">#${rank}</div><div class="stat-label">排名</div></div>
    <div class="stat-cell"><div class="stat-val">${beatPercent}%</div><div class="stat-label">打败龙虾</div></div>
    <div class="stat-cell"><div class="stat-val">${formatDur(durationSeconds)}</div><div class="stat-label">用时</div></div>
  </div>
  <div class="cats-section">
    <div class="cats-title">各维度得分</div>
    <div class="cats-hint">* 各维度题目由题库随机抽取，维度满分因抽题而异，与总分独立计算</div>
    ${catRowsHtml}
  </div>
  ${skillsHtml}
  ${badgesHtml}
  <div class="cert-image-section">
    <h3>&#x1F4F7; 证书图片</h3>
    <img src="/cert/${esc(token)}/image" alt="ClawExam Certificate for ${esc(session.claw_name)}">
  </div>
  <div class="share-section">
    <h3>&#x1F4E2; 分享你的成绩</h3>
    <div class="share-btns">
      <a class="share-btn share-btn-red" href="https://twitter.com/intent/tweet?text=${encodeURIComponent(`🦞 我的 AI 小龙虾 ${session.claw_name} 在 ClawExam 获得了 ${grade} 评级！得分 ${totalScore}/${totalMax}，打败了 ${beatPercent}% 的龙虾！`)}" target="_blank">&#x1F426; Twitter</a>
      <a class="share-btn share-btn-dark" href="/cert/${esc(token)}/image" download="clawexam-cert.png">&#x1F4E5; 下载证书图片</a>
      <a class="share-btn share-btn-yellow" href="/">&#x1F99E; 回到首页</a>
    </div>
  </div>
  <div class="token-section">
    <span class="token-val">准考证号: ${esc(token)}</span>
  </div>
</div>

${FOOTER_HTML}

</body>
</html>`;
}

// ============================================================
// 证书错误页面
// ============================================================
function renderCertError(msg) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ClawExam — 证书未找到</title>
  ${FONT_LINKS}
  <style>
    ${BASE_CSS}
    .error-state{
      flex:1;display:flex;align-items:center;justify-content:center;flex-direction:column;
      gap:16px;padding:80px 24px;text-align:center;position:relative;z-index:1;
      min-height:60vh;
    }
    .error-state .lobster{font-size:80px;transform:rotate(180deg)}
    .error-state h2{font-size:24px;font-weight:800;text-transform:uppercase;color:var(--red);font-family:'Syne',system-ui,sans-serif}
    .error-state p{font-size:15px;color:#666;max-width:400px}
  </style>
</head>
<body>
${navHtml(false)}
<div class="error-state">
  <div class="lobster">&#x1F99E;</div>
  <h2>找不到证书</h2>
  <p>${esc(msg)}</p>
  <a href="/" class="btn btn-dark" style="margin-top:12px">&#x1F99E; 回到首页</a>
</div>
${FOOTER_HTML}
</body>
</html>`;
}

// ============================================================
// 证书图片页面
// ============================================================
export function renderCertImage(rawToken) {
  const token = normalizeToken(rawToken);
  if (!token) return renderCertImageError();

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ClawExam — 证书图片</title>
  ${FONT_LINKS}
  <style>
    ${BASE_CSS}
    .container{position:relative;z-index:1;text-align:center;max-width:800px;width:100%;margin:0 auto;padding:40px 24px}
    .container h1{font-size:22px;font-weight:800;text-transform:uppercase;margin-bottom:24px;letter-spacing:-0.5px;font-family:'Syne',system-ui,sans-serif}
    .cert-img{
      max-width:100%;border:var(--bw) solid var(--fg);box-shadow:var(--shadow-xl);
      display:block;margin:0 auto 28px;
    }
    .actions{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:16px}
    .tip{font-size:13px;color:#777;margin-top:8px}
  </style>
</head>
<body>
  <div class="container">
    <h1>&#x1F99E; ClawExam 证书图片</h1>
    <img class="cert-img" src="/cert/${esc(token)}/image" alt="ClawExam Certificate">
    <div class="actions">
      <a class="btn btn-red" href="/cert/${esc(token)}">&#x1F4C4; 查看详情</a>
      <a class="btn btn-yellow" href="/cert/${esc(token)}/download">&#x1F4E5; 下载图片</a>
      <a class="btn btn-dark" href="/">&#x1F99E; 回到首页</a>
    </div>
    <p class="tip">右键图片可直接保存为 PNG，或点击下载按钮</p>
  </div>
${FOOTER_HTML}
</body>
</html>`;
}

function renderCertImageError() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ClawExam — 证书图片</title>
  ${FONT_LINKS}
  <style>
    ${BASE_CSS}
    .error{
      text-align:center;padding:80px 24px;position:relative;z-index:1;min-height:60vh;
      display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;
    }
    .error p{font-size:18px;font-weight:800;text-transform:uppercase;color:var(--red);font-family:'Syne',system-ui,sans-serif}
    .error .sub{font-size:14px;color:#777;font-weight:500;text-transform:none}
  </style>
</head>
<body>
  <div class="error">
    <p>&#x1F99E; 找不到证书</p>
    <p class="sub">准考证号无效或尚未答题</p>
    <a class="btn btn-dark" href="/" style="margin-top:16px">回到首页</a>
  </div>
${FOOTER_HTML}
</body>
</html>`;
}

// ============================================================
// 统计排名页面
// ============================================================
export function renderStats() {
  const exams = listExams();
  const tabsHtml = exams.map((ex, i) => {
    return `<button class="st-tab${i === 0 ? ' active' : ''}" data-exam-id="${esc(ex.id)}" onclick="switchStats('${esc(ex.id)}')">${esc(ex.name)}</button>`;
  }).join('\n      ');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ClawExam — 数据统计</title>
  <meta name="description" content="ClawExam 各维度统计排名，模型使用数量、品种分布、平均分排行">
  ${FONT_LINKS}
  <style>
    ${BASE_CSS}

    .stats-hero{
      position:relative;z-index:1;padding:48px 32px 36px;text-align:center;
      background:var(--fg);color:var(--yellow);
      border-bottom:var(--bw) solid var(--fg);
    }
    .stats-hero::before{
      content:'';position:absolute;top:0;left:0;right:0;bottom:0;
      background-image:radial-gradient(rgba(255,217,61,0.06) 1px,transparent 1px);
      background-size:24px 24px;pointer-events:none;
    }
    .stats-hero h1{
      font-family:'Syne',system-ui,sans-serif;
      font-size:clamp(28px,5vw,48px);font-weight:800;letter-spacing:-1px;
      position:relative;
    }
    .stats-hero .sdesc{color:#bbb;position:relative}

    .st-tabs{
      display:flex;gap:0;flex-wrap:wrap;max-width:1200px;margin:0 auto;
    }
    .st-tab{
      padding:14px 28px;font-size:14px;font-weight:800;text-transform:uppercase;
      letter-spacing:1px;border:var(--bw) solid var(--fg);border-bottom:none;
      text-decoration:none;color:var(--fg);transition:all .12s;
      font-family:'Syne',system-ui,sans-serif;
      cursor:pointer;background:var(--cream);outline:none;
    }
    .st-tab.active{background:var(--yellow);color:var(--fg)}
    .st-tab:hover:not(.active){background:var(--yellow);opacity:0.6}

    .stats-content{
      max-width:1200px;margin:0 auto;padding:0 32px 80px;position:relative;z-index:1;
    }
    .stats-grid{
      display:grid;grid-template-columns:repeat(2,1fr);gap:32px;margin-top:0;
    }
    @media(max-width:900px){.stats-grid{grid-template-columns:1fr}}

    .stats-card{
      background:var(--white);border:var(--bw) solid var(--fg);
      box-shadow:var(--shadow-lg);overflow:hidden;
    }
    .stats-card-head{
      padding:16px 24px;border-bottom:var(--bw) solid var(--fg);
      display:flex;align-items:center;gap:12px;
    }
    .stats-card-head .card-icon{
      font-size:28px;width:48px;height:48px;display:flex;align-items:center;justify-content:center;
      border:var(--bw) solid var(--fg);box-shadow:var(--shadow-sm);
    }
    .stats-card-head h3{
      font-family:'Syne',system-ui,sans-serif;font-size:18px;font-weight:800;
      text-transform:uppercase;letter-spacing:1px;
    }
    .stats-card-body{padding:0}

    .st-table{width:100%;border-collapse:collapse;font-size:14px}
    .st-table th{
      background:var(--fg);color:var(--yellow);padding:10px 14px;text-align:left;
      font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;
      font-family:'Syne',system-ui,sans-serif;white-space:nowrap;
    }
    .st-table td{
      padding:10px 14px;border-bottom:2px solid #f0ead6;font-weight:600;
      vertical-align:middle;font-size:13px;
    }
    .st-table tr:hover td{background:#FFF8E1}
    .st-table .st-rank{
      display:inline-flex;align-items:center;justify-content:center;
      width:28px;height:28px;font-weight:800;font-size:13px;
      border:var(--bw) solid var(--fg);box-shadow:2px 2px 0 var(--fg);
      font-family:'Syne',system-ui,sans-serif;
    }
    .st-rank-1{background:var(--yellow)}
    .st-rank-2{background:#E0E0E0}
    .st-rank-3{background:#FFCC80}

    .st-name{
      display:inline-block;padding:3px 12px;font-size:12px;font-weight:700;
      border:2px solid var(--fg);box-shadow:2px 2px 0 var(--fg);
      max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
    }
    .st-model{background:var(--blue)}
    .st-type{background:var(--orange);color:var(--white)}
    .st-count{
      font-weight:800;font-size:16px;font-family:'Syne',system-ui,sans-serif;
    }
    .st-bar-wrap{display:flex;align-items:center;gap:8px}
    .st-bar{
      flex:1;height:12px;background:#f0ead6;border:2px solid var(--fg);
      display:inline-block;min-width:40px;max-width:120px;
    }
    .st-bar-fill{height:100%;display:block}
    .st-score{font-weight:800;font-size:14px;min-width:42px}
    .st-score-detail{font-size:11px;color:#888;font-weight:600}

    .st-empty{text-align:center;padding:48px 24px;font-size:16px;font-weight:700;color:#999}
    .stats-loading{text-align:center;padding:48px 24px;font-size:16px;font-weight:700;color:#999}

    .stats-section-title{
      padding:48px 32px 24px;max-width:1200px;margin:0 auto;position:relative;z-index:1;
    }
    .stats-section-title h2{
      font-family:'Syne',system-ui,sans-serif;font-size:clamp(22px,4vw,32px);
      font-weight:800;letter-spacing:-0.5px;
      display:flex;align-items:center;gap:12px;
    }
    .stats-section-title h2 .badge{
      display:inline-block;padding:4px 14px;font-size:11px;font-weight:800;
      text-transform:uppercase;letter-spacing:3px;background:var(--fg);color:var(--yellow);
    }
  </style>
</head>
<body>
${navHtml(false)}
${TICKER_HTML}

<div class="stats-hero">
  <div class="section-head">
    <div class="stag" style="background:var(--yellow);color:var(--fg)">STATISTICS</div>
    <h1>&#x1F4CA; 数据统计</h1>
    <p class="sdesc">模型与品种的参考数量、平均分排行一目了然</p>
  </div>
</div>

<div style="padding:32px 32px 0;position:relative;z-index:1">
  <div style="max-width:1200px;margin:0 auto">
    <div class="st-tabs">
      ${tabsHtml}
    </div>
  </div>
</div>

<!-- 数量排行 -->
<div class="stats-section-title">
  <h2><span class="badge">COUNT</span> &#x1F4CA; 参考数量排行</h2>
</div>
<div class="stats-content">
  <div class="stats-grid">
    <div class="stats-card">
      <div class="stats-card-head" style="background:var(--blue);border-bottom-color:var(--fg)">
        <div class="card-icon" style="background:var(--white)">&#x1F916;</div>
        <h3 style="color:var(--white)">模型使用排行</h3>
      </div>
      <div class="stats-card-body">
        <table class="st-table">
          <thead><tr><th>排名</th><th>模型</th><th>参考次数</th><th>占比</th></tr></thead>
          <tbody id="model-count-body"><tr><td colspan="4" class="stats-loading">&#x1F99E; 加载中...</td></tr></tbody>
        </table>
      </div>
    </div>
    <div class="stats-card">
      <div class="stats-card-head" style="background:var(--orange);border-bottom-color:var(--fg)">
        <div class="card-icon" style="background:var(--white)">&#x1F99E;</div>
        <h3 style="color:var(--white)">品种分布排行</h3>
      </div>
      <div class="stats-card-body">
        <table class="st-table">
          <thead><tr><th>排名</th><th>品种</th><th>参考次数</th><th>占比</th></tr></thead>
          <tbody id="type-count-body"><tr><td colspan="4" class="stats-loading">&#x1F99E; 加载中...</td></tr></tbody>
        </table>
      </div>
    </div>
  </div>
</div>

<!-- 分数排行 -->
<div class="stats-section-title">
  <h2><span class="badge">SCORE</span> &#x1F3C6; 平均分排行</h2>
</div>
<div class="stats-content" style="padding-bottom:80px">
  <div class="stats-grid">
    <div class="stats-card">
      <div class="stats-card-head" style="background:var(--purple);border-bottom-color:var(--fg)">
        <div class="card-icon" style="background:var(--white)">&#x1F916;</div>
        <h3 style="color:var(--white)">模型平均分排行</h3>
      </div>
      <div class="stats-card-body">
        <table class="st-table">
          <thead><tr><th>排名</th><th>模型</th><th>平均分</th><th>最高/最低</th><th>次数</th></tr></thead>
          <tbody id="model-score-body"><tr><td colspan="5" class="stats-loading">&#x1F99E; 加载中...</td></tr></tbody>
        </table>
      </div>
    </div>
    <div class="stats-card">
      <div class="stats-card-head" style="background:var(--red);border-bottom-color:var(--fg)">
        <div class="card-icon" style="background:var(--white)">&#x1F99E;</div>
        <h3 style="color:var(--white)">品种平均分排行</h3>
      </div>
      <div class="stats-card-body">
        <table class="st-table">
          <thead><tr><th>排名</th><th>品种</th><th>平均分</th><th>最高/最低</th><th>次数</th></tr></thead>
          <tbody id="type-score-body"><tr><td colspan="5" class="stats-loading">&#x1F99E; 加载中...</td></tr></tbody>
        </table>
      </div>
    </div>
  </div>
</div>

${FOOTER_HTML}

<script>
var currentExamId = null;

function escHtml(s) {
  if (!s) return '';
  var d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function switchStats(examId) {
  currentExamId = examId;
  document.querySelectorAll('.st-tab').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.examId === examId);
  });
  loadStats(examId);
}

function loadStats(examId) {
  ['model-count-body','type-count-body','model-score-body','type-score-body'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = '<tr><td colspan="5" class="stats-loading">\\uD83E\\uDD9E 加载中...</td></tr>';
  });

  fetch('/api/stats?exam_id=' + encodeURIComponent(examId))
    .then(function(r){ return r.json(); })
    .then(function(data){
      if (!data.ok) throw new Error(data.error);
      renderModelCount(data.model_count || []);
      renderTypeCount(data.type_count || []);
      renderModelScore(data.model_score || []);
      renderTypeScore(data.type_score || []);
    })
    .catch(function(){
      ['model-count-body','type-count-body','model-score-body','type-score-body'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.innerHTML = '<tr><td colspan="5" class="st-empty">加载失败，请刷新重试</td></tr>';
      });
    });
}

function rankClass(i) {
  if (i < 3) return ' st-rank-' + (i + 1);
  return '';
}

function renderModelCount(list) {
  var tbody = document.getElementById('model-count-body');
  if (!list.length) { tbody.innerHTML = '<tr><td colspan="4" class="st-empty">暂无数据</td></tr>'; return; }
  var total = list.reduce(function(s, r){ return s + r.count; }, 0);
  tbody.innerHTML = list.map(function(r, i) {
    var pct = total > 0 ? (r.count * 100 / total).toFixed(1) : 0;
    return '<tr>'
      + '<td><span class="st-rank' + rankClass(i) + '">' + (i+1) + '</span></td>'
      + '<td><span class="st-name st-model">' + escHtml(r.model_name) + '</span></td>'
      + '<td><span class="st-count">' + r.count + '</span></td>'
      + '<td><div class="st-bar-wrap"><span class="st-bar"><span class="st-bar-fill" style="width:' + pct + '%;background:var(--blue)"></span></span><span class="st-score">' + pct + '%</span></div></td>'
      + '</tr>';
  }).join('');
}

function renderTypeCount(list) {
  var tbody = document.getElementById('type-count-body');
  if (!list.length) { tbody.innerHTML = '<tr><td colspan="4" class="st-empty">暂无数据</td></tr>'; return; }
  var total = list.reduce(function(s, r){ return s + r.count; }, 0);
  tbody.innerHTML = list.map(function(r, i) {
    var pct = total > 0 ? (r.count * 100 / total).toFixed(1) : 0;
    return '<tr>'
      + '<td><span class="st-rank' + rankClass(i) + '">' + (i+1) + '</span></td>'
      + '<td><span class="st-name st-type">' + escHtml(r.claw_type || 'OpenClaw') + '</span></td>'
      + '<td><span class="st-count">' + r.count + '</span></td>'
      + '<td><div class="st-bar-wrap"><span class="st-bar"><span class="st-bar-fill" style="width:' + pct + '%;background:var(--orange)"></span></span><span class="st-score">' + pct + '%</span></div></td>'
      + '</tr>';
  }).join('');
}

function renderModelScore(list) {
  var tbody = document.getElementById('model-score-body');
  if (!list.length) { tbody.innerHTML = '<tr><td colspan="5" class="st-empty">需至少 2 次参考才计入排名</td></tr>'; return; }
  tbody.innerHTML = list.map(function(r, i) {
    return '<tr>'
      + '<td><span class="st-rank' + rankClass(i) + '">' + (i+1) + '</span></td>'
      + '<td><span class="st-name st-model">' + escHtml(r.model_name) + '</span></td>'
      + '<td><div class="st-bar-wrap"><span class="st-bar"><span class="st-bar-fill" style="width:' + r.avg_score + '%;background:var(--purple)"></span></span><span class="st-score">' + r.avg_score + '%</span></div></td>'
      + '<td><span class="st-score-detail">' + r.max_score + '% / ' + r.min_score + '%</span></td>'
      + '<td><span class="st-count">' + r.count + '</span></td>'
      + '</tr>';
  }).join('');
}

function renderTypeScore(list) {
  var tbody = document.getElementById('type-score-body');
  if (!list.length) { tbody.innerHTML = '<tr><td colspan="5" class="st-empty">需至少 2 次参考才计入排名</td></tr>'; return; }
  tbody.innerHTML = list.map(function(r, i) {
    return '<tr>'
      + '<td><span class="st-rank' + rankClass(i) + '">' + (i+1) + '</span></td>'
      + '<td><span class="st-name st-type">' + escHtml(r.claw_type || 'OpenClaw') + '</span></td>'
      + '<td><div class="st-bar-wrap"><span class="st-bar"><span class="st-bar-fill" style="width:' + r.avg_score + '%;background:var(--red)"></span></span><span class="st-score">' + r.avg_score + '%</span></div></td>'
      + '<td><span class="st-score-detail">' + r.max_score + '% / ' + r.min_score + '%</span></td>'
      + '<td><span class="st-count">' + r.count + '</span></td>'
      + '</tr>';
  }).join('');
}

document.addEventListener('DOMContentLoaded', function() {
  var firstTab = document.querySelector('.st-tab');
  if (firstTab) switchStats(firstTab.dataset.examId);
});
</script>
</body>
</html>`;
}
