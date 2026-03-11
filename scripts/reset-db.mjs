#!/usr/bin/env node
/**
 * ClawExam 数据库清理脚本 — 正式上线前清除所有测试数据
 *
 * 用法:
 *   node scripts/reset-db.mjs              # 交互确认后清理
 *   node scripts/reset-db.mjs --yes        # 跳过确认直接清理
 *   node scripts/reset-db.mjs --backup     # 清理前先备份（推荐）
 *   node scripts/reset-db.mjs --backup --yes
 *
 * 清理内容:
 *   1. 删除 answers 表所有数据
 *   2. 删除 exam_sessions 表所有数据
 *   3. 删除 claw_profiles 表所有数据
 *   4. 重置自增计数器
 *   5. 执行 VACUUM 压缩数据库文件
 *
 * 注意: 不会删除 migrations 表，不会改变表结构
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const skipConfirm = args.includes('--yes') || args.includes('-y');
const doBackup = args.includes('--backup') || args.includes('-b');

// 数据库路径（与 db.js 保持一致）
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'clawexam.db');

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function main() {
  console.log('========================================');
  console.log('  ClawExam 数据库清理工具');
  console.log('  正式上线前清除所有测试数据');
  console.log('========================================\n');

  // 检查数据库文件
  if (!fs.existsSync(dbPath)) {
    console.log(`数据库文件不存在: ${dbPath}`);
    console.log('无需清理，直接启动服务会自动创建新库。');
    process.exit(0);
  }

  const dbStat = fs.statSync(dbPath);
  console.log(`数据库路径: ${dbPath}`);
  console.log(`文件大小:   ${formatBytes(dbStat.size)}\n`);

  // 打开数据库并统计现有数据
  const db = new Database(dbPath, { readonly: false });
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const counts = {
    profiles: db.prepare('SELECT COUNT(*) AS c FROM claw_profiles').get().c,
    sessions: db.prepare('SELECT COUNT(*) AS c FROM exam_sessions').get().c,
    answers: db.prepare('SELECT COUNT(*) AS c FROM answers').get().c,
  };

  console.log('当前数据统计:');
  console.log(`  claw_profiles (注册信息):  ${counts.profiles} 条`);
  console.log(`  exam_sessions (考试会话):  ${counts.sessions} 条`);
  console.log(`  answers       (答题记录):  ${counts.answers} 条`);
  console.log();

  if (counts.profiles === 0 && counts.sessions === 0 && counts.answers === 0) {
    console.log('数据库已经是空的，无需清理。');
    db.close();
    process.exit(0);
  }

  // 确认
  if (!skipConfirm) {
    const answer = await ask('确认要删除以上所有数据吗？此操作不可逆！(yes/no): ');
    if (answer !== 'yes' && answer !== 'y') {
      console.log('已取消。');
      db.close();
      process.exit(0);
    }
  }

  // 备份
  if (doBackup) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupPath = dbPath.replace('.db', `-backup-${ts}.db`);
    console.log(`\n备份数据库到: ${backupPath}`);
    fs.copyFileSync(dbPath, backupPath);
    // 同时备份 WAL 文件（如果存在）
    if (fs.existsSync(dbPath + '-wal')) {
      fs.copyFileSync(dbPath + '-wal', backupPath + '-wal');
    }
    if (fs.existsSync(dbPath + '-shm')) {
      fs.copyFileSync(dbPath + '-shm', backupPath + '-shm');
    }
    console.log('备份完成。');
  }

  // 执行清理（按外键依赖顺序删除）
  console.log('\n开始清理...');

  const cleanup = db.transaction(() => {
    // 先关闭外键约束以确保顺利删除
    db.pragma('foreign_keys = OFF');

    const r1 = db.prepare('DELETE FROM answers').run();
    console.log(`  ✓ answers:       删除 ${r1.changes} 条`);

    const r2 = db.prepare('DELETE FROM exam_sessions').run();
    console.log(`  ✓ exam_sessions: 删除 ${r2.changes} 条`);

    const r3 = db.prepare('DELETE FROM claw_profiles').run();
    console.log(`  ✓ claw_profiles: 删除 ${r3.changes} 条`);

    // 重置自增计数器
    db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('answers')").run();
    console.log('  ✓ 自增计数器已重置');

    db.pragma('foreign_keys = ON');
  });

  cleanup();

  // VACUUM 压缩
  console.log('  ✓ 执行 VACUUM 压缩...');
  db.exec('VACUUM');

  db.close();

  const newStat = fs.statSync(dbPath);
  console.log(`\n清理完成！`);
  console.log(`  清理前: ${formatBytes(dbStat.size)}`);
  console.log(`  清理后: ${formatBytes(newStat.size)}`);
  console.log('\n数据库已清空，表结构和迁移记录保留。可以直接启动服务上线。');
}

main().catch(err => {
  console.error('清理失败:', err);
  process.exit(1);
});
