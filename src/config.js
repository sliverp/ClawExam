/**
 * ClawExam 配置文件
 * 优先使用环境变量，其次使用默认值
 *
 * 环境变量说明：
 *   MYSQL_HOST     - MySQL 主机地址（默认: 127.0.0.1）
 *   MYSQL_PORT     - MySQL 端口（默认: 3306）
 *   MYSQL_USER     - MySQL 用户名（默认: root）
 *   MYSQL_PASSWORD - MySQL 密码（默认: 空）
 *   MYSQL_DATABASE - MySQL 数据库名（默认: clawexam）
 *   MYSQL_CHARSET  - MySQL 字符集（默认: utf8mb4）
 *   MYSQL_POOL_MIN - 连接池最小连接数（默认: 2）
 *   MYSQL_POOL_MAX - 连接池最大连接数（默认: 10）
 *   PORT           - HTTP 服务端口（默认: 3210）
 *   COS_BASE_URL   - COS 公网访问根地址（默认: examclaw-1251810746.cos.ap-hongkong.myqcloud.com）
 *   COS_SECRET_ID  - COS SecretId（静态资源当前为公有读，后续头像上传可复用）
 *   COS_SECRET_KEY - COS SecretKey（静态资源当前为公有读，后续头像上传可复用）
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// 手动加载 .env（兼容 pm2 cluster 模式，不依赖 --env-file）
try {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const envPath = resolve(__dirname, '..', '.env');
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx <= 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = val;
    }
  }
} catch {
  // .env 不存在时静默跳过
}

const config = {
  wx: {
    appid: process.env.WX_APPID || '',
    secret: process.env.WX_SECRET || '',
  },
  uidSalt: process.env.UID_SALT || 'clawexam-default-salt',
  mysql: {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'clawexam',
    charset: process.env.MYSQL_CHARSET || 'utf8mb4',
    connectionLimit: parseInt(process.env.MYSQL_POOL_MAX || '20', 10),
    waitForConnections: true,
    queueLimit: 100,  // 排队上限，超过直接拒绝，避免无限堆积
    // 时区设为 UTC，与之前 SQLite 保持一致
    timezone: '+00:00',
    // 支持多条语句（迁移需要）
    multipleStatements: true,
    // 掉线重连相关配置
    enableKeepAlive: true,           // 开启 TCP keep-alive，防止被防火墙/NAT 切断
    keepAliveInitialDelay: 30000,    // keep-alive 首次探测延迟 30s
    idleTimeout: 60000,              // 空闲连接 60s 后自动释放，避免拿到被服务端关闭的死连接
    maxIdle: 5,                      // 最大空闲连接数，超出的空闲连接会被关闭
  },
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },
  cos: {
    baseUrl: process.env.COS_BASE_URL || 'https://examclaw-1251810746.cos.ap-hongkong.myqcloud.com',
    secretId: process.env.COS_SECRET_ID || '',
    secretKey: process.env.COS_SECRET_KEY || '',
  },
  port: parseInt(process.env.PORT || '3210', 10),
};

export default config;
