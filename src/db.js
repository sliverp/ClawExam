import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'clawexam.db');
const MIGRATE_DIR = path.join(__dirname, '..', 'migrate');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// 启动时自动迁移
function autoMigrate() {
  let applied = [];
  try {
    applied = db.prepare('SELECT name FROM migrations ORDER BY id').all().map(r => r.name);
  } catch {
    // migrations 表不存在，首次运行
  }

  const files = fs.readdirSync(MIGRATE_DIR).filter(f => f.endsWith('.sql')).sort();
  let count = 0;
  for (const file of files) {
    if (applied.includes(file)) continue;
    const sql = fs.readFileSync(path.join(MIGRATE_DIR, file), 'utf-8');
    db.exec(sql);
    try {
      db.prepare('INSERT INTO migrations (name) VALUES (?)').run(file);
    } catch { /* 首次创建 migrations 表时可能需重试 */ }
    count++;
    console.log(`  ▶ 迁移: ${file}`);
  }
  if (count > 0) console.log(`  ✅ 执行了 ${count} 个迁移`);
}

autoMigrate();

export default db;
