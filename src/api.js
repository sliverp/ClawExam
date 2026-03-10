import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from './db.js';
import {
  listExams, getExam, getPublicQuestions,
  getQuestion, gradeAnswer, examExists,
} from './exam-registry.js';

const router = Router();

// GET /api/exams — 所有可用试卷
router.get('/exams', (req, res) => {
  res.json({ ok: true, exams: listExams() });
});

// GET /api/exams/:exam_id — 试卷详情（含公开题目）
router.get('/exams/:exam_id', (req, res) => {
  const exam = getExam(req.params.exam_id);
  if (!exam) return res.status(404).json({ ok: false, error: `试卷 ${req.params.exam_id} 不存在` });
  res.json({ ok: true, id: exam.id, name: exam.name, description: exam.description,
    version: exam.version, total_questions: exam.total_questions,
    total_score: exam.total_score, categories: exam.categories,
    questions: getPublicQuestions(exam.id) });
});

// POST /api/register — 注册 Claw 并创建考试会话
router.post('/register', (req, res) => {
  const { exam_id, claw_name, claw_version, skill_list, model_name, owner_name, extra_info } = req.body;
  if (!exam_id) return res.status(400).json({ ok: false, error: '缺少必填字段: exam_id' });
  if (!examExists(exam_id)) return res.status(404).json({ ok: false, error: `试卷 ${exam_id} 不存在` });
  if (!claw_name || !claw_version || !model_name || !owner_name) {
    return res.status(400).json({ ok: false, error: '缺少必填字段: claw_name, claw_version, model_name, owner_name' });
  }

  const profileId = uuidv4();
  const sessionId = uuidv4();
  db.prepare(`INSERT INTO claw_profiles (id, claw_name, claw_version, skill_list, model_name, owner_name, extra_info)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(profileId, claw_name, claw_version,
    JSON.stringify(Array.isArray(skill_list) ? skill_list : []), model_name, owner_name, JSON.stringify(extra_info || {}));
  db.prepare(`INSERT INTO exam_sessions (id, profile_id, exam_id) VALUES (?, ?, ?)`)
    .run(sessionId, profileId, exam_id);

  res.json({ ok: true, profile_id: profileId, exam_token: sessionId, exam_id,
    message: `注册成功！你的考试令牌是 ${sessionId}，请在后续答题中携带此令牌。` });
});

// POST /api/submit — 提交单题答案
router.post('/submit', (req, res) => {
  const { exam_token, question_id, answer } = req.body;
  if (!exam_token || !question_id || answer === undefined) {
    return res.status(400).json({ ok: false, error: '缺少必填字段: exam_token, question_id, answer' });
  }
  const session = db.prepare('SELECT id, exam_id FROM exam_sessions WHERE id = ?').get(exam_token);
  if (!session) return res.status(404).json({ ok: false, error: '考试令牌无效' });
  const q = getQuestion(session.exam_id, question_id);
  if (!q) return res.status(404).json({ ok: false, error: `题目 ${question_id} 在试卷 ${session.exam_id} 中不存在` });
  const existing = db.prepare('SELECT id FROM answers WHERE session_id = ? AND question_id = ?').get(exam_token, question_id);
  if (existing) return res.status(409).json({ ok: false, error: `题目 ${question_id} 已回答` });
  const result = gradeAnswer(session.exam_id, question_id, answer);
  db.prepare(`INSERT INTO answers (session_id, question_id, answer, score, max_score, exam_id) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(exam_token, question_id, String(answer), result.score, result.max_score, session.exam_id);
  res.json({ ok: true, question_id, score: result.score, max_score: result.max_score, correct: result.correct });
});

// POST /api/submit-batch — 批量提交
router.post('/submit-batch', (req, res) => {
  const { exam_token, answers } = req.body;
  if (!exam_token || !Array.isArray(answers)) {
    return res.status(400).json({ ok: false, error: '缺少必填字段: exam_token, answers (数组)' });
  }
  const session = db.prepare('SELECT id, exam_id FROM exam_sessions WHERE id = ?').get(exam_token);
  if (!session) return res.status(404).json({ ok: false, error: '考试令牌无效' });
  const examId = session.exam_id;
  const insertStmt = db.prepare(`INSERT OR IGNORE INTO answers (session_id, question_id, answer, score, max_score, exam_id) VALUES (?, ?, ?, ?, ?, ?)`);
  const results = [];
  const insertMany = db.transaction((items) => {
    for (const item of items) {
      const q = getQuestion(examId, item.question_id);
      if (!q) { results.push({ question_id: item.question_id, error: '题目不存在', score: 0, max_score: 0 }); continue; }
      const existing = db.prepare('SELECT id FROM answers WHERE session_id = ? AND question_id = ?').get(exam_token, item.question_id);
      if (existing) { results.push({ question_id: item.question_id, error: '已回答', score: 0, max_score: q.score, skipped: true }); continue; }
      const grade = gradeAnswer(examId, item.question_id, item.answer);
      insertStmt.run(exam_token, item.question_id, String(item.answer), grade.score, grade.max_score, examId);
      results.push({ question_id: item.question_id, score: grade.score, max_score: grade.max_score, correct: grade.correct });
    }
  });
  insertMany(answers);
  const totalScore = results.reduce((s, r) => s + (r.score || 0), 0);
  const totalMax = results.reduce((s, r) => s + (r.max_score || 0), 0);
  res.json({ ok: true, results, total_score: totalScore, total_max: totalMax });
});

// GET /api/result/:exam_token — 查看考试结果
router.get('/result/:exam_token', (req, res) => {
  const session = db.prepare(`SELECT es.id, es.exam_id, es.started_at, cp.claw_name, cp.claw_version, cp.model_name, cp.owner_name, cp.skill_list
    FROM exam_sessions es JOIN claw_profiles cp ON cp.id = es.profile_id WHERE es.id = ?`).get(req.params.exam_token);
  if (!session) return res.status(404).json({ ok: false, error: '考试令牌无效' });
  const answerRows = db.prepare(`SELECT question_id, score, max_score, submitted_at FROM answers WHERE session_id = ? ORDER BY submitted_at`).all(req.params.exam_token);
  const totalScore = answerRows.reduce((s, a) => s + a.score, 0);
  const totalMax = answerRows.reduce((s, a) => s + a.max_score, 0);
  const exam = getExam(session.exam_id);
  res.json({ ok: true, exam_id: session.exam_id, exam_name: exam?.name || session.exam_id,
    profile: { claw_name: session.claw_name, claw_version: session.claw_version, model_name: session.model_name, owner_name: session.owner_name, skill_list: JSON.parse(session.skill_list || '[]') },
    started_at: session.started_at, answers: answerRows, total_score: totalScore, total_max: totalMax,
    answered_count: answerRows.length, total_questions: exam?.total_questions || 0,
    score_percent: totalMax > 0 ? Math.round(totalScore * 1000 / totalMax) / 10 : 0 });
});

// GET /api/leaderboard?exam_id=v1 — 排行榜（按试卷筛选）
router.get('/leaderboard', (req, res) => {
  const examId = req.query.exam_id;
  let rows;
  if (examId) {
    rows = db.prepare('SELECT * FROM leaderboard WHERE exam_id = ? LIMIT 100').all(examId);
  } else {
    rows = db.prepare('SELECT * FROM leaderboard LIMIT 100').all();
  }
  const exam = examId ? getExam(examId) : null;
  res.json({ ok: true, exam_id: examId || null, exam_name: exam?.name || null,
    leaderboard: rows.map((r, i) => ({
      rank: i + 1, claw_name: r.claw_name, claw_version: r.claw_version,
      model_name: r.model_name, owner_name: r.owner_name,
      skill_list: JSON.parse(r.skill_list || '[]'), exam_id: r.exam_id,
      total_score: r.total_score, total_max_score: r.total_max_score,
      answered_count: r.answered_count, score_percent: r.score_percent, started_at: r.started_at,
    })) });
});

export default router;
