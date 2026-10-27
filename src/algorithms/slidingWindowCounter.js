import redis from "../config/redisClient.js";

const script = `
    local now = tonumber(ARGV[1])
    local windowSize = tonumber(ARGV[2])
    local limit = tonumber(ARGV[3])

    local currentWindowStart = math.floor(now / windowSize) * windowSize
    local currKey = KEYS[1] .. ":" .. currentWindowStart
    local prevKey = KEYS[1] .. ":" .. (currentWindowStart - windowSize)

    local currCount = tonumber(redis.call("GET", currKey)) or 0
    local prevCount = tonumber(redis.call("GET", prevKey)) or 0

    local elapsed = now - currentWindowStart
    local estimatedCount = prevCount * (1 - (elapsed / windowSize)) + currCount

    if estimatedCount < limit then
        redis.call("INCR", currKey)
        redis.call("EXPIRE", currKey, windowSize * 2)
        return 1
    end

    return 0
`;

export const isAllowed = async (clientId, limit, windowSize) => {
  try {
    const key = `ratelimit:slidingWindowCounter:${clientId}`;
    const now = Date.now() / 1000;

    const result = await redis.eval(script, 1, key, now, windowSize, limit);

    return result === 1;

  } catch (err) {
    console.error("SlidingWindowCounter rate limiter error:", err);
    return true;
  }
};