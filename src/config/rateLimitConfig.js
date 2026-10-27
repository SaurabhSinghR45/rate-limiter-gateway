export const ALGO_TYPE = "tokenBucket"
export const limit = 10
export const capacity = 5
export const windowSize = 10
export const refillRate  = 1

export const ROUTE_ALGO_MAP = {
  "/api/posts": "tokenBucket",
  "/api/users": "fixedWindow",
};

export const DEFAULT_ALGO = "tokenBucket";