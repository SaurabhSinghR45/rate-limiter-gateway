import redis from "../config/redisClient.js";

const script = `
    local key = KEYS[1]
    local now = tonumber(ARGV[1])
    local capacity = tonumber(ARGV[2])
    local leakRate = tonumber(ARGV[3])

    local data = redis.call("HMGET", key, "queue", "lastLeakTime")
    local queue = tonumber(data[1])
    local lastLeakTime = tonumber(data[2])

    if queue == nil then
        queue = 0
        lastLeakTime = now
    end

    local elapsed = now - lastLeakTime
    local leaked = elapsed * leakRate
    queue = math.max(0, queue - leaked)
    lastLeakTime = now

    local allowed = 0
    if queue < capacity then
        queue = queue + 1
        allowed = 1
    end

    redis.call("HMSET", key, "queue", queue, "lastLeakTime", lastLeakTime)
    redis.call("EXPIRE", key, 3600)

    return allowed
`;

export const isAllowed = async (clientId, capacity, leakRate) => {
  try {
    const key = `ratelimit:leakyBucket:${clientId}`;
    const now = Date.now() / 1000;

    const result = await redis.eval(script, 1, key, now, capacity, leakRate);

    return result === 1;

  } catch (err) {
    console.error("LeakyBucket rate limiter error:", err);
    return true;
  }
};