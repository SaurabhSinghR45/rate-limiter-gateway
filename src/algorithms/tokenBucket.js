import redis from "../config/redisClient.js";

const script = `
    local key = KEYS[1]
    local now = tonumber(ARGV[1])
    local totalTokens = tonumber(ARGV[2])
    local refillRate = tonumber(ARGV[3])

    local data = redis.call("HMGET", key, "tokens", "lastRefillTime")
    local tokens = tonumber(data[1])
    local lastRefillTime = tonumber(data[2])

    if tokens == nil then
        tokens = totalTokens
        lastRefillTime = now
    end

    local elapsed = now - lastRefillTime
    local refill = elapsed * refillRate
    tokens = math.min(totalTokens, tokens + refill)
    lastRefillTime = now

    local allowed = 0
    if tokens >= 1 then
        tokens = tokens - 1
        allowed = 1
    end

    redis.call("HMSET", key, "tokens", tokens, "lastRefillTime", lastRefillTime)
    redis.call("EXPIRE", key, 3600)

    return allowed
`;

export const isAllowed = async (clientId, totalTokens, refillRate) => {
  try {
    const key = `ratelimit:tokenBucket:${clientId}`;
    const now = Date.now() / 1000;

    const result = await redis.eval(script, 1, key, now, totalTokens, refillRate);

    return result === 1;

  } catch (err) {
    console.error("TokenBucket rate limiter error:", err);
    return true;
  }
};