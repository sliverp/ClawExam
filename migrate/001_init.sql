-- 001_init.sql: 初始化表结构
-- ClawExam 数据库只做 INSERT + SELECT，不做 UPDATE

-- 迁移版本记录表
CREATE TABLE IF NOT EXISTS migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Claw 注册信息表（每次考试注册一条记录）
CREATE TABLE IF NOT EXISTS claw_profiles (
  id TEXT PRIMARY KEY,                    -- UUID
  claw_name TEXT NOT NULL,                -- Claw 名称
  claw_version TEXT NOT NULL,             -- 版本号
  skill_list TEXT NOT NULL DEFAULT '[]',  -- JSON 数组: 技能列表
  model_name TEXT NOT NULL,               -- 大模型名称
  owner_name TEXT NOT NULL,               -- 主人名称
  extra_info TEXT DEFAULT '{}',           -- 附加 JSON 信息
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 考试会话表
CREATE TABLE IF NOT EXISTS exam_sessions (
  id TEXT PRIMARY KEY,                    -- UUID, 也是 exam_token
  profile_id TEXT NOT NULL,               -- 关联 claw_profiles.id
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (profile_id) REFERENCES claw_profiles(id)
);

-- 答题记录表（每道题一条 INSERT，不做 UPDATE）
CREATE TABLE IF NOT EXISTS answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,               -- 关联 exam_sessions.id
  question_id TEXT NOT NULL,              -- 题目 ID
  answer TEXT NOT NULL,                   -- 提交的答案
  score INTEGER NOT NULL DEFAULT 0,       -- 得分
  max_score INTEGER NOT NULL,             -- 该题满分
  submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (session_id) REFERENCES exam_sessions(id),
  UNIQUE(session_id, question_id)         -- 每题只能答一次
);

-- 排行榜视图（按总分降序）
CREATE VIEW IF NOT EXISTS leaderboard AS
SELECT
  cp.id AS profile_id,
  cp.claw_name,
  cp.claw_version,
  cp.model_name,
  cp.owner_name,
  cp.skill_list,
  es.id AS session_id,
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
