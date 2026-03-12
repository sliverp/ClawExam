#!/usr/bin/env node
/**
 * SQLite → MySQL 数据迁移脚本
 *
 * 使用方法：
 *   1. 确保 MySQL 已创建目标数据库（如 clawexam）
 *   2. 确保 MySQL 中的表结构已通过 migrate-mysql/001_init.sql 创建
 *      （可以先运行 npm run migrate）
 *   3. 运行此脚本：
 *      node scripts/sqlite-to-mysql.js [sqlite_db_path]
 *
 * 环境变量（也可在 src/config.js 中配置）：
 *   MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE
 *   SQLITE_PATH — SQLite 数据库文件路径（默认: data/clawexam.db）
 */

import Database from 'better-sqlite3';
import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../src/config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SQLITE_PATH = process.argv[2] || process.env.SQLITE_PATH || path.join(__dirname, '..', 'data', 'clawexam.db');

async function migrate() {
  console.log('🔄 SQLite → MySQL 数据迁移');
  console.log(`   SQLite: ${SQLITE_PATH}`);
  console.log(`   MySQL:  ${config.mysql.host}:${config.mysql.port}/${config.mysql.database}`);
  console.log('');

  // 打开 SQLite
  const sqlite = new Database(SQLITE_PATH, { readonly: true });
  sqlite.pragma('journal_mode = WAL');

  // 连接 MySQL
  const conn = await mysql.createConnection({
    ...config.mysql,
    multipleStatements: true,
  });

  // 1. 迁移 claw_profiles
  console.log('📋 迁移 claw_profiles...');
  const profiles = sqlite.prepare('SELECT * FROM claw_profiles').all();
  if (profiles.length > 0) {
    let inserted = 0;
    for (const p of profiles) {
      try {
        await conn.execute(
          `INSERT IGNORE INTO claw_profiles (id, claw_name, claw_version, claw_type, skill_list, model_name, owner_name, extra_info, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [p.id, p.claw_name, p.claw_version, p.claw_type || 'OpenClaw',
           p.skill_list || '[]', p.model_name, p.owner_name || '',
           p.extra_info || '{}', p.created_at]
        );
        inserted++;
      } catch (err) {
        console.warn(`  ⚠️ 跳过 profile ${p.id}: ${err.message}`);
      }
    }
    console.log(`  ✅ ${inserted}/${profiles.length} 条记录`);
  } else {
    console.log('  (空表)');
  }

  // 2. 迁移 exam_sessions
  console.log('📋 迁移 exam_sessions...');
  const sessions = sqlite.prepare('SELECT * FROM exam_sessions').all();
  if (sessions.length > 0) {
    let inserted = 0;
    for (const s of sessions) {
      try {
        await conn.execute(
          `INSERT IGNORE INTO exam_sessions (id, profile_id, exam_id, started_at)
           VALUES (?, ?, ?, ?)`,
          [s.id, s.profile_id, s.exam_id || 'v1', s.started_at]
        );
        inserted++;
      } catch (err) {
        console.warn(`  ⚠️ 跳过 session ${s.id}: ${err.message}`);
      }
    }
    console.log(`  ✅ ${inserted}/${sessions.length} 条记录`);
  } else {
    console.log('  (空表)');
  }

  // 3. 迁移 answers
  console.log('📋 迁移 answers...');
  const answers = sqlite.prepare('SELECT * FROM answers').all();
  if (answers.length > 0) {
    let inserted = 0;
    // 批量插入，每 100 条一批
    const BATCH = 100;
    for (let i = 0; i < answers.length; i += BATCH) {
      const batch = answers.slice(i, i + BATCH);
      for (const a of batch) {
        try {
          await conn.execute(
            `INSERT IGNORE INTO answers (session_id, question_id, answer, score, max_score, exam_id, submitted_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [a.session_id, a.question_id, a.answer, a.score, a.max_score,
             a.exam_id || 'v1', a.submitted_at]
          );
          inserted++;
        } catch (err) {
          console.warn(`  ⚠️ 跳过 answer ${a.session_id}/${a.question_id}: ${err.message}`);
        }
      }
      if (i + BATCH < answers.length) {
        process.stdout.write(`  进度: ${Math.min(i + BATCH, answers.length)}/${answers.length}\r`);
      }
    }
    console.log(`  ✅ ${inserted}/${answers.length} 条记录`);
  } else {
    console.log('  (空表)');
  }

  // 4. 迁移 session_questions
  console.log('📋 迁移 session_questions...');
  let sessionQuestions = [];
  try {
    sessionQuestions = sqlite.prepare('SELECT * FROM session_questions').all();
  } catch {
    console.log('  (表不存在，跳过)');
  }
  if (sessionQuestions.length > 0) {
    let inserted = 0;
    for (const sq of sessionQuestions) {
      try {
        await conn.execute(
          `INSERT IGNORE INTO session_questions (session_id, question_id, seq)
           VALUES (?, ?, ?)`,
          [sq.session_id, sq.question_id, sq.seq]
        );
        inserted++;
      } catch (err) {
        console.warn(`  ⚠️ 跳过 sq ${sq.session_id}/${sq.question_id}: ${err.message}`);
      }
    }
    console.log(`  ✅ ${inserted}/${sessionQuestions.length} 条记录`);
  } else {
    console.log('  (空表)');
  }

  // 汇总
  console.log('');
  console.log('📊 迁移汇总:');
  console.log(`   claw_profiles:    ${profiles.length} 条`);
  console.log(`   exam_sessions:    ${sessions.length} 条`);
  console.log(`   answers:          ${answers.length} 条`);
  console.log(`   session_questions: ${sessionQuestions.length} 条`);
  console.log('');
  console.log('✅ 数据迁移完成！');

  sqlite.close();
  await conn.end();
}

migrate().catch(err => {
  console.error('❌ 迁移失败:', err);
  process.exit(1);
});
