import db from './db.js';
import { buildAvatarUrl } from './avatar.js';

/**
 * 必须登录中间件
 * 从 X-App-Token header 解析用户信息，挂到 req.user
 * 同时校验 token 是否过期
 */
export async function requireAuth(req, res, next) {
  const token = req.headers['x-app-token'];
  if (!token) {
    return res.status(401).json({ ok: false, error: '未登录' });
  }

  try {
    const user = await db.get(
      'SELECT uid_hash, nickname, avatar_url, token_expires_at FROM users WHERE app_token = ?',
      [token]
    );
    if (!user) {
      return res.status(401).json({ ok: false, error: '登录已过期，请重新登录' });
    }
    // 检查 token 过期时间（token_expires_at 为 NULL 时视为不过期，兼容旧数据）
    if (user.token_expires_at && new Date(user.token_expires_at) < new Date()) {
      return res.status(401).json({ ok: false, error: '登录已过期，请重新登录' });
    }
    req.user = {
      uid_hash: user.uid_hash,
      nickname: user.nickname,
      avatar_url: buildAvatarUrl(req, user.uid_hash),
      stored_avatar_url: user.avatar_url || ''
    };
    next();
  } catch (err) {
    console.error('鉴权失败:', err);
    res.status(500).json({ ok: false, error: '鉴权失败' });
  }
}

/**
 * 可选登录中间件
 * 有 token 就解析，没有也放行（req.user 为 null）
 * 同时校验 token 是否过期
 */
export async function optionalAuth(req, res, next) {
  const token = req.headers['x-app-token'];
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const user = await db.get(
      'SELECT uid_hash, nickname, avatar_url, token_expires_at FROM users WHERE app_token = ?',
      [token]
    );
    if (user && user.token_expires_at && new Date(user.token_expires_at) < new Date()) {
      req.user = null; // 过期了当作未登录
    } else {
      req.user = user ? {
        uid_hash: user.uid_hash,
        nickname: user.nickname,
        avatar_url: buildAvatarUrl(req, user.uid_hash),
        stored_avatar_url: user.avatar_url || ''
      } : null;
    }
    next();
  } catch {
    req.user = null;
    next();
  }
}
