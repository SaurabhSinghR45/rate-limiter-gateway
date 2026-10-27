import { isAllowed as fixedWindow } from "../algorithms/fixedWindowCounter.js";
import { isAllowed as slidingLog } from "../algorithms/slidingWindowLog.js";
import { isAllowed as slidingCounter } from "../algorithms/slidingWindowCounter.js";
import { isAllowed as tokenBucket } from "../algorithms/tokenBucket.js";
import { isAllowed as leakyBucket } from "../algorithms/leakyBucket.js";

import {
    limit,
    capacity,
    windowSize,
    refillRate,
    ROUTE_ALGO_MAP,
    DEFAULT_ALGO
} from "../config/rateLimitConfig.js";

export const rateLimiter = async (req, res, next) => {
    try {
        const clientId = req.ip;

        const algorithm =
            req.query.algo ||
            ROUTE_ALGO_MAP[req.path] ||
            DEFAULT_ALGO;

        let isAllowedReq = false;

        switch (algorithm) {
            case "fixedWindow":
                isAllowedReq =
                    await fixedWindow(clientId, limit, windowSize);
                break;

            case "slidingLog":
                isAllowedReq =
                    await slidingLog(clientId, limit, windowSize);
                break;

            case "slidingCounter":
                isAllowedReq =
                    await slidingCounter(clientId, limit, windowSize);
                break;

            case "tokenBucket":
                isAllowedReq =
                    await tokenBucket(
                        clientId,
                        capacity,
                        refillRate
                    );
                break;

            case "leakyBucket":
                isAllowedReq =
                    await leakyBucket(
                        clientId,
                        capacity,
                        refillRate
                    );
                break;

            default:
                return res.status(400).json({
                    message: `Unknown rate limiting algorithm: ${algorithm}`
                });
        }

        if (isAllowedReq) {
            return next();
        }

        return res.status(429).json({
            message: "Too many requests"
        });

    } catch (err) {
        console.error("Rate limiter error:", err);

        // Fail-open behavior.
        return next();
    }
};