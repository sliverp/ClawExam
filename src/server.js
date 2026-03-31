import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import rateLimit from 'express-rate-limit';
import apiRouter from './api.js';
import authRouter from './auth.js';
import socialRouter from './social.js';
import { generateExamMd } from './exam-md.js';
import { listExams } from './exam-registry.js';
import { generateCertSvg } from './cert-image-gen.js';
import { Resvg } from '@resvg/resvg-js';
import { buildCosAuthorization } from './avatar.js';
import { renderIndex, renderCert, renderCertImage, renderStats } from './render.js';
import config from './config.js';
import db from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.set('trust proxy', 1); // 信任第一层反向代理（Nginx），正确获取真实客户端 IP
const PORT = process.env.PORT || 3210;
const STATIC_CACHE_DIR = path.join(__dirname, '..', 'public', 'static-cache');

if (!fs.existsSync(STATIC_CACHE_DIR)) {
  fs.mkdirSync(STATIC_CACHE_DIR, { recursive: true });
}

function getCachedStaticPath(normalizedPath) {
  return path.join(STATIC_CACHE_DIR, normalizedPath);
}

function ensureParentDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

// 1x1 透明 PNG fallback（避免依赖本地文件）
const DEFAULT_AVATAR_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAB' +
  'Nl7BcQAAAABJRU5ErkJggg==', 'base64'
);

function sendDefaultAvatar(res) {
  const fallbackPath = path.join(__dirname, '..', 'public', 'images', 'default-avatar.png');
  if (fs.existsSync(fallbackPath)) {
    return res.set('Cache-Control', 'public, max-age=86400').sendFile(fallbackPath);
  }
  return res.set('Content-Type', 'image/png').set('Cache-Control', 'public, max-age=3600').send(DEFAULT_AVATAR_BUFFER);
}

// CORS + 安全响应头
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, X-App-Token');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.header('X-Content-Type-Options', 'nosniff');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: '1mb' }));

app.get('/static/avatar/:uid', async (req, res) => {
  try {
    const uidHash = String(req.params.uid || '').trim();
    if (!/^[0-9a-f]{16}$/i.test(uidHash)) {
      console.log('[头像代理] uid_hash 格式不合法:', uidHash);
      return sendDefaultAvatar(res);
    }

    const user = await db.get(
      'SELECT avatar_url FROM users WHERE uid_hash = ?',
      [uidHash]
    );

    if (!user?.avatar_url) {
      console.log('[头像代理] 数据库中无 avatar_url, uid_hash:', uidHash);
      return sendDefaultAvatar(res);
    }

    const upstreamUrl = `${config.cos.baseUrl.replace(/\/+$/, '')}/${String(user.avatar_url).replace(/^\/+/, '')}`;
    const urlObj = new URL(upstreamUrl);
    const cosHeaders = { host: urlObj.host };
    let authorization;
    try {
      authorization = buildCosAuthorization('GET', urlObj, cosHeaders);
    } catch (e) {
      console.warn('[头像代理] COS 签名失败，尝试无签名请求:', e.message);
    }
    console.log('[头像代理] COS URL:', upstreamUrl);
    const fetchHeaders = {
      'User-Agent': 'ClawExam-AvatarProxy/1.0',
      Host: urlObj.host,
    };
    if (authorization) fetchHeaders.Authorization = authorization;
    const upstreamRes = await fetch(upstreamUrl, { headers: fetchHeaders });

    if (!upstreamRes.ok) {
      console.error('[头像代理] COS 返回失败:', upstreamRes.status, await upstreamRes.text().catch(() => ''));
      return sendDefaultAvatar(res);
    }

    const contentType = upstreamRes.headers.get('content-type') || 'image/jpeg';
    const cacheControl = upstreamRes.headers.get('cache-control') || 'public, max-age=86400';
    const arrayBuffer = await upstreamRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.set('Content-Type', contentType);
    res.set('Cache-Control', cacheControl);
    return res.send(buffer);
  } catch (err) {
    console.error('头像代理失败:', err);
    return sendDefaultAvatar(res);
  }
});

app.get(/^\/static\/(.+)$/, async (req, res) => {
  const normalizedPath = String(req.params[0] || '')
    .replace(/^\/+/, '')
    .replace(/\/{2,}/g, '/');

  if (!normalizedPath || normalizedPath.includes('..')) {
    return res.status(400).type('text/plain').send('非法静态资源路径');
  }

  const cachedFilePath = getCachedStaticPath(normalizedPath);
  if (fs.existsSync(cachedFilePath)) {
    return res.set('Cache-Control', 'public, max-age=86400').sendFile(cachedFilePath);
  }

  const upstreamUrl = `${config.cos.baseUrl.replace(/\/+$/, '')}/${normalizedPath}`;

  try {
    const upstreamRes = await fetch(upstreamUrl, {
      headers: {
        'User-Agent': 'ClawExam-StaticProxy/1.0',
      },
    });

    if (!upstreamRes.ok) {
      return res
        .status(upstreamRes.status === 404 ? 404 : 502)
        .type('text/plain')
        .send(upstreamRes.status === 404 ? '静态资源不存在' : '静态资源拉取失败');
    }

    const contentType = upstreamRes.headers.get('content-type');
    const contentLength = upstreamRes.headers.get('content-length');
    const cacheControl = upstreamRes.headers.get('cache-control') || 'public, max-age=86400';
    const arrayBuffer = await upstreamRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    ensureParentDir(cachedFilePath);
    fs.writeFileSync(cachedFilePath, buffer);

    if (contentType) res.set('Content-Type', contentType);
    if (contentLength) res.set('Content-Length', contentLength);
    res.set('Cache-Control', cacheControl);
    return res.send(buffer);
  } catch (err) {
    console.error('静态资源代理失败:', upstreamUrl, err);
    return res.status(502).type('text/plain').send('静态资源代理失败');
  }
});

app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/data', express.static(path.join(__dirname, '..', 'data')));

// 速率限制
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 分钟
  max: 60,               // 每 IP 最多 60 次
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: '请求过于频繁，请稍后再试' },
});
app.use('/api', globalLimiter);

// 注册端点严格限流：每 IP 每分钟 5 次
const registerLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: '注册过于频繁，请稍后再试' },
});
app.use('/api/register', registerLimiter);

// 登录端点限流：每 IP 每分钟 10 次
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: '登录过于频繁，请稍后再试' },
});
app.use('/api/wx-login', loginLimiter);

function getBaseUrl(req) {
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${proto}://${host}`;
}

// 动态试卷 Markdown：GET /exam/:exam_id.md?uid=xxx
app.get('/exam/:examId.md', (req, res) => {
  const baseUrl = getBaseUrl(req);
  const md = generateExamMd(req.params.examId, baseUrl, { ownerUid: req.query.uid || '', arenaId: req.query.arena || '' });
  if (!md) return res.status(404).type('text/plain').send(`试卷 ${req.params.examId} 不存在`);
  res.type('text/markdown; charset=utf-8').send(md);
});

// 兼容旧 URL：/exam.md -> /exam/v1.md
app.get('/exam.md', (req, res) => {
  res.redirect(301, '/exam/v1.md');
});

// API（完全不动）
app.use('/api', apiRouter);

// 社交功能路由
app.use('/api', authRouter);
app.use('/api', socialRouter);

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
