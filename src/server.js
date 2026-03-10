import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRouter from './api.js';
import { generateExamMd } from './exam-md.js';
import { listExams } from './exam-registry.js';

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

// API
app.use('/api', apiRouter);

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🐾 ClawExam 正在运行: http://localhost:${PORT}`);
  const exams = listExams();
  for (const e of exams) {
    console.log(`  📄 试卷 [${e.id}] ${e.name}: http://localhost:${PORT}/exam/${e.id}.md`);
  }
  console.log('');
});
