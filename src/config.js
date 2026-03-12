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
 */

const config = {
  mysql: {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'clawexam',
    charset: process.env.MYSQL_CHARSET || 'utf8mb4',
    connectionLimit: parseInt(process.env.MYSQL_POOL_MAX || '50', 10),
    waitForConnections: true,
    queueLimit: 200,  // 排队上限，超过直接拒绝，避免无限堆积
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
  port: parseInt(process.env.PORT || '3210', 10),
};

export default config;
