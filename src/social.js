import { Router } from 'express';
import crypto from 'crypto';
import db from './db.js';
import { requireAuth } from './auth-middleware.js';
import { buildAvatarUrl } from './avatar.js';

const router = Router();

function attachAvatarUrls(req, rows = []) {
  return rows.map((row) => ({
    ...row,
    avatar_url: buildAvatarUrl(req, row.uid_hash),
  }));
}

// 生成 6 位随机短码（大写字母+数字，排除易混淆字符）
function generateShortCode(length = 6) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // 排除 0OIL1
  let code = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

// ===== 好友 =====

/**
 * POST /api/friends/add
 * 添加好友（双向）
 */
router.post('/friends/add', requireAuth, async (req, res) => {
  try {
    const { target_uid } = req.body;
    if (!target_uid) return res.status(400).json({ ok: false, error: '缺少 target_uid' });
    if (target_uid === req.user.uid_hash) return res.status(400).json({ ok: false, error: '不能加自己为好友' });

    // 验证目标用户存在
    const target = await db.get('SELECT uid_hash FROM users WHERE uid_hash = ?', [target_uid]);
    if (!target) return res.status(404).json({ ok: false, error: '目标用户不存在' });

    // 排序保证 user_a < user_b
    const [user_a, user_b] = [req.user.uid_hash, target_uid].sort();
    await db.run(
      'INSERT IGNORE INTO friendships (user_a, user_b, source) VALUES (?, ?, ?)',
      [user_a, user_b, req.body.source || 'share']
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('添加好友失败:', err);
    res.status(500).json({ ok: false, error: '添加失败' });
  }
});

/**
 * GET /api/friends/list
 * 好友列表
 */
router.get('/friends/list', requireAuth, async (req, res) => {
  try {
    const uid = req.user.uid_hash;
    const friends = await db.all(
      `SELECT u.uid_hash, u.nickname, u.avatar_url
       FROM users u
       WHERE u.uid_hash IN (
         SELECT user_b FROM friendships WHERE user_a = ?
         UNION
         SELECT user_a FROM friendships WHERE user_b = ?
       )`,
      [uid, uid]
    );
    res.json({ ok: true, friends: attachAvatarUrls(req, friends) });
  } catch (err) {
    console.error('获取好友列表失败:', err);
    res.status(500).json({ ok: false, error: '获取失败' });
  }
});

/**
 * GET /api/friends/leaderboard?exam_id=v1
 * 好友排行榜（包含自己）
 */
router.get('/friends/leaderboard', requireAuth, async (req, res) => {
  try {
    const uid = req.user.uid_hash;
    const examId = req.query.exam_id;
    if (!examId) return res.status(400).json({ ok: false, error: '缺少 exam_id' });

    // 查出好友 uid 列表
    const friendRows = await db.all(
      `SELECT user_b AS friend FROM friendships WHERE user_a = ?
       UNION
       SELECT user_a AS friend FROM friendships WHERE user_b = ?`,
      [uid, uid]
    );
    const friendUids = friendRows.map(r => r.friend);
    friendUids.push(uid); // 包含自己

    if (friendUids.length === 0) {
      return res.json({ ok: true, leaderboard: [] });
    }

    // 构建 IN 查询
    const placeholders = friendUids.map(() => '?').join(',');
    const leaderboard = await db.all(
      `SELECT es.id AS session_id, es.exam_id, es.owner_uid AS uid_hash,
              es.started_at,
              cp.claw_name, cp.model_name,
              u.nickname, u.avatar_url,
              COALESCE(SUM(a.score), 0) AS total_score,
              COALESCE(SUM(a.max_score), 0) AS total_max,
              COUNT(a.id) AS answered_count,
              CASE WHEN SUM(a.max_score) > 0
                THEN ROUND(SUM(a.score) * 100.0 / SUM(a.max_score), 1)
                ELSE 0 END AS best_percent,
              TIMESTAMPDIFF(SECOND, es.started_at, MAX(a.submitted_at)) AS best_duration
       FROM exam_sessions es
       JOIN claw_profiles cp ON cp.id = es.profile_id
       JOIN users u ON u.uid_hash = es.owner_uid
       LEFT JOIN answers a ON a.session_id = es.id
       WHERE es.exam_id = ? AND es.owner_uid IN (${placeholders})
       GROUP BY es.id
       HAVING answered_count > 0
       ORDER BY best_percent DESC, best_duration ASC`,
      [examId, ...friendUids]
    );

    // 添加排名和等级
    leaderboard.forEach((item, idx) => {
      item.rank = idx + 1;
      const pct = Number(item.best_percent || 0);
      item.grade = pct >= 95 ? 'S' : pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : pct >= 40 ? 'D' : 'F';
      item.is_me = item.uid_hash === uid;
    });

    res.json({ ok: true, leaderboard: attachAvatarUrls(req, leaderboard) });
  } catch (err) {
    console.error('获取好友排行榜失败:', err);
    res.status(500).json({ ok: false, error: '获取失败' });
  }
});

// ===== 竞技场 =====

/**
 * POST /api/arena/create
 * 创建竞技场
 */
router.post('/arena/create', requireAuth, async (req, res) => {
  try {
    const { exam_id, title } = req.body;
    if (!exam_id) return res.status(400).json({ ok: false, error: '缺少 exam_id' });

    const uid = req.user.uid_hash;
    const arenaTitle = title || `${req.user.nickname}的竞技场`;

    // 生成唯一短码（最多重试 5 次）
    let id;
    for (let i = 0; i < 5; i++) {
      id = generateShortCode(6);
      const existing = await db.get('SELECT id FROM arenas WHERE id = ?', [id]);
      if (!existing) break;
    }

    await db.transaction(async (conn) => {
      await conn.run(
        'INSERT INTO arenas (id, creator_uid, exam_id, title) VALUES (?, ?, ?, ?)',
        [id, uid, exam_id, arenaTitle]
      );
      // 创建者自动加入
      await conn.run(
        'INSERT INTO arena_participants (arena_id, uid_hash, status) VALUES (?, ?, ?)',
        [id, uid, 'joined']
      );
    });

    res.json({
      ok: true,
      arena: { id, exam_id, title: arenaTitle, creator_uid: uid }
    });
  } catch (err) {
    console.error('创建竞技场失败:', err);
    res.status(500).json({ ok: false, error: '创建失败' });
  }
});

/**
 * GET /api/arena/my
 * 我创建/参与的竞技场列表
 * 注意：必须在 /arena/:id 之前定义，否则 "my" 会被当作 :id 参数
 */
router.get('/arena/my', requireAuth, async (req, res) => {
  try {
    const uid = req.user.uid_hash;
    const arenas = await db.all(
      `SELECT a.*, u.nickname AS creator_name,
              (SELECT COUNT(*) FROM arena_participants WHERE arena_id = a.id) AS participant_count
       FROM arenas a
       JOIN users u ON u.uid_hash = a.creator_uid
       WHERE a.id IN (SELECT arena_id FROM arena_participants WHERE uid_hash = ?)
       ORDER BY a.created_at DESC`,
      [uid]
    );
    res.json({ ok: true, arenas });
  } catch (err) {
    console.error('获取竞技场列表失败:', err);
    res.status(500).json({ ok: false, error: '获取失败' });
  }
});

/**
 * GET /api/arena/:id
 * 竞技场详情 + 参与者排行（公开）
 */
router.get('/arena/:id', async (req, res) => {
  try {
    const arena = await db.get(
      `SELECT a.*, u.nickname AS creator_name, u.uid_hash AS creator_uid_hash
       FROM arenas a
       LEFT JOIN users u ON u.uid_hash = a.creator_uid
       WHERE a.id = ?`,
      [req.params.id]
    );
    if (!arena) return res.status(404).json({ ok: false, error: '竞技场不存在' });

    const participants = await db.all(
      `SELECT ap.*, u.nickname
       FROM arena_participants ap
       JOIN users u ON u.uid_hash = ap.uid_hash
       WHERE ap.arena_id = ?
       ORDER BY ap.score_percent DESC, ap.duration_seconds ASC`,
      [req.params.id]
    );

    // 添加排名
    participants.forEach((p, idx) => {
      p.rank = idx + 1;
    });

    res.json({
      ok: true,
      arena: {
        ...arena,
        creator_avatar: buildAvatarUrl(req, arena.creator_uid_hash),
      },
      participants: attachAvatarUrls(req, participants)
    });
  } catch (err) {
    console.error('获取竞技场详情失败:', err);
    res.status(500).json({ ok: false, error: '获取失败' });
  }
});

/**
 * POST /api/arena/:id/join
 * 加入竞技场
 */
router.post('/arena/:id/join', requireAuth, async (req, res) => {
  try {
    const arenaId = req.params.id;
    const arena = await db.get('SELECT id, status FROM arenas WHERE id = ?', [arenaId]);
    if (!arena) return res.status(404).json({ ok: false, error: '竞技场不存在' });
    if (arena.status === 'closed') return res.status(400).json({ ok: false, error: '竞技场已关闭' });

    // 检查是否已加入
    const existing = await db.get(
      'SELECT uid_hash FROM arena_participants WHERE arena_id = ? AND uid_hash = ?',
      [arenaId, req.user.uid_hash]
    );
    if (existing) {
      return res.json({ ok: true, message: '已经加入了' });
    }

    await db.run(
      'INSERT INTO arena_participants (arena_id, uid_hash, status) VALUES (?, ?, ?)',
      [arenaId, req.user.uid_hash, 'joined']
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('加入竞技场失败:', err);
    res.status(500).json({ ok: false, error: '加入失败' });
  }
});

export default router;
