-- 003_social.sql: 社交功能（用户、好友、竞技场）

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  uid_hash     VARCHAR(16)  PRIMARY KEY,
  openid       VARCHAR(128) NOT NULL UNIQUE,
  session_key  VARCHAR(128),
  app_token    VARCHAR(128) UNIQUE,
  nickname     VARCHAR(64)  NOT NULL DEFAULT '',
  avatar_url   VARCHAR(512) DEFAULT '',
  created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_app_token (app_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 好友关系表（无向，存储时保证 user_a < user_b）
CREATE TABLE IF NOT EXISTS friendships (
  user_a     VARCHAR(16) NOT NULL,
  user_b     VARCHAR(16) NOT NULL,
  source     VARCHAR(32) DEFAULT 'share',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_a, user_b),
  INDEX idx_user_b (user_b)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 用户各试卷最佳成绩
CREATE TABLE IF NOT EXISTS user_best_scores (
  uid_hash        VARCHAR(16)  NOT NULL,
  exam_id         VARCHAR(32)  NOT NULL,
  best_session_id VARCHAR(64),
  best_score      DECIMAL(10,2) DEFAULT 0,
  best_max_score  DECIMAL(10,2) DEFAULT 0,
  best_percent    DECIMAL(5,2)  DEFAULT 0,
  best_duration   INT           DEFAULT 0,
  claw_name       VARCHAR(128)  DEFAULT '',
  model_name      VARCHAR(128)  DEFAULT '',
  grade           VARCHAR(8)    DEFAULT '',
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (uid_hash, exam_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 竞技场
CREATE TABLE IF NOT EXISTS arenas (
  id          VARCHAR(8)   PRIMARY KEY,
  creator_uid VARCHAR(16)  NOT NULL,
  exam_id     VARCHAR(32)  NOT NULL,
  title       VARCHAR(128) DEFAULT '',
  status      ENUM('open','closed') DEFAULT 'open',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_creator (creator_uid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 竞技场参与者
CREATE TABLE IF NOT EXISTS arena_participants (
  arena_id         VARCHAR(8)   NOT NULL,
  uid_hash         VARCHAR(16)  NOT NULL,
  session_id       VARCHAR(64),
  score            DECIMAL(10,2) DEFAULT 0,
  max_score        DECIMAL(10,2) DEFAULT 0,
  score_percent    DECIMAL(5,2)  DEFAULT 0,
  duration_seconds INT           DEFAULT 0,
  claw_name        VARCHAR(128)  DEFAULT '',
  model_name       VARCHAR(128)  DEFAULT '',
  grade            VARCHAR(8)    DEFAULT '',
  status           ENUM('joined','finished') DEFAULT 'joined',
  joined_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  finished_at      TIMESTAMP NULL,
  PRIMARY KEY (arena_id, uid_hash),
  INDEX idx_arena (arena_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- exam_sessions 新增字段
ALTER TABLE exam_sessions
  ADD COLUMN owner_uid VARCHAR(16) NULL AFTER exam_id,
  ADD COLUMN arena_id  VARCHAR(8)  NULL AFTER owner_uid,
  ADD INDEX idx_owner_uid (owner_uid),
  ADD INDEX idx_arena_id (arena_id);
