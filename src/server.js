import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRouter from './api.js';
import { generateExamMd } from './exam-md.js';
import { listExams } from './exam-registry.js';
import { generateCertSvg } from './cert-image-gen.js';
import { Resvg } from '@resvg/resvg-js';
import { renderIndex, renderCert, renderCertImage, renderStats } from './render.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3210;

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/data', express.static(path.join(__dirname, '..', 'data')));

function getBaseUrl(req) {
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${proto}://${host}`;
}

// 动态试卷 Markdown：GET /exam/:exam_id.md
app.get('/exam/:examId.md', (req, res) => {
  const baseUrl = getBaseUrl(req);
  const md = generateExamMd(req.params.examId, baseUrl);
  if (!md) return res.status(404).type('text/plain').send(`试卷 ${req.params.examId} 不存在`);
  res.type('text/markdown; charset=utf-8').send(md);
});

// 兼容旧 URL：/exam.md -> /exam/v1.md
app.get('/exam.md', (req, res) => {
  res.redirect(301, '/exam/v1.md');
});

// API（完全不动）
app.use('/api', apiRouter);

// 证书查询跳转：GET /cert/?token=xxx → /cert/:token
app.get('/cert/', (req, res) => {
  const token = req.query.token;
  if (!token) return res.redirect('/#cert');
  res.redirect(`/cert/${encodeURIComponent(token.trim())}`);
});

// 证书图片：GET /cert/:token/image — 返回 PNG 图片（图床模式）
app.get('/cert/:token/image', async (req, res) => {
  try {
    const svg = await generateCertSvg(req.params.token);
    if (!svg) return res.status(404).type('text/plain').send('证书不存在或尚未答题');
    console.log('SVG 包含 image 标签:', svg.includes('<image'), 'SVG 长度:', svg.length);
    const resvg = new Resvg(svg, {
      fitTo: { mode: 'width', value: 800 },
      font: {
        loadSystemFonts: true,
        fontDirs: ['/usr/share/fonts', '/usr/local/share/fonts'],
        defaultFontFamily: 'Noto Sans CJK SC',
      },
    });
    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();
    res.type('image/png')
      .set('Cache-Control', 'public, max-age=300')
      .set('Content-Length', pngBuffer.length)
      .set('Content-Disposition', `inline; filename="clawexam-cert-${req.params.token}.png"`)
      .send(pngBuffer);
  } catch (err) {
    console.error('证书图片生成失败:', err);
    res.status(500).type('text/plain').send('图片生成失败');
  }
});

// 证书图片下载：GET /cert/:token/download — 强制下载 PNG
app.get('/cert/:token/download', async (req, res) => {
  try {
    const svg = await generateCertSvg(req.params.token);
    if (!svg) return res.status(404).type('text/plain').send('证书不存在或尚未答题');
    const resvg = new Resvg(svg, {
      fitTo: { mode: 'width', value: 800 },
      font: {
        loadSystemFonts: true,
        fontDirs: ['/usr/share/fonts', '/usr/local/share/fonts'],
        defaultFontFamily: 'Noto Sans CJK SC',
      },
    });
    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();
    res.type('image/png')
      .set('Content-Disposition', `attachment; filename="clawexam-cert-${req.params.token}.png"`)
      .set('Content-Length', pngBuffer.length)
      .send(pngBuffer);
  } catch (err) {
    console.error('证书图片下载失败:', err);
    res.status(500).type('text/plain').send('图片生成失败');
  }
});

// 证书图片页面：GET /cert/:token/image-page
app.get('/cert/:token/image-page', (req, res) => {
  const html = renderCertImage(req.params.token);
  res.type('text/html; charset=utf-8').send(html);
});

// 证书页面：GET /cert/:exam_token — 服务端渲染
app.get('/cert/:token', async (req, res) => {
  const html = await renderCert(req.params.token);
  res.type('text/html; charset=utf-8').send(html);
});

// 统计排名页面：GET /stats
app.get('/stats', (req, res) => {
  const html = renderStats();
  res.type('text/html; charset=utf-8').send(html);
});

// 首页：服务端渲染（支持 ?exam_id= 筛选排行榜）
app.get('/', (req, res) => {
  const baseUrl = getBaseUrl(req);
  const examId = req.query.exam_id || null;
  const html = renderIndex(baseUrl, examId);
  res.type('text/html; charset=utf-8').send(html);
});

// SPA fallback — 也用服务端渲染首页
app.get('*', (req, res) => {
  const baseUrl = getBaseUrl(req);
  const html = renderIndex(baseUrl, null);
  res.type('text/html; charset=utf-8').send(html);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🐾 ClawExam 正在运行: http://localhost:${PORT}`);
  const exams = listExams();
  for (const e of exams) {
    console.log(`  📄 试卷 [${e.id}] ${e.name}: http://localhost:${PORT}/exam/${e.id}.md`);
  }
  console.log('');
});
