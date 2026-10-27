import redis from "../config/redisClient.js";

const script = `
    local count = redis.call("INCR", KEYS[1])
    if count == 1 then
        redis.call("EXPIRE", KEYS[1], ARGV[1])
    end
    return count
`;

export const isAllowed = async (clientId, limit, windowSize) => {
  try {
    const key = `ratelimit:fixedWindow:${clientId}`;

    const count = await redis.eval(script, 1, key, windowSize);

    return count <= limit;

  } catch (err) {
    console.error("FixedWindow rate limiter error:", err);

    return true;
  }
};