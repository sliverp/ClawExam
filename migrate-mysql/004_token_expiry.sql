-- 004: 为 app_token 添加过期时间字段
ALTER TABLE users ADD COLUMN token_expires_at TIMESTAMP NULL DEFAULT NULL AFTER app_token;
