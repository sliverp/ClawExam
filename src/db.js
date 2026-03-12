import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATE_DIR = path.join(__dirname, '..', 'migrate-mysql');

// 创建连接池
const pool = mysql.createPool(config.mysql);

// 监听连接池事件，记录掉线和重连日志
pool.pool.on('connection', () => {
  console.log('[DB] 新连接已建立');
});
pool.pool.on('release', () => {
  // 连接归还，正常行为，不记录
});
pool.pool.on('enqueue', () => {
  console.warn('[DB] ⚠️ 连接池已满，请求排队等待中...');
});

/**
 * 判断是否为连接丢失类错误（可重试）
 */
function isRetryableError(err) {
  const retryableCodes = [
    'PROTOCOL_CONNECTION_LOST',   // 连接被服务端关闭
    'ECONNRESET',                 // 连接被重置
    'EPIPE',                      // 管道断裂
    'ETIMEDOUT',                  // 连接超时
    'ECONNREFUSED',               // 连接被拒绝（MySQL 可能在重启）
  ];
  // mysql2 的 fatal error 也包含在内
  if (retryableCodes.includes(err.code)) return true;
  // MySQL server has gone away
  if (err.errno === 2006 || err.errno === 2013) return true;
  if (err.message && /lost connection|gone away|connection closed/i.test(err.message)) return true;
  return false;
}

/**
 * 带自动重试的查询执行器
 * 当遇到连接丢失时自动重试一次
 */
async function executeWithRetry(fn, maxRetries = 1) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt < maxRetries && isRetryableError(err)) {
        console.warn(`[DB] ⚠️ 连接异常(${err.code || err.errno || err.message})，第 ${attempt + 1} 次重试...`);
        // 短暂等待后重试，让连接池有时间回收死连接
        await new Promise(r => setTimeout(r, 500));
        continue;
      }
      throw err;
    }
  }
}

/**
 * 封装数据库访问接口，统一使用 async/await
 * 对外暴露类似的 API：db.get(), db.all(), db.run(), db.exec()
 * 所有操作自带掉线重试机制
 */
const db = {
  /**
   * 查询单行（返回对象或 undefined）
   * @param {string} sql - SQL 语句（使用 ? 占位符）
   * @param {any[]} params - 参数数组
   */
  async get(sql, params = []) {
    return executeWithRetry(async () => {
      const [rows] = await pool.execute(sql, params);
      return rows[0] || undefined;
    });
  },

  /**
   * 查询多行（返回数组）
   */
  async all(sql, params = []) {
    return executeWithRetry(async () => {
      const [rows] = await pool.execute(sql, params);
      return rows;
    });
  },

  /**
   * 执行写操作（INSERT/UPDATE/DELETE），返回 { insertId, affectedRows, changedRows }
   */
  async run(sql, params = []) {
    return executeWithRetry(async () => {
      const [result] = await pool.execute(sql, params);
      return result;
    });
  },

  /**
   * 执行原始 SQL（支持多条语句，用于迁移）
   */
  async exec(sql) {
    // 使用 query 而非 execute，因为 execute 不支持多语句
    const conn = await pool.getConnection();
    try {
      await conn.query(sql);
    } finally {
      conn.release();
    }
  },

  /**
   * 事务执行
   * @param {function} fn - async (conn) => { ... } 事务内操作
   */
  async transaction(fn) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await fn({
        async get(sql, params = []) {
          const [rows] = await conn.query(sql, params);
          return rows[0] || undefined;
        },
        async all(sql, params = []) {
          const [rows] = await conn.query(sql, params);
          return rows;
        },
        async run(sql, params = []) {
          const [result] = await conn.query(sql, params);
          return result;
        },
      });
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  /** 获取底层连接池（高级用途） */
  pool,

  /** 关闭连接池 */
  async close() {
    await pool.end();
  },
};

// 启动时自动迁移
async function autoMigrate() {
  // 确保 migrations 表存在
  await db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  let applied = [];
  try {
    const rows = await db.all('SELECT name FROM migrations ORDER BY id');
    applied = rows.map(r => r.name);
  } catch {
    // 首次运行
  }

  if (!fs.existsSync(MIGRATE_DIR)) {
    console.log('  ⚠️  迁移目录不存在:', MIGRATE_DIR);
    return;
  }

  const files = fs.readdirSync(MIGRATE_DIR).filter(f => f.endsWith('.sql')).sort();
  let count = 0;
  for (const file of files) {
    if (applied.includes(file)) continue;
    const sql = fs.readFileSync(path.join(MIGRATE_DIR, file), 'utf-8');
    await db.exec(sql);
    await db.run('INSERT INTO migrations (name) VALUES (?)', [file]);
    count++;
    console.log(`  ▶ 迁移: ${file}`);
  }
  if (count > 0) console.log(`  ✅ 执行了 ${count} 个迁移`);
}

await autoMigrate();

export default db;
