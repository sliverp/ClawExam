import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATE_DIR = path.join(__dirname, '..', 'migrate-mysql');

async function runMigrations() {
  const conn = await mysql.createConnection({
    ...config.mysql,
    multipleStatements: true,
  });

  console.log('🗄️  ClawExam 数据库迁移（MySQL）');
  console.log(`   MySQL: ${config.mysql.host}:${config.mysql.port}/${config.mysql.database}`);
  console.log(`   迁移目录: ${MIGRATE_DIR}`);

  // 确保 migrations 表存在
  await conn.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 获取已执行的迁移
  const [applied] = await conn.execute('SELECT name FROM migrations ORDER BY id');
  const appliedNames = applied.map(r => r.name);

  // 获取所有迁移文件
  const files = fs.readdirSync(MIGRATE_DIR).filter(f => f.endsWith('.sql')).sort();
  let count = 0;

  for (const file of files) {
    if (appliedNames.includes(file)) {
      console.log(`  ✓ ${file} (已执行)`);
      continue;
    }

    const sql = fs.readFileSync(path.join(MIGRATE_DIR, file), 'utf-8');
    console.log(`  ▶ 执行迁移: ${file}`);

    await conn.query(sql);
    await conn.execute('INSERT INTO migrations (name) VALUES (?)', [file]);

    count++;
    console.log(`  ✓ ${file} 完成`);
  }

  if (count === 0) {
    console.log('  数据库已是最新，无需迁移。');
  } else {
    console.log(`  共执行 ${count} 个迁移。`);
  }

  await conn.end();
  console.log('✅ 迁移完成');
}

runMigrations().catch(err => {
  console.error('❌ 迁移失败:', err.message);
  process.exit(1);
});
