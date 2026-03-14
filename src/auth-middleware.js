import db from './db.js';

/**
 * 必须登录中间件
 * 从 X-App-Token header 解析用户信息，挂到 req.user
 */
export async function requireAuth(req, res, next) {
  const token = req.headers['x-app-token'];
  if (!token) {
    return res.status(401).json({ ok: false, error: '未登录' });
  }

  try {
    const user = await db.get(
      'SELECT uid_hash, nickname, avatar_url FROM users WHERE app_token = ?',
      [token]
    );
    if (!user) {
      return res.status(401).json({ ok: false, error: '登录已过期，请重新登录' });
    }
    req.user = user;
    next();
  } catch (err) {
    console.error('鉴权失败:', err);
    res.status(500).json({ ok: false, error: '鉴权失败' });
  }
}

/**
 * 可选登录中间件
 * 有 token 就解析，没有也放行（req.user 为 null）
 */
export async function optionalAuth(req, res, next) {
  const token = req.headers['x-app-token'];
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const user = await db.get(
      'SELECT uid_hash, nickname, avatar_url FROM users WHERE app_token = ?',
      [token]
    );
    req.user = user || null;
    next();
  } catch {
    req.user = null;
    next();
  }
}
