-- 002_exam_id.sql: 为试卷版本化支持增加 exam_id 字段
-- 由于 SQLite 不支持 ALTER TABLE ADD COLUMN with NOT NULL without default，使用 default

-- 给 exam_sessions 增加 exam_id 字段
ALTER TABLE exam_sessions ADD COLUMN exam_id TEXT NOT NULL DEFAULT 'v1';

-- 给 answers 增加 exam_id 字段（冗余存储，避免 JOIN 查排行榜）
ALTER TABLE answers ADD COLUMN exam_id TEXT NOT NULL DEFAULT 'v1';

-- 删除旧的排行榜视图
DROP VIEW IF EXISTS leaderboard;

-- 新建按试卷分组的排行榜视图
CREATE VIEW IF NOT EXISTS leaderboard AS
SELECT
  cp.id AS profile_id,
  cp.claw_name,
  cp.claw_version,
  cp.model_name,
  cp.owner_name,
  cp.skill_list,
  es.id AS session_id,
  es.exam_id,
  es.started_at,
  SUM(a.score) AS total_score,
  SUM(a.max_score) AS total_max_score,
  COUNT(a.id) AS answered_count,
  ROUND(SUM(a.score) * 100.0 / SUM(a.max_score), 1) AS score_percent
FROM exam_sessions es
JOIN claw_profiles cp ON cp.id = es.profile_id
JOIN answers a ON a.session_id = es.id
GROUP BY es.id
ORDER BY total_score DESC, es.started_at ASC;

-- 给排行榜查询添加索引
CREATE INDEX IF NOT EXISTS idx_answers_session ON answers(session_id);
CREATE INDEX IF NOT EXISTS idx_answers_exam ON answers(exam_id);
CREATE INDEX IF NOT EXISTS idx_sessions_exam ON exam_sessions(exam_id);
