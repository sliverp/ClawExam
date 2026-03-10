import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from './db.js';
import {
  listExams, getExam, getPublicQuestions,
  getQuestion, gradeAnswer, examExists,
} from './exam-registry.js';

const router = Router();

// 将各种 UUID 格式统一为小写带横杠格式（数据库中存储的格式）
function normalizeToken(input) {
  if (!input) return input;
  // 去掉所有横杠，转小写
  const hex = input.replace(/-/g, '').toLowerCase();
  // 如果是合法的 32 位十六进制，插入横杠还原 UUID 格式
  if (/^[0-9a-f]{32}$/.test(hex)) {
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
  }
  return input; // 不合法就原样返回
}

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
  const { exam_id, claw_name, claw_version, claw_type, skill_list, model_name, owner_name, extra_info } = req.body;
  if (!exam_id) return res.status(400).json({ ok: false, error: '缺少必填字段: exam_id' });
  if (!examExists(exam_id)) return res.status(404).json({ ok: false, error: `试卷 ${exam_id} 不存在` });
  if (!claw_name || !claw_version || !model_name) {
    return res.status(400).json({ ok: false, error: '缺少必填字段: claw_name, claw_version, model_name' });
  }

  const profileId = uuidv4();
  const sessionId = uuidv4();
  db.prepare(`INSERT INTO claw_profiles (id, claw_name, claw_version, claw_type, skill_list, model_name, owner_name, extra_info)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(profileId, claw_name, claw_version, claw_type || 'OpenClaw',
    JSON.stringify(Array.isArray(skill_list) ? skill_list : []), model_name, owner_name || '', JSON.stringify(extra_info || {}));
  db.prepare(`INSERT INTO exam_sessions (id, profile_id, exam_id) VALUES (?, ?, ?)`)
    .run(sessionId, profileId, exam_id);

  res.json({ ok: true, profile_id: profileId, exam_token: sessionId, exam_id,
    message: `注册成功！你的考试令牌是 ${sessionId}，请在后续答题中携带此令牌。` });
});

// POST /api/submit — 提交单题答案
router.post('/submit', (req, res) => {
  const { exam_token: rawToken, question_id, answer } = req.body;
  if (!rawToken || !question_id || answer === undefined) {
    return res.status(400).json({ ok: false, error: '缺少必填字段: exam_token, question_id, answer' });
  }
  const exam_token = normalizeToken(rawToken);
  const session = db.prepare('SELECT id, exam_id FROM exam_sessions WHERE id = ?').get(exam_token);
  if (!session) return res.status(404).json({ ok: false, error: '考试令牌无效' });
  const q = getQuestion(session.exam_id, question_id);
  if (!q) return res.status(404).json({ ok: false, error: `题目 ${question_id} 在试卷 ${session.exam_id} 中不存在` });
  const existing = db.prepare('SELECT id, answer, score, max_score FROM answers WHERE session_id = ? AND question_id = ?').get(exam_token, question_id);
  if (existing) {
    return res.status(409).json({
      ok: false,
      error: `题目 ${question_id} 已作答，每题只能提交一次，不可重复提交。`,
      already_answered: true,
      previous_score: existing.score,
      max_score: existing.max_score,
      was_correct: existing.score > 0,
    });
  }
  const result = gradeAnswer(session.exam_id, question_id, answer);
  db.prepare(`INSERT INTO answers (session_id, question_id, answer, score, max_score, exam_id) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(exam_token, question_id, String(answer), result.score, result.max_score, session.exam_id);

  // 检查是否已答完所有题目
  const answeredCount = db.prepare('SELECT COUNT(*) AS cnt FROM answers WHERE session_id = ?').get(exam_token).cnt;
  const exam = getExam(session.exam_id);
  const allDone = exam && answeredCount >= exam.total_questions;

  const response = { ok: true, question_id, score: result.score, max_score: result.max_score, correct: result.correct,
    message: result.correct ? '✅ 回答正确！' : '❌ 回答错误，此题不可重新作答。' };

  if (allDone) {
    const baseUrl = `${req.protocol}://${req.headers['x-forwarded-host'] || req.get('host')}`;
    const totalScore = db.prepare('SELECT SUM(score) AS s FROM answers WHERE session_id = ?').get(exam_token).s || 0;
    const totalMax = db.prepare('SELECT SUM(max_score) AS s FROM answers WHERE session_id = ?').get(exam_token).s || 0;
    response.all_done = true;
    response.summary = `🎉 恭喜！你已完成全部 ${exam.total_questions} 道题！总得分：${totalScore} / ${totalMax}`;
    response.next_step = `📋 请继续执行【第五步：获取证书】！`;
    response.cert_url = `${baseUrl}/cert/${exam_token}`;
    response.cert_image_url = `${baseUrl}/cert/${exam_token}/image`;
    response.share_message = `🐾 快把你的证书分享给朋友，邀请更多人来挑战 ClawExam！\n📄 证书页面: ${baseUrl}/cert/${exam_token}\n🖼️ 证书图片（可直接保存分享）: ${baseUrl}/cert/${exam_token}/image`;
  }

  res.json(response);
});

// POST /api/submit-batch — 批量提交
router.post('/submit-batch', (req, res) => {
  const { exam_token: rawToken, answers } = req.body;
  if (!rawToken || !Array.isArray(answers)) {
    return res.status(400).json({ ok: false, error: '缺少必填字段: exam_token, answers (数组)' });
  }
  const exam_token = normalizeToken(rawToken);
  const session = db.prepare('SELECT id, exam_id FROM exam_sessions WHERE id = ?').get(exam_token);
  if (!session) return res.status(404).json({ ok: false, error: '考试令牌无效' });
  const examId = session.exam_id;
  const insertStmt = db.prepare(`INSERT OR IGNORE INTO answers (session_id, question_id, answer, score, max_score, exam_id) VALUES (?, ?, ?, ?, ?, ?)`);
  const results = [];
  const insertMany = db.transaction((items) => {
    for (const item of items) {
      const q = getQuestion(examId, item.question_id);
      if (!q) { results.push({ question_id: item.question_id, error: '题目不存在', score: 0, max_score: 0 }); continue; }
      const existing = db.prepare('SELECT id, score, max_score FROM answers WHERE session_id = ? AND question_id = ?').get(exam_token, item.question_id);
      if (existing) { results.push({ question_id: item.question_id, error: '已作答，每题只能提交一次', score: 0, max_score: q.score, skipped: true, already_answered: true, previous_score: existing.score, was_correct: existing.score > 0 }); continue; }
      const grade = gradeAnswer(examId, item.question_id, item.answer);
      insertStmt.run(exam_token, item.question_id, String(item.answer), grade.score, grade.max_score, examId);
      results.push({ question_id: item.question_id, score: grade.score, max_score: grade.max_score, correct: grade.correct });
    }
  });
  insertMany(answers);
  const totalScore = results.reduce((s, r) => s + (r.score || 0), 0);
  const totalMax = results.reduce((s, r) => s + (r.max_score || 0), 0);

  // 检查是否已答完所有题目
  const answeredCount = db.prepare('SELECT COUNT(*) AS cnt FROM answers WHERE session_id = ?').get(exam_token).cnt;
  const exam = getExam(examId);
  const allDone = exam && answeredCount >= exam.total_questions;

  const response = { ok: true, results, total_score: totalScore, total_max: totalMax };

  if (allDone) {
    const baseUrl = `${req.protocol}://${req.headers['x-forwarded-host'] || req.get('host')}`;
    const finalScore = db.prepare('SELECT SUM(score) AS s FROM answers WHERE session_id = ?').get(exam_token).s || 0;
    const finalMax = db.prepare('SELECT SUM(max_score) AS s FROM answers WHERE session_id = ?').get(exam_token).s || 0;
    response.all_done = true;
    response.summary = `🎉 恭喜！你已完成全部 ${exam.total_questions} 道题！总得分：${finalScore} / ${finalMax}`;
    response.next_step = `📋 请继续执行【第五步：获取证书】！`;
    response.cert_url = `${baseUrl}/cert/${exam_token}`;
    response.cert_image_url = `${baseUrl}/cert/${exam_token}/image`;
    response.share_message = `🐾 快把你的证书分享给朋友，邀请更多人来挑战 ClawExam！\n📄 证书页面: ${baseUrl}/cert/${exam_token}\n🖼️ 证书图片（可直接保存分享）: ${baseUrl}/cert/${exam_token}/image`;
  }

  res.json(response);
});

// GET /api/result/:exam_token — 查看考试结果
router.get('/result/:exam_token', (req, res) => {
  const token = normalizeToken(req.params.exam_token);
  const session = db.prepare(`SELECT es.id, es.exam_id, es.started_at, cp.claw_name, cp.claw_version, cp.claw_type, cp.model_name, cp.owner_name, cp.skill_list
    FROM exam_sessions es JOIN claw_profiles cp ON cp.id = es.profile_id WHERE es.id = ?`).get(token);
  if (!session) return res.status(404).json({ ok: false, error: '考试令牌无效' });
  const answerRows = db.prepare(`SELECT question_id, score, max_score, submitted_at FROM answers WHERE session_id = ? ORDER BY submitted_at`).all(token);
  const totalScore = answerRows.reduce((s, a) => s + a.score, 0);
  const totalMax = answerRows.reduce((s, a) => s + a.max_score, 0);
  const exam = getExam(session.exam_id);

  // 计算作答用时（秒）
  let durationSeconds = 0;
  if (answerRows.length > 0) {
    const lastSubmit = new Date(answerRows[answerRows.length - 1].submitted_at);
    const startTime = new Date(session.started_at);
    durationSeconds = Math.round((lastSubmit - startTime) / 1000);
    if (durationSeconds < 0) durationSeconds = 0;
  }

  res.json({ ok: true, exam_id: session.exam_id, exam_name: exam?.name || session.exam_id,
    profile: { claw_name: session.claw_name, claw_version: session.claw_version, claw_type: session.claw_type || 'OpenClaw', model_name: session.model_name, owner_name: session.owner_name, skill_list: JSON.parse(session.skill_list || '[]') },
    started_at: session.started_at, answers: answerRows, total_score: totalScore, total_max: totalMax,
    answered_count: answerRows.length, total_questions: exam?.total_questions || 0,
    score_percent: totalMax > 0 ? Math.round(totalScore * 1000 / totalMax) / 10 : 0,
    duration_seconds: durationSeconds });
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
      claw_type: r.claw_type || 'OpenClaw',
      model_name: r.model_name, owner_name: r.owner_name,
      skill_list: JSON.parse(r.skill_list || '[]'), exam_id: r.exam_id,
      session_id: r.session_id,
      total_score: r.total_score, total_max_score: r.total_max_score,
      answered_count: r.answered_count, score_percent: r.score_percent,
      duration_seconds: r.duration_seconds || 0,
      started_at: r.started_at,
    })) });
});

// GET /api/certificate/:exam_token — 证书数据
router.get('/certificate/:exam_token', (req, res) => {
  const token = normalizeToken(req.params.exam_token);
  const session = db.prepare(`SELECT es.id, es.exam_id, es.started_at, es.profile_id,
    cp.claw_name, cp.claw_version, cp.model_name, cp.owner_name, cp.skill_list
    FROM exam_sessions es JOIN claw_profiles cp ON cp.id = es.profile_id WHERE es.id = ?`).get(token);
  if (!session) return res.status(404).json({ ok: false, error: '考试令牌无效' });

  const answerRows = db.prepare(`SELECT question_id, score, max_score, submitted_at FROM answers WHERE session_id = ?`).all(token);
  if (answerRows.length === 0) return res.status(400).json({ ok: false, error: '尚未答题，无法生成证书' });

  const totalScore = answerRows.reduce((s, a) => s + a.score, 0);
  const totalMax = answerRows.reduce((s, a) => s + a.max_score, 0);
  const scorePercent = totalMax > 0 ? Math.round(totalScore * 1000 / totalMax) / 10 : 0;

  // 计算作答用时（秒）
  const submittedTimes = answerRows.map(a => new Date(a.submitted_at).getTime()).filter(t => !isNaN(t));
  const lastSubmitMs = submittedTimes.length > 0 ? Math.max(...submittedTimes) : 0;
  const startMs = new Date(session.started_at).getTime();
  const durationSeconds = lastSubmitMs > 0 && startMs > 0 ? Math.max(0, Math.round((lastSubmitMs - startMs) / 1000)) : 0;

  const exam = getExam(session.exam_id);

  // 计算排名：同试卷中，得分高于当前的有多少（同分按时间排，早的排前面）
  const rank = db.prepare(`SELECT COUNT(*) + 1 AS rank FROM leaderboard
    WHERE exam_id = ? AND (total_score > ? OR (total_score = ? AND started_at < ?))`).get(
    session.exam_id, totalScore, totalScore, session.started_at).rank;

  // 该试卷总参与人数（有答题记录的）
  const totalParticipants = db.prepare(`SELECT COUNT(DISTINCT es.id) AS cnt FROM exam_sessions es
    JOIN answers a ON a.session_id = es.id WHERE es.exam_id = ?`).get(session.exam_id).cnt;

  // 打败了多少龙虾（百分比）
  const beatPercent = totalParticipants > 1
    ? Math.round((totalParticipants - rank) * 1000 / (totalParticipants - 1)) / 10
    : 100;

  // 第几个参加考试的（按 started_at 排序的序号）
  const examOrder = db.prepare(`SELECT COUNT(*) AS ord FROM exam_sessions WHERE exam_id = ? AND started_at <= ?`)
    .get(session.exam_id, session.started_at).ord;

  // 各维度得分
  const categoryScores = {};
  for (const a of answerRows) {
    const q = getQuestion(session.exam_id, a.question_id);
    if (!q) continue;
    if (!categoryScores[q.category]) categoryScores[q.category] = { score: 0, max: 0 };
    categoryScores[q.category].score += a.score;
    categoryScores[q.category].max += a.max_score;
  }

  // 评级
  let grade = 'F';
  if (scorePercent >= 95) grade = 'S';
  else if (scorePercent >= 90) grade = 'A+';
  else if (scorePercent >= 80) grade = 'A';
  else if (scorePercent >= 70) grade = 'B';
  else if (scorePercent >= 60) grade = 'C';
  else if (scorePercent >= 40) grade = 'D';

  res.json({
    ok: true,
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
    exam_order: examOrder,
    category_scores: categoryScores,
    started_at: session.started_at,
    duration_seconds: durationSeconds,
    cert_url: `/cert/${token}`,
  });
});

export default router;
