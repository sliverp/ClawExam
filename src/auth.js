import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';
import { requireAuth } from './auth-middleware.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();

const WX_APPID = process.env.WX_APPID || '';
const WX_SECRET = process.env.WX_SECRET || '';
const UID_SALT = process.env.UID_SALT || 'clawexam-default-salt';

// 头像存储目录
const AVATAR_DIR = path.join(__dirname, '..', 'public', 'avatars');
if (!fs.existsSync(AVATAR_DIR)) {
  fs.mkdirSync(AVATAR_DIR, { recursive: true });
}

/**
 * 从 openid 计算 uid_hash（16位hex）
 */
function computeUidHash(openid) {
  return crypto.createHash('sha256').update(openid + UID_SALT).digest('hex').substring(0, 16);
}

/**
 * POST /api/wx-login
 * 微信登录注册
 * Body: { code, nickname, avatar_url }
 */
router.post('/wx-login', async (req, res) => {
  try {
    const { code, nickname, avatar_url } = req.body;
    if (!code) return res.status(400).json({ ok: false, error: '缺少 code' });
    if (!nickname || !nickname.trim()) return res.status(400).json({ ok: false, error: '缺少昵称' });

    // 调用微信 jscode2session 接口
    const wxUrl = `https://api.weixin.qq.com/sns/jscode2session?appid=${WX_APPID}&secret=${WX_SECRET}&js_code=${code}&grant_type=authorization_code`;
    const wxRes = await fetch(wxUrl);
    const wxData = await wxRes.json();

    if (wxData.errcode) {
      console.error('微信登录失败:', wxData);
      return res.status(400).json({ ok: false, error: '微信登录失败: ' + (wxData.errmsg || wxData.errcode) });
    }

    const { openid, session_key } = wxData;
    if (!openid) {
      return res.status(400).json({ ok: false, error: '微信登录失败: 未获取到 openid' });
    }

    const uid_hash = computeUidHash(openid);
    const app_token = uuidv4();

    // 查看用户是否已存在
    const existing = await db.get('SELECT uid_hash FROM users WHERE openid = ?', [openid]);

    if (existing) {
      // 更新现有用户
      await db.run(
        'UPDATE users SET session_key = ?, app_token = ?, nickname = ?, avatar_url = ?, updated_at = NOW() WHERE openid = ?',
        [session_key, app_token, nickname.trim(), avatar_url || '', openid]
      );
    } else {
      // 创建新用户
      await db.run(
        'INSERT INTO users (uid_hash, openid, session_key, app_token, nickname, avatar_url) VALUES (?, ?, ?, ?, ?, ?)',
        [uid_hash, openid, session_key, app_token, nickname.trim(), avatar_url || '']
      );
    }

    res.json({
      ok: true,
      app_token,
      uid_hash,
      nickname: nickname.trim(),
      avatar_url: avatar_url || ''
    });
  } catch (err) {
    console.error('wx-login 失败:', err);
    res.status(500).json({ ok: false, error: '登录失败: ' + err.message });
  }
});

/**
 * GET /api/user/me
 * 获取当前用户信息
 */
router.get('/user/me', requireAuth, (req, res) => {
  res.json({
    ok: true,
    user: req.user
  });
});

/**
 * PUT /api/user/me
 * 更新头像/昵称
 */
router.put('/user/me', requireAuth, async (req, res) => {
  try {
    const { nickname, avatar_url } = req.body;
    const updates = [];
    const params = [];

    if (nickname !== undefined) {
      updates.push('nickname = ?');
      params.push(nickname.trim());
    }
    if (avatar_url !== undefined) {
      updates.push('avatar_url = ?');
      params.push(avatar_url);
    }

    if (updates.length === 0) {
      return res.status(400).json({ ok: false, error: '没有要更新的字段' });
    }

    params.push(req.user.uid_hash);
    await db.run(`UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE uid_hash = ?`, params);

    const updated = await db.get('SELECT uid_hash, nickname, avatar_url FROM users WHERE uid_hash = ?', [req.user.uid_hash]);
    res.json({ ok: true, user: updated });
  } catch (err) {
    console.error('更新用户失败:', err);
    res.status(500).json({ ok: false, error: '更新失败' });
  }
});

/**
 * POST /api/upload/avatar
 * 上传头像图片（接收 multipart/form-data）
 */
router.post('/upload/avatar', requireAuth, async (req, res) => {
  try {
    // 使用 express 内置的 raw body（或 multer）来处理文件上传
    // 这里用简单方式：接收 raw buffer
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      const buffer = Buffer.concat(chunks);
      if (buffer.length === 0) {
        return res.status(400).json({ ok: false, error: '没有文件数据' });
      }
      if (buffer.length > 2 * 1024 * 1024) {
        return res.status(400).json({ ok: false, error: '文件过大（最大 2MB）' });
      }

      const filename = `${req.user.uid_hash}.jpg`;
      const filepath = path.join(AVATAR_DIR, filename);
      fs.writeFileSync(filepath, buffer);

      const url = `/avatars/${filename}`;
      res.json({ ok: true, url });
    });
  } catch (err) {
    console.error('头像上传失败:', err);
    res.status(500).json({ ok: false, error: '上传失败' });
  }
});

/**
 * GET /api/user/scores
 * 我的各试卷最佳成绩
 */
router.get('/user/scores', requireAuth, async (req, res) => {
  try {
    const scores = await db.all(
      'SELECT * FROM user_best_scores WHERE uid_hash = ? ORDER BY updated_at DESC',
      [req.user.uid_hash]
    );
    res.json({ ok: true, scores });
  } catch (err) {
    console.error('获取成绩失败:', err);
    res.status(500).json({ ok: false, error: '获取失败' });
  }
});

/**
 * GET /api/user/history
 * 我的所有考试记录
 */
router.get('/user/history', requireAuth, async (req, res) => {
  try {
    const history = await db.all(
      `SELECT es.id, es.exam_id, es.started_at, es.owner_uid, es.arena_id,
              cp.claw_name, cp.model_name,
              COALESCE(SUM(a.score), 0) AS total_score,
              COALESCE(SUM(a.max_score), 0) AS total_max,
              COUNT(a.id) AS answered_count
       FROM exam_sessions es
       JOIN claw_profiles cp ON cp.id = es.profile_id
       LEFT JOIN answers a ON a.session_id = es.id
       WHERE es.owner_uid = ?
       GROUP BY es.id
       ORDER BY es.started_at DESC
       LIMIT 50`,
      [req.user.uid_hash]
    );
    res.json({ ok: true, history });
  } catch (err) {
    console.error('获取历史记录失败:', err);
    res.status(500).json({ ok: false, error: '获取失败' });
  }
});

export default router;
