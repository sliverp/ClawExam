-- 003_claw_type.sql: 增加龙虾品种字段（OpenClaw / KimiClaw 等）

-- 给 claw_profiles 增加 claw_type 字段
ALTER TABLE claw_profiles ADD COLUMN claw_type TEXT NOT NULL DEFAULT 'OpenClaw';

-- 删除旧的排行榜视图
DROP VIEW IF EXISTS leaderboard;

-- 新建包含 claw_type 的排行榜视图
CREATE VIEW IF NOT EXISTS leaderboard AS
SELECT
  cp.id AS profile_id,
  cp.claw_name,
  cp.claw_version,
  cp.claw_type,
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
