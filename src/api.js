import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from './db.js';
import {
  listExams, getExam, getPublicQuestion,
  getQuestion, gradeAnswer, examExists,
  pickRandomQuestions,
} from './exam-registry.js';

const router = Router();

// 将各种 UUID 格式统一为小写带横杠格式（数据库中存储的格式）
function normalizeToken(input) {
  if (!input) return input;
  const hex = input.replace(/-/g, '').toLowerCase();
  if (/^[0-9a-f]{32}$/.test(hex)) {
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
  }
  return input;
}

// 准考证号有效期：30 分钟
const SESSION_TTL_MS = 30 * 60 * 1000;

/**
 * 懒惰检查准考证号是否过期（答完所有题目 或 超过 30 分钟）
 */
async function checkSessionExpiry(exam_token) {
  const session = await db.get('SELECT id, exam_id, started_at FROM exam_sessions WHERE id = ?', [exam_token]);
  if (!session) return { expired: true, reason: '准考证号无效' };

  const startStr = session.started_at instanceof Date
    ? session.started_at.toISOString()
    : (String(session.started_at).endsWith('Z') ? session.started_at : session.started_at + 'Z');
  const elapsed = Date.now() - new Date(startStr).getTime();
  if (elapsed > SESSION_TTL_MS) {
    return { expired: true, reason: '准考证号已过期（超过 30 分钟），无法继续答题', session };
  }

  // 检查是否已答完所有题目
  const totalRow = await db.get('SELECT COUNT(*) AS cnt FROM session_questions WHERE session_id = ?', [exam_token]);
  const totalQuestions = totalRow.cnt;
  if (totalQuestions > 0) {
    const answeredRow = await db.get('SELECT COUNT(*) AS cnt FROM answers WHERE session_id = ?', [exam_token]);
    if (answeredRow.cnt >= totalQuestions) {
      return { expired: true, reason: '准考证号已作废（所有题目已答完）', session };
    }
  }

  return { expired: false, session };
}

/**
 * 获取 session 的下一道未答题目（公开信息）
 */
async function getNextQuestion(exam_token, examId) {
  const next = await db.get(`
    SELECT sq.question_id, sq.seq
    FROM session_questions sq
    WHERE sq.session_id = ?
      AND sq.question_id NOT IN (SELECT question_id FROM answers WHERE session_id = ?)
    ORDER BY sq.seq ASC
    LIMIT 1
  `, [exam_token, exam_token]);

  if (!next) return null;

  const totalRow = await db.get('SELECT COUNT(*) AS cnt FROM session_questions WHERE session_id = ?', [exam_token]);
  const q = getPublicQuestion(examId, next.question_id);
  if (!q) return null;

  return {
    seq: next.seq,
    total: totalRow.cnt,
    ...q,
  };
}

// GET /api/exams — 所有可用试卷（题库）
router.get('/exams', (req, res) => {
  res.json({ ok: true, exams: listExams() });
});

// GET /api/exams/:exam_id — 试卷基本信息（不再返回题目列表）
router.get('/exams/:exam_id', (req, res) => {
  const exam = getExam(req.params.exam_id);
  if (!exam) return res.status(404).json({ ok: false, error: `试卷 ${req.params.exam_id} 不存在` });
  res.json({ ok: true, id: exam.id, name: exam.name, description: exam.description,
    version: exam.version, total_questions: exam.total_questions,
    pool_size: exam.pool_size,
    categories: exam.categories });
});

// POST /api/register — 注册 Claw 并创建考试会话，返回第一道题
router.post('/register', async (req, res) => {
  try {
    const { exam_id, claw_name, claw_version, claw_type, skill_list, model_name, owner_name, extra_info } = req.body;
    if (!exam_id) return res.status(400).json({ ok: false, error: '缺少必填字段: exam_id' });
    if (!examExists(exam_id)) return res.status(404).json({ ok: false, error: `试卷 ${exam_id} 不存在` });
    if (!claw_name || !claw_version || !model_name) {
      return res.status(400).json({ ok: false, error: '缺少必填字段: claw_name, claw_version, model_name' });
    }

    const profileId = uuidv4();
    const sessionId = uuidv4();

    // 随机组卷
    const questionIds = pickRandomQuestions(exam_id);

    // 事务：创建档案 + 会话 + 组卷（批量 INSERT 减少连接占用时间）
    await db.transaction(async (conn) => {
      await conn.run(`INSERT INTO claw_profiles (id, claw_name, claw_version, claw_type, skill_list, model_name, owner_name, extra_info)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [profileId, claw_name, claw_version, claw_type || 'OpenClaw',
         JSON.stringify(Array.isArray(skill_list) ? skill_list : []),
         model_name, owner_name || '', JSON.stringify(extra_info || {})]);

      await conn.run('INSERT INTO exam_sessions (id, profile_id, exam_id) VALUES (?, ?, ?)',
        [sessionId, profileId, exam_id]);

      // 批量插入组卷记录，一条 SQL 搞定，不再逐条 INSERT
      const placeholders = questionIds.map(() => '(?, ?, ?)').join(', ');
      const values = [];
      for (let i = 0; i < questionIds.length; i++) {
        values.push(sessionId, questionIds[i], i + 1);
      }
      await conn.run(`INSERT INTO session_questions (session_id, question_id, seq) VALUES ${placeholders}`, values);
    });

    // 计算本次考试的总分
    let sessionTotalScore = 0;
    for (const qid of questionIds) {
      const q = getQuestion(exam_id, qid);
      if (q) sessionTotalScore += q.score;
    }

    // 返回第一道题
    const firstQuestion = await getNextQuestion(sessionId, exam_id);

    res.json({
      ok: true,
      profile_id: profileId,
      exam_token: sessionId,
      exam_id,
      total_questions: questionIds.length,
      total_score: sessionTotalScore,
      message: `注册成功！你的准考证号是 ${sessionId}。本次考试共 ${questionIds.length} 道题，满分 ${sessionTotalScore} 分。准考证号有效期 30 分钟。请使用 POST /api/submit 逐题提交答案，每次提交后会返回下一道题。`,
      first_question: firstQuestion,
    });
  } catch (err) {
    console.error('注册失败:', err);
    res.status(500).json({ ok: false, error: '注册失败: ' + err.message });
  }
});

// POST /api/submit — 提交单题答案，返回下一道题
router.post('/submit', async (req, res) => {
  try {
    const { exam_token: rawToken, question_id, answer } = req.body;
    if (!rawToken || !question_id || answer === undefined) {
      return res.status(400).json({ ok: false, error: '缺少必填字段: exam_token, question_id, answer' });
    }
    const exam_token = normalizeToken(rawToken);
    const { expired, reason, session } = await checkSessionExpiry(exam_token);
    if (expired) return res.status(403).json({ ok: false, error: reason });

    // 验证该题是否属于此 session 的组卷
    const inSession = await db.get('SELECT seq FROM session_questions WHERE session_id = ? AND question_id = ?', [exam_token, question_id]);
    if (!inSession) {
      return res.status(404).json({ ok: false, error: `题目 ${question_id} 不在你的试卷中` });
    }

    const q = getQuestion(session.exam_id, question_id);
    if (!q) return res.status(404).json({ ok: false, error: `题目 ${question_id} 在试卷 ${session.exam_id} 中不存在` });

    const existing = await db.get('SELECT id, score, max_score FROM answers WHERE session_id = ? AND question_id = ?', [exam_token, question_id]);
    if (existing) {
      const nextQ = await getNextQuestion(exam_token, session.exam_id);
      return res.status(409).json({
        ok: false,
        error: `题目 ${question_id} 已作答，每题只能提交一次，不可重复提交。`,
        already_answered: true,
        previous_score: existing.score,
        max_score: existing.max_score,
        was_correct: existing.score > 0,
        next_question: nextQ,
      });
    }

    const result = gradeAnswer(session.exam_id, question_id, answer);
    await db.run(`INSERT INTO answers (session_id, question_id, answer, score, max_score, exam_id) VALUES (?, ?, ?, ?, ?, ?)`,
      [exam_token, question_id, String(answer), result.score, result.max_score, session.exam_id]);

    // 检查是否已答完所有题目
    const totalRow = await db.get('SELECT COUNT(*) AS cnt FROM session_questions WHERE session_id = ?', [exam_token]);
    const answeredRow = await db.get('SELECT COUNT(*) AS cnt FROM answers WHERE session_id = ?', [exam_token]);
    const allDone = answeredRow.cnt >= totalRow.cnt;

    const response = {
      ok: true,
      question_id,
      seq: inSession.seq,
      score: result.score,
      max_score: result.max_score,
      correct: result.correct,
      message: result.correct ? '✅ 回答正确！' : '❌ 回答错误，此题不可重新作答。',
      progress: `${answeredRow.cnt}/${totalRow.cnt}`,
    };

    if (allDone) {
      const baseUrl = `${req.protocol}://${req.headers['x-forwarded-host'] || req.get('host')}`;
      const scoreRow = await db.get('SELECT SUM(score) AS s, SUM(max_score) AS m FROM answers WHERE session_id = ?', [exam_token]);
      const totalScore = scoreRow.s || 0;
      const sessionMax = scoreRow.m || 0;
      response.all_done = true;
      response.summary = `🎉 恭喜！你已完成全部 ${totalRow.cnt} 道题！总得分：${totalScore} / ${sessionMax}`;
      response.next_step = `📋 请继续执行【获取证书】步骤！`;
      response.cert_url = `${baseUrl}/cert/${exam_token}`;
      response.cert_image_url = `${baseUrl}/cert/${exam_token}/image`;
      response.share_message = `🐾 快把你的证书分享给朋友，邀请更多人来挑战 ClawExam！\n📄 证书页面: ${baseUrl}/cert/${exam_token}\n🖼️ 证书图片（可直接保存分享）: ${baseUrl}/cert/${exam_token}/image`;
    } else {
      response.next_question = await getNextQuestion(exam_token, session.exam_id);
    }

    res.json(response);
  } catch (err) {
    console.error('提交答案失败:', err);
    res.status(500).json({ ok: false, error: '提交失败: ' + err.message });
  }
});

// GET /api/next/:exam_token — 获取当前下一道未答题目（供断线重连使用）
router.get('/next/:exam_token', async (req, res) => {
  try {
    const token = normalizeToken(req.params.exam_token);
    const session = await db.get('SELECT id, exam_id FROM exam_sessions WHERE id = ?', [token]);
    if (!session) return res.status(404).json({ ok: false, error: '准考证号无效' });

    const totalRow = await db.get('SELECT COUNT(*) AS cnt FROM session_questions WHERE session_id = ?', [token]);
    const answeredRow = await db.get('SELECT COUNT(*) AS cnt FROM answers WHERE session_id = ?', [token]);

    if (answeredRow.cnt >= totalRow.cnt) {
      const baseUrl = `${req.protocol}://${req.headers['x-forwarded-host'] || req.get('host')}`;
      return res.json({ ok: true, all_done: true, progress: `${answeredRow.cnt}/${totalRow.cnt}`,
        cert_url: `${baseUrl}/cert/${token}`, cert_image_url: `${baseUrl}/cert/${token}/image` });
    }

    const nextQ = await getNextQuestion(token, session.exam_id);
    res.json({ ok: true, progress: `${answeredRow.cnt}/${totalRow.cnt}`, next_question: nextQ });
  } catch (err) {
    console.error('获取下一题失败:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/result/:exam_token — 查看考试结果
router.get('/result/:exam_token', async (req, res) => {
  try {
    const token = normalizeToken(req.params.exam_token);
    const session = await db.get(`SELECT es.id, es.exam_id, es.started_at, cp.claw_name, cp.claw_version, cp.claw_type, cp.model_name, cp.owner_name, cp.skill_list
      FROM exam_sessions es JOIN claw_profiles cp ON cp.id = es.profile_id WHERE es.id = ?`, [token]);
    if (!session) return res.status(404).json({ ok: false, error: '准考证号无效' });
    const answerRows = await db.all('SELECT question_id, score, max_score, submitted_at FROM answers WHERE session_id = ? ORDER BY submitted_at', [token]);
    const totalScore = answerRows.reduce((s, a) => s + a.score, 0);

    // 满分优先从 answers.max_score 累加（答题时记录，不受后续题库分值调整影响）
    const totalMaxFromAnswers = answerRows.reduce((s, a) => s + a.max_score, 0);
    const sessionQuestionIds = await db.all('SELECT question_id FROM session_questions WHERE session_id = ?', [token]);
    const totalQuestions = sessionQuestionIds.length || answerRows.length;

    // 如果已全部答完，用 answers.max_score；否则未答题用当前题库分值补充
    let totalMax;
    if (answerRows.length >= totalQuestions) {
      totalMax = totalMaxFromAnswers;
    } else {
      totalMax = totalMaxFromAnswers;
      const answeredIds = new Set(answerRows.map(a => a.question_id));
      for (const row of sessionQuestionIds) {
        if (!answeredIds.has(row.question_id)) {
          const q = getQuestion(session.exam_id, row.question_id);
          if (q) totalMax += q.score;
        }
      }
    }

    let durationSeconds = 0;
    if (answerRows.length > 0) {
      const lastSubmit = new Date(answerRows[answerRows.length - 1].submitted_at);
      const startTime = new Date(session.started_at);
      durationSeconds = Math.round((lastSubmit - startTime) / 1000);
      if (durationSeconds < 0) durationSeconds = 0;
    }

    res.json({ ok: true, exam_id: session.exam_id, exam_name: getExam(session.exam_id)?.name || session.exam_id,
      profile: { claw_name: session.claw_name, claw_version: session.claw_version, claw_type: session.claw_type || 'OpenClaw', model_name: session.model_name, owner_name: session.owner_name, skill_list: JSON.parse(session.skill_list || '[]') },
      started_at: session.started_at, answers: answerRows, total_score: totalScore, total_max: totalMax,
      answered_count: answerRows.length, total_questions: totalQuestions,
      score_percent: totalMax > 0 ? Math.round(totalScore * 1000 / totalMax) / 10 : 0,
      duration_seconds: durationSeconds });
  } catch (err) {
    console.error('获取结果失败:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/leaderboard?exam_id=v1 — 排行榜（按试卷筛选）
router.get('/leaderboard', async (req, res) => {
  try {
    const examId = req.query.exam_id;
    let rows;
    if (examId) {
      rows = await db.all('SELECT * FROM leaderboard WHERE exam_id = ? LIMIT 100', [examId]);
    } else {
      rows = await db.all('SELECT * FROM leaderboard LIMIT 100');
    }

    if (rows.length === 0) {
      const examMeta = examId ? getExam(examId) : null;
      return res.json({ ok: true, exam_id: examId || null, exam_name: examMeta?.name || null, leaderboard: [] });
    }

    // 批量查询所有 session 的 answers.max_score 合计（一条 SQL 代替 N 条）
    const sessionIds = rows.map(r => r.session_id);
    const placeholders = sessionIds.map(() => '?').join(',');
    const answerMaxRows = await db.all(
      `SELECT session_id, SUM(max_score) AS m, COUNT(*) AS cnt FROM answers WHERE session_id IN (${placeholders}) GROUP BY session_id`,
      sessionIds
    );
    const answerMaxMap = {};
    for (const r of answerMaxRows) answerMaxMap[r.session_id] = { m: r.m, cnt: r.cnt };

    // 批量查询所有 session 的组卷题目数（一条 SQL 代替 N 条）
    const sqCountRows = await db.all(
      `SELECT session_id, COUNT(*) AS cnt FROM session_questions WHERE session_id IN (${placeholders}) GROUP BY session_id`,
      sessionIds
    );
    const sqCountMap = {};
    for (const r of sqCountRows) sqCountMap[r.session_id] = r.cnt;

    const examMeta = examId ? getExam(examId) : null;
    const leaderboard = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const am = answerMaxMap[r.session_id];
      const sqCount = sqCountMap[r.session_id] || 0;

      let realMax;
      if (am && sqCount > 0 && am.cnt >= sqCount) {
        // 全部答完，直接用 answers.max_score
        realMax = am.m;
      } else if (am) {
        // 有答题记录但数据不完整，用 answers.max_score 作为 fallback
        realMax = am.m;
      } else {
        // 没有答题记录，用排行榜视图中的值
        realMax = r.total_max_score;
      }
      realMax = realMax || r.total_max_score;

      const realPercent = realMax > 0 ? Math.round(r.total_score * 1000 / realMax) / 10 : 0;
      leaderboard.push({
        rank: i + 1, claw_name: r.claw_name, claw_version: r.claw_version,
        claw_type: r.claw_type || 'OpenClaw',
        model_name: r.model_name, owner_name: r.owner_name,
        skill_list: JSON.parse(r.skill_list || '[]'), exam_id: r.exam_id,
        session_id: r.session_id,
        total_score: r.total_score, total_max_score: realMax,
        answered_count: r.answered_count, score_percent: realPercent,
        duration_seconds: r.duration_seconds || 0,
        started_at: r.started_at,
      });
    }

    res.json({ ok: true, exam_id: examId || null, exam_name: examMeta?.name || null, leaderboard });
  } catch (err) {
    console.error('获取排行榜失败:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/certificate/:exam_token — 证书数据
router.get('/certificate/:exam_token', async (req, res) => {
  try {
    const token = normalizeToken(req.params.exam_token);
    const session = await db.get(`SELECT es.id, es.exam_id, es.started_at, es.profile_id,
      cp.claw_name, cp.claw_version, cp.model_name, cp.owner_name, cp.skill_list
      FROM exam_sessions es JOIN claw_profiles cp ON cp.id = es.profile_id WHERE es.id = ?`, [token]);
    if (!session) return res.status(404).json({ ok: false, error: '准考证号无效' });

    const answerRows = await db.all('SELECT question_id, score, max_score, submitted_at FROM answers WHERE session_id = ?', [token]);
    if (answerRows.length === 0) return res.status(400).json({ ok: false, error: '尚未答题，无法生成证书' });

    const exam = getExam(session.exam_id);

    const sessionQuestionIds = await db.all('SELECT question_id FROM session_questions WHERE session_id = ?', [token]);

    // 满分优先用 answers.max_score（不受题库分值调整影响）
    const totalScore = answerRows.reduce((s, a) => s + a.score, 0);
    const totalMaxFromAnswers = answerRows.reduce((s, a) => s + a.max_score, 0);
    const totalQuestions = sessionQuestionIds.length || answerRows.length;
    let totalMax;
    if (answerRows.length >= totalQuestions) {
      totalMax = totalMaxFromAnswers;
    } else {
      totalMax = totalMaxFromAnswers;
      const answeredIds = new Set(answerRows.map(a => a.question_id));
      for (const row of sessionQuestionIds) {
        if (!answeredIds.has(row.question_id)) {
          const q = getQuestion(session.exam_id, row.question_id);
          if (q) totalMax += q.score;
        }
      }
    }
    const scorePercent = totalMax > 0 ? Math.round(totalScore * 1000 / totalMax) / 10 : 0;

    const submittedTimes = answerRows.map(a => new Date(a.submitted_at).getTime()).filter(t => !isNaN(t));
    const lastSubmitMs = submittedTimes.length > 0 ? Math.max(...submittedTimes) : 0;
    const startMs = new Date(session.started_at).getTime();
    const durationSeconds = lastSubmitMs > 0 && startMs > 0 ? Math.max(0, Math.round((lastSubmitMs - startMs) / 1000)) : 0;

    const rankRow = await db.get(`SELECT COUNT(*) + 1 AS \`rank\` FROM leaderboard
      WHERE exam_id = ? AND (total_score > ? OR (total_score = ? AND started_at < ?))`,
      [session.exam_id, totalScore, totalScore, session.started_at]);

    const participantRow = await db.get(`SELECT COUNT(DISTINCT es.id) AS cnt FROM exam_sessions es
      JOIN answers a ON a.session_id = es.id WHERE es.exam_id = ?`, [session.exam_id]);

    const rank = rankRow.rank;
    const totalParticipants = participantRow.cnt;

    const beatPercent = totalParticipants > 1
      ? Math.round((totalParticipants - rank) * 1000 / (totalParticipants - 1)) / 10
      : 100;

    const examOrderRow = await db.get('SELECT COUNT(*) AS ord FROM exam_sessions WHERE exam_id = ? AND started_at <= ?',
      [session.exam_id, session.started_at]);

    // 各维度得分（用 answers.max_score 作为各题满分，保证历史数据准确）
    const categoryScores = {};
    // 先用 answers 中记录的 max_score 初始化各 category
    for (const a of answerRows) {
      const q = getQuestion(session.exam_id, a.question_id);
      const cat = q?.category || 'unknown';
      if (!categoryScores[cat]) categoryScores[cat] = { score: 0, max: 0 };
      categoryScores[cat].score += a.score;
      categoryScores[cat].max += a.max_score;
    }
    // 未答题的 category 满分用当前题库补充
    const answeredIds = new Set(answerRows.map(a => a.question_id));
    const sessionQIds = new Set(sessionQuestionIds.map(r => r.question_id));
    if (exam) {
      for (const q of exam.questions) {
        if (sessionQIds.size > 0 && !sessionQIds.has(q.id)) continue;
        if (answeredIds.has(q.id)) continue;
        if (!categoryScores[q.category]) categoryScores[q.category] = { score: 0, max: 0 };
        categoryScores[q.category].max += q.score;
      }
    }

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
      exam_order: examOrderRow.ord,
      category_scores: categoryScores,
      started_at: session.started_at,
      duration_seconds: durationSeconds,
      cert_url: `/cert/${token}`,
    });
  } catch (err) {
    console.error('获取证书数据失败:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
