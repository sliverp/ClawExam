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

// singleflight: 进程内去重（同进程的并发请求共享一个 Promise）
const inflightMap = new Map();

// sleep 工具
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const cache = {
  /**
   * 获取缓存（返回解析后的对象）
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
   * 获取缓存原始字符串（跳过 JSON.parse）
   */
  async getRaw(key) {
    if (!available) return null;
    try {
      return await redis.get(CACHE_PREFIX + key);
    } catch {
      return null;
    }
  },

  /**
   * 写入缓存
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
   */
  async del(key) {
    if (!available) return;
    try {
      await redis.del(CACHE_PREFIX + key);
    } catch {
      // 删缓存失败不影响业务
    }
  },

  /**
   * 进程内 singleflight + 跨进程 Redis 分布式锁防击穿
   *
   * 流程:
   *   1. 进程内有 inflight → 直接共享 Promise
   *   2. 尝试 Redis SET NX 抢锁
   *      - 抢到锁 → 执行 fn → 写缓存 → 删锁
   *      - 没抢到 → 轮询等缓存出现（其他进程正在重建）
   */
  async singleflight(key, fn) {
    // 1. 进程内去重
    if (inflightMap.has(key)) {
      return inflightMap.get(key);
    }

    const promise = this._distributedSingleflight(key, fn).finally(() => {
      inflightMap.delete(key);
    });
    inflightMap.set(key, promise);
    return promise;
  },

  async _distributedSingleflight(key, fn) {
    if (!available) {
      return fn();
    }

    const lockKey = CACHE_PREFIX + 'lock:' + key;
    try {
      // 尝试抢锁，5 秒过期（防止进程挂了死锁）
      const locked = await redis.set(lockKey, '1', 'EX', 5, 'NX');

      if (locked) {
        // 抢到锁：执行 fn 重建缓存
        try {
          const result = await fn();
          return result;
        } finally {
          // 释放锁
          await redis.del(lockKey).catch(() => {});
        }
      } else {
        // 没抢到锁：等其他进程重建完，轮询缓存
        for (let i = 0; i < 50; i++) { // 最多等 5 秒
          await sleep(100);
          const cached = await this.getRaw(key);
          if (cached) {
            return JSON.parse(cached);
          }
        }
        // 超时兜底：直接查 DB
        return fn();
      }
    } catch {
      // Redis 异常，直接走 DB
      return fn();
    }
  },

  /** Redis 是否可用 */
  get available() {
    return available;
  },
};

export default cache;
