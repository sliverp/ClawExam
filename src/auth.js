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

const TOKEN_TTL_DAYS = 14;

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

    // 每次登录都生成新 token 并设置过期时间
    const app_token = uuidv4();
    const existing = await db.get('SELECT uid_hash FROM users WHERE openid = ?', [openid]);

    if (existing) {
      await db.run(
        'UPDATE users SET session_key = ?, app_token = ?, token_expires_at = DATE_ADD(NOW(), INTERVAL ? DAY), nickname = ?, avatar_url = ?, updated_at = NOW() WHERE openid = ?',
        [session_key, app_token, TOKEN_TTL_DAYS, nickname.trim(), avatar_url || '', openid]
      );
    } else {
      await db.run(
        'INSERT INTO users (uid_hash, openid, session_key, app_token, token_expires_at, nickname, avatar_url) VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY), ?, ?)',
        [uid_hash, openid, session_key, app_token, TOKEN_TTL_DAYS, nickname.trim(), avatar_url || '']
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
 * 校验图片 magic bytes
 */
function isValidImage(buffer) {
  if (buffer.length < 4) return false;
  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return 'image/jpeg';
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return 'image/png';
  // GIF: 47 49 46
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return 'image/gif';
  // WebP: 52 49 46 46 ... 57 45 42 50
  if (buffer.length >= 12 && buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46
      && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) return 'image/webp';
  return false;
}

/**
 * POST /api/upload/avatar
 * 上传头像图片（接收 multipart/form-data）
 */
router.post('/upload/avatar', requireAuth, async (req, res) => {
  try {
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

      const mimeType = isValidImage(buffer);
      if (!mimeType) {
        return res.status(400).json({ ok: false, error: '不支持的图片格式，仅支持 JPEG/PNG/GIF/WebP' });
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
