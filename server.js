import cors from "cors";
import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

import { mockApp } from "./mockServer.js";
import { rateLimiter } from "./src/middleware/rateLimiter.js";
import { requestLogger } from "./src/middleware/requestLogger.js";
import { getStats, statsTracker } from "./src/middleware/statsTracker.js";

const app = express();

app.use(cors());

const PORT = Number(process.env.PORT) || 8080;
const MOCK_PORT = Number(process.env.MOCK_PORT) || 3000;

const UPSTREAM_TARGET =
    process.env.UPSTREAM_TARGET || `http://127.0.0.1:${MOCK_PORT}`;

// Start mock backend when no external upstream is configured.
if (!process.env.UPSTREAM_TARGET) {
    mockApp.listen(MOCK_PORT, () => {
        console.log(`Mock backend running on port ${MOCK_PORT}`);
    });
}
const proxyMiddleware = createProxyMiddleware({
    target: UPSTREAM_TARGET,
    changeOrigin: true,
    pathRewrite: (path) => `/api${path}`
});

app.use(
    "/api",
    requestLogger,
    statsTracker,
    rateLimiter,
    proxyMiddleware
);

// Health check
app.get("/health", (req, res) => {
    res.status(200).json({
        status: "ok"
    });
});

// Statistics
app.get("/stats", (req, res) => {
    res.status(200).json(getStats());
});

// Start gateway
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Rate limiter gateway running on port ${PORT}`);
    console.log(`Upstream target: ${UPSTREAM_TARGET}`);
});