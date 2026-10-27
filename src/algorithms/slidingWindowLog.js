import redis from "../config/redisClient.js";

const script = `
    local now = tonumber(ARGV[1])
    local windowSize = tonumber(ARGV[2])
    local limit = tonumber(ARGV[3])
    local windowStart = now - windowSize

    redis.call("ZREMRANGEBYSCORE", KEYS[1], 0, windowStart)

    local count = redis.call("ZCARD", KEYS[1])

    if count < limit then
        redis.call("ZADD", KEYS[1], now, now)
        redis.call("EXPIRE", KEYS[1], windowSize)
        return 1
    end

    return 0
`;

export const isAllowed = async (clientId, limit, windowSize) => {
  try {
    const key = `ratelimit:slidingWindowLog:${clientId}`;
    const now = Date.now()/1000;

    const result = await redis.eval(script, 1, key, now, windowSize, limit);

    return result === 1;

  } catch (err) {
    console.error("SlidingWindowLog rate limiter error:", err);
    return true;
  }
};