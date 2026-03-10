import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'clawexam.db');
const MIGRATE_DIR = path.join(__dirname, '..', 'migrate');

// 确保 data 目录存在
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH, { verbose: process.env.DEBUG ? console.log : undefined });
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// 获取已执行的迁移
function getAppliedMigrations() {
  try {
    return db.prepare('SELECT name FROM migrations ORDER BY id').all().map(r => r.name);
  } catch {
    // migrations 表不存在，返回空
    return [];
  }
}

// 获取所有迁移文件（按文件名排序）
function getMigrationFiles() {
  return fs.readdirSync(MIGRATE_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();
}

// 执行迁移
function runMigrations() {
  const applied = getAppliedMigrations();
  const files = getMigrationFiles();
  let count = 0;

  for (const file of files) {
    if (applied.includes(file)) {
      console.log(`  ✓ ${file} (已执行)`);
      continue;
    }

    const sql = fs.readFileSync(path.join(MIGRATE_DIR, file), 'utf-8');
    console.log(`  ▶ 执行迁移: ${file}`);

    db.exec(sql);

    // 记录迁移（migrations 表由第一个迁移脚本创建）
    try {
      db.prepare('INSERT INTO migrations (name) VALUES (?)').run(file);
    } catch {
      // 如果 migrations 表刚被创建，重试
      db.prepare('INSERT INTO migrations (name) VALUES (?)').run(file);
    }

    count++;
    console.log(`  ✓ ${file} 完成`);
  }

  if (count === 0) {
    console.log('  数据库已是最新，无需迁移。');
  } else {
    console.log(`  共执行 ${count} 个迁移。`);
  }
}

console.log('🗄️  ClawExam 数据库迁移');
console.log(`   数据库: ${DB_PATH}`);
console.log(`   迁移目录: ${MIGRATE_DIR}`);
runMigrations();
db.close();
console.log('✅ 迁移完成');
