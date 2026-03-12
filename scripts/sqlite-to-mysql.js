#!/usr/bin/env node
/**
 * SQLite → MySQL 数据迁移脚本（独立运行版）
 *
 * 特性：
 *   - 自包含，不依赖项目其他模块，可直接拷贝到老服务器运行
 *   - 幂等：使用 INSERT IGNORE，可多次运行不会产生重复数据
 *   - 只读 SQLite，不影响正在运行的服务
 *   - 自动建表（如果 MySQL 还没有表结构）
 *   - 自动处理 SQLite 与 MySQL 的字段差异（缺失字段自动填充默认值）
 *
 * 前置条件：
 *   - 老服务器上需安装 Node.js >= 18
 *   - npm install better-sqlite3 mysql2
 *
 * 使用方法：
 *   node sqlite-to-mysql.js [sqlite_db_path]
 *
 *   sqlite_db_path 默认为同级 ../data/clawexam.db
 */

import Database from 'better-sqlite3';
import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================
//  ★★★ 在这里配置 MySQL 连接信息 ★★★
// ============================================================
const MYSQL_CONFIG = {
  host:     process.env.MYSQL_HOST     || '127.0.0.1',
  port:     parseInt(process.env.MYSQL_PORT || '3306', 10),
  user:     process.env.MYSQL_USER     || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'clawexam',
  charset:  'utf8mb4',
  timezone: '+00:00',
  multipleStatements: true,
  connectTimeout: 10000,
};

// SQLite 路径：命令行参数 > 环境变量 > 默认路径
const SQLITE_PATH = process.argv[2]
  || process.env.SQLITE_PATH
  || path.join(__dirname, '..', 'data', 'clawexam.db');

// ============================================================
//  MySQL 建表 DDL（与 migrate-mysql/001_init.sql 一致）
//  使用 IF NOT EXISTS，已有表不会受影响
// ============================================================
const MYSQL_DDL = `
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

CREATE TABLE IF NOT EXISTS exam_sessions (
  id VARCHAR(36) PRIMARY KEY,
  profile_id VARCHAR(36) NOT NULL,
  exam_id VARCHAR(50) NOT NULL DEFAULT 'v1',
  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES claw_profiles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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

CREATE TABLE IF NOT EXISTS session_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL,
  question_id VARCHAR(100) NOT NULL,
  seq INT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES exam_sessions(id),
  UNIQUE KEY uq_sq_session_question (session_id, question_id),
  UNIQUE KEY uq_sq_session_seq (session_id, seq)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

// ============================================================
//  辅助函数
// ============================================================

/** 检查 SQLite 表是否存在 */
function sqliteTableExists(sqlite, tableName) {
  const row = sqlite.prepare(
    "SELECT COUNT(*) AS cnt FROM sqlite_master WHERE type='table' AND name=?"
  ).get(tableName);
  return row.cnt > 0;
}

/** 获取 SQLite 表的列名列表 */
function sqliteColumnNames(sqlite, tableName) {
  const cols = sqlite.prepare(`PRAGMA table_info(${tableName})`).all();
  return cols.map(c => c.name);
}

/** 格式化耗时 */
function elapsed(startMs) {
  return `${((Date.now() - startMs) / 1000).toFixed(1)}s`;
}

// ============================================================
//  迁移主流程
// ============================================================
async function migrate() {
  const t0 = Date.now();

  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║       SQLite → MySQL 数据迁移工具 v2.0          ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  SQLite:  ${SQLITE_PATH}`);
  console.log(`  MySQL:   ${MYSQL_CONFIG.user}@${MYSQL_CONFIG.host}:${MYSQL_CONFIG.port}/${MYSQL_CONFIG.database}`);
  console.log('');

  // ---- 打开 SQLite（只读模式，不影响正在运行的服务） ----
  const sqlite = new Database(SQLITE_PATH, { readonly: true, fileMustExist: true });
  sqlite.pragma('journal_mode = WAL');
  console.log('  ✓ SQLite 已连接（只读模式）');

  // ---- 连接 MySQL ----
  const conn = await mysql.createConnection(MYSQL_CONFIG);
  console.log('  ✓ MySQL 已连接');
  console.log('');

  // ---- 自动建表 ----
  console.log('📦 检查/创建 MySQL 表结构...');
  await conn.query(MYSQL_DDL);
  console.log('  ✓ 表结构就绪');
  console.log('');

  // ---- 统计汇总 ----
  const summary = {};

  // ========== 1. claw_profiles ==========
  {
    console.log('── claw_profiles ──');
    if (!sqliteTableExists(sqlite, 'claw_profiles')) {
      console.log('  (SQLite 中不存在该表，跳过)');
      summary.claw_profiles = { total: 0, inserted: 0, skipped: 0 };
    } else {
      const cols = sqliteColumnNames(sqlite, 'claw_profiles');
      const hasCrawType = cols.includes('claw_type');
      const rows = sqlite.prepare('SELECT * FROM claw_profiles').all();
      let inserted = 0, skipped = 0;

      for (const p of rows) {
        try {
          const [result] = await conn.execute(
            `INSERT IGNORE INTO claw_profiles
             (id, claw_name, claw_version, claw_type, skill_list, model_name, owner_name, extra_info, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              p.id,
              p.claw_name,
              p.claw_version,
              hasCrawType ? (p.claw_type || 'OpenClaw') : 'OpenClaw',
              p.skill_list || '[]',
              p.model_name,
              p.owner_name || '',
              p.extra_info || null,
              p.created_at,
            ]
          );
          if (result.affectedRows > 0) inserted++; else skipped++;
        } catch (err) {
          console.warn(`  ⚠ 跳过 profile ${p.id}: ${err.message}`);
          skipped++;
        }
      }
      console.log(`  总计 ${rows.length} 条 → 新增 ${inserted}, 已存在跳过 ${skipped}`);
      summary.claw_profiles = { total: rows.length, inserted, skipped };
    }
  }

  // ========== 2. exam_sessions ==========
  {
    console.log('── exam_sessions ──');
    if (!sqliteTableExists(sqlite, 'exam_sessions')) {
      console.log('  (SQLite 中不存在该表，跳过)');
      summary.exam_sessions = { total: 0, inserted: 0, skipped: 0 };
    } else {
      const cols = sqliteColumnNames(sqlite, 'exam_sessions');
      const hasExamId = cols.includes('exam_id');
      const rows = sqlite.prepare('SELECT * FROM exam_sessions').all();
      let inserted = 0, skipped = 0;

      for (const s of rows) {
        try {
          const [result] = await conn.execute(
            `INSERT IGNORE INTO exam_sessions (id, profile_id, exam_id, started_at)
             VALUES (?, ?, ?, ?)`,
            [
              s.id,
              s.profile_id,
              hasExamId ? (s.exam_id || 'v1') : 'v1',
              s.started_at,
            ]
          );
          if (result.affectedRows > 0) inserted++; else skipped++;
        } catch (err) {
          console.warn(`  ⚠ 跳过 session ${s.id}: ${err.message}`);
          skipped++;
        }
      }
      console.log(`  总计 ${rows.length} 条 → 新增 ${inserted}, 已存在跳过 ${skipped}`);
      summary.exam_sessions = { total: rows.length, inserted, skipped };
    }
  }

  // ========== 3. answers ==========
  {
    console.log('── answers ──');
    if (!sqliteTableExists(sqlite, 'answers')) {
      console.log('  (SQLite 中不存在该表，跳过)');
      summary.answers = { total: 0, inserted: 0, skipped: 0 };
    } else {
      const cols = sqliteColumnNames(sqlite, 'answers');
      const hasExamId = cols.includes('exam_id');
      const rows = sqlite.prepare('SELECT * FROM answers').all();
      let inserted = 0, skipped = 0;
      const BATCH = 50;

      for (let i = 0; i < rows.length; i += BATCH) {
        const batch = rows.slice(i, i + BATCH);
        for (const a of batch) {
          try {
            const [result] = await conn.execute(
              `INSERT IGNORE INTO answers
               (session_id, question_id, answer, score, max_score, exam_id, submitted_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                a.session_id,
                a.question_id,
                a.answer,
                a.score,
                a.max_score,
                hasExamId ? (a.exam_id || 'v1') : 'v1',
                a.submitted_at,
              ]
            );
            if (result.affectedRows > 0) inserted++; else skipped++;
          } catch (err) {
            console.warn(`  ⚠ 跳过 answer ${a.session_id}/${a.question_id}: ${err.message}`);
            skipped++;
          }
        }
        process.stdout.write(`  进度: ${Math.min(i + BATCH, rows.length)}/${rows.length}\r`);
      }
      console.log(`  总计 ${rows.length} 条 → 新增 ${inserted}, 已存在跳过 ${skipped}`);
      summary.answers = { total: rows.length, inserted, skipped };
    }
  }

  // ========== 4. session_questions ==========
  {
    console.log('── session_questions ──');
    if (!sqliteTableExists(sqlite, 'session_questions')) {
      console.log('  (SQLite 中不存在该表，跳过)');
      summary.session_questions = { total: 0, inserted: 0, skipped: 0 };
    } else {
      const rows = sqlite.prepare('SELECT * FROM session_questions').all();
      let inserted = 0, skipped = 0;

      for (const sq of rows) {
        try {
          const [result] = await conn.execute(
            `INSERT IGNORE INTO session_questions (session_id, question_id, seq)
             VALUES (?, ?, ?)`,
            [sq.session_id, sq.question_id, sq.seq]
          );
          if (result.affectedRows > 0) inserted++; else skipped++;
        } catch (err) {
          console.warn(`  ⚠ 跳过 sq ${sq.session_id}/${sq.question_id}: ${err.message}`);
          skipped++;
        }
      }
      console.log(`  总计 ${rows.length} 条 → 新增 ${inserted}, 已存在跳过 ${skipped}`);
      summary.session_questions = { total: rows.length, inserted, skipped };
    }
  }

  // ========== 汇总 ==========
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║                   迁移汇总                       ║');
  console.log('╠══════════════════════════════════════════════════╣');
  for (const [table, s] of Object.entries(summary)) {
    const line = `  ${table.padEnd(22)} 总${String(s.total).padStart(5)} | 新增${String(s.inserted).padStart(5)} | 跳过${String(s.skipped).padStart(5)}`;
    console.log(line);
  }
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`  耗时: ${elapsed(t0)}`);
  console.log('');

  const totalInserted = Object.values(summary).reduce((sum, s) => sum + s.inserted, 0);
  const totalSkipped = Object.values(summary).reduce((sum, s) => sum + s.skipped, 0);

  if (totalInserted > 0) {
    console.log(`✅ 迁移完成！共新增 ${totalInserted} 条记录。`);
  } else if (totalSkipped > 0) {
    console.log('✅ 所有数据已存在，无需迁移（可安全重复运行）。');
  } else {
    console.log('ℹ️  SQLite 中无数据，无需迁移。');
  }

  sqlite.close();
  await conn.end();
}

migrate().catch(err => {
  console.error('');
  console.error('❌ 迁移失败:', err.message);
  if (err.code === 'SQLITE_CANTOPEN') {
    console.error(`   SQLite 文件不存在或无法访问: ${SQLITE_PATH}`);
  } else if (err.code === 'ECONNREFUSED') {
    console.error(`   无法连接 MySQL: ${MYSQL_CONFIG.host}:${MYSQL_CONFIG.port}`);
  } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
    console.error(`   MySQL 认证失败，请检查用户名密码`);
  }
  process.exit(1);
});
