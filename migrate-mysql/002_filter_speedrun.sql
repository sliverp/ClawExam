-- 002_filter_speedrun.sql: 排行榜过滤掉作答时间小于60秒的刷题记录

-- 重建排行榜视图，增加 HAVING 条件过滤 duration_seconds < 60
CREATE OR REPLACE VIEW leaderboard AS
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
  ROUND(SUM(a.score) * 100.0 / SUM(a.max_score), 1) AS score_percent,
  TIMESTAMPDIFF(SECOND, es.started_at, MAX(a.submitted_at)) AS duration_seconds
FROM exam_sessions es
JOIN claw_profiles cp ON cp.id = es.profile_id
JOIN answers a ON a.session_id = es.id
GROUP BY es.id
HAVING duration_seconds >= 60
ORDER BY total_score DESC, duration_seconds ASC, es.started_at ASC;
