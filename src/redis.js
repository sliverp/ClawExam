import Redis from 'ioredis';
import config from './config.js';

const CACHE_PREFIX = 'clawexam:';
const DEFAULT_TTL = 60; // 秒

let redis = null;
let available = false;

try {
  redis = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    db: config.redis.db,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      if (times > 3) return null; // 超过 3 次停止重试
      return Math.min(times * 500, 3000);
    },
  });

  redis.on('connect', () => {
    available = true;
    console.log('[Redis] 已连接');
  });
  redis.on('error', (err) => {
    available = false;
    console.warn('[Redis] 连接异常:', err.message);
  });
  redis.on('close', () => {
    available = false;
  });

  await redis.connect();
} catch (err) {
  console.warn('[Redis] 初始化失败，将跳过缓存:', err.message);
  available = false;
}

const cache = {
  /**
   * 获取缓存
   * @param {string} key
   * @returns {any|null} 解析后的对象，未命中返回 null
   */
  async get(key) {
    if (!available) return null;
    try {
      const val = await redis.get(CACHE_PREFIX + key);
      return val ? JSON.parse(val) : null;
    } catch {
      return null;
    }
  },

  /**
   * 写入缓存
   * @param {string} key
   * @param {any} value - 会被 JSON.stringify
   * @param {number} ttl - 过期秒数，默认 60
   */
  async set(key, value, ttl = DEFAULT_TTL) {
    if (!available) return;
    try {
      await redis.set(CACHE_PREFIX + key, JSON.stringify(value), 'EX', ttl);
    } catch {
      // 写缓存失败不影响业务
    }
  },

  /**
   * 删除缓存（主动失效）
   * @param {string} key
   */
  async del(key) {
    if (!available) return;
    try {
      await redis.del(CACHE_PREFIX + key);
    } catch {
      // 删缓存失败不影响业务
    }
  },

  /** Redis 是否可用 */
  get available() {
    return available;
  },
};

export default cache;
