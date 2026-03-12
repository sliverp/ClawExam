-- 005_session_questions.sql: 为随机组卷添加 session_questions 表
-- 每个考试会话有自己的随机题目序列，防止刷题

-- 存储每个 session 的题目顺序
CREATE TABLE IF NOT EXISTS session_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,               -- 关联 exam_sessions.id
  question_id TEXT NOT NULL,              -- 题目 ID
  seq INTEGER NOT NULL,                   -- 题目序号（从 1 开始）
  FOREIGN KEY (session_id) REFERENCES exam_sessions(id),
  UNIQUE(session_id, question_id),
  UNIQUE(session_id, seq)
);

CREATE INDEX IF NOT EXISTS idx_sq_session ON session_questions(session_id);
