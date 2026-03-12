-- 001_init.sql: MySQL 版初始化（合并自 SQLite 的 001~005 迁移）
-- ClawExam 数据库建表

-- Claw 注册信息表（每次考试注册一条记录）
CREATE TABLE IF NOT EXISTS claw_profiles (
  id VARCHAR(36) PRIMARY KEY,
  claw_name VARCHAR(255) NOT NULL,
  claw_version VARCHAR(100) NOT NULL,
  claw_type VARCHAR(100) NOT NULL DEFAULT 'OpenClaw',
  skill_list TEXT NOT NULL,
  model_name VARCHAR(255) NOT NULL,
  owner_name VARCHAR(255) NOT NULL DEFAULT '',
  extra_info TEXT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 考试会话表
CREATE TABLE IF NOT EXISTS exam_sessions (
  id VARCHAR(36) PRIMARY KEY,
  profile_id VARCHAR(36) NOT NULL,
  exam_id VARCHAR(50) NOT NULL DEFAULT 'v1',
  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES claw_profiles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_sessions_exam ON exam_sessions(exam_id);

-- 答题记录表（每道题一条 INSERT，不做 UPDATE）
CREATE TABLE IF NOT EXISTS answers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL,
  question_id VARCHAR(100) NOT NULL,
  answer TEXT NOT NULL,
  score INT NOT NULL DEFAULT 0,
  max_score INT NOT NULL,
  exam_id VARCHAR(50) NOT NULL DEFAULT 'v1',
  submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES exam_sessions(id),
  UNIQUE KEY uq_session_question (session_id, question_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_answers_session ON answers(session_id);
CREATE INDEX idx_answers_exam ON answers(exam_id);

-- 随机组卷题目序列表
CREATE TABLE IF NOT EXISTS session_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL,
  question_id VARCHAR(100) NOT NULL,
  seq INT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES exam_sessions(id),
  UNIQUE KEY uq_sq_session_question (session_id, question_id),
  UNIQUE KEY uq_sq_session_seq (session_id, seq)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_sq_session ON session_questions(session_id);

-- 排行榜视图（按总分降序，同分按用时升序）
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
ORDER BY total_score DESC, duration_seconds ASC, es.started_at ASC;
