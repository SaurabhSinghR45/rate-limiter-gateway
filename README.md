# Distributed Rate Limiter API Gateway & Reverse Proxy

[![GitHub license](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)
[![Node Version](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org)
[![Redis](https://img.shields.io/badge/redis-7.0-red.svg)](https://redis.io)
[![Author](https://img.shields.io/badge/author-Saurabh%20Singh-blueviolet.svg)](https://github.com/SaurabhSinghR45)

A high-throughput **Layer 7 API Gateway & Reverse Proxy** built with Node.js and Express 5 that protects upstream backend microservices from traffic surges, malicious scrapers, and denial-of-service spikes using **distributed in-memory Redis Lua scripts**.

Features **5 industry-standard rate limiting algorithms**, non-blocking request telemetry via Winston, per-client analytics, and an interactive **live Web UI Console**.

---

## ⚡ Key Highlights

- **5 Interchangeable Algorithms:** Select dynamically per-request using the `?algo=` query parameter:
  - 🎟️ **Token Bucket** — Burst-tolerant quota allocation (Stripe/AWS standard)
  - 🚰 **Leaky Bucket** — Smooth, constant outflow smoothing for fragile databases
  - 🧮 **Sliding Window Counter** — Memory-efficient weighted rolling average
  - ⏱️ **Sliding Window Log** — Sub-second mathematical precision with Redis Sorted Sets
  - 🪟 **Fixed Window Counter** — Atomic integer increment with TTL boundaries
- **Atomic Concurrency Guarantee:** Every rate limit check executes inside a single-threaded Redis Lua script sandbox, eliminating Time-of-Check to Time-of-Use (**TOCTOU**) race conditions under high concurrency.
- **Fail-Open Resilience:** If Redis experiences an outage, the gateway catches the error and safely permits requests (`next()`) to ensure uninterrupted platform availability.
- **Reverse Proxy Routing:** Seamlessly streams authorized TCP bytes to upstream target services (`http-proxy-middleware`) while short-circuiting throttled requests with **HTTP 429 Too Many Requests**.
- **Interactive Web Console:** Real-time client dashboard to trigger burst traffic, test algorithms, and observe allow/block outcomes with zero external tools.

---

## 🛠️ Architecture & Tech Stack

```
[ External Clients / Web / Mobile ]
                 │
                 ▼  HTTP (Port 8080)
┌──────────────────────────────────────────────┐
│          API Gateway (server.js)             │
│  ├── CORS Verification                       │
│  ├── Asynchronous Winston Request Logger     │
│  ├── Client Telemetry & Stats Tracker        │
│  └── Distributed Rate Limiter Middleware     │
└───────────────┬──────────────────────────────┘
                │
        Atomic Lua (<1ms)
                ▼
      ┌──────────────────┐
      │   Redis Server   │ (Port 6379)
      │  In-Memory State │
      └─────────┬────────┘
                │
       Decision: Allow (1) or Block (0)
                │
     ┌──────────┴──────────┐
     ▼                     ▼
 [HTTP 429 Blocked]    [Proxy Forwarding]
 (Edge Terminated)         │
                           ▼  HTTP (Port 3000)
               ┌────────────────────────┐
               │ Upstream Backend Svc   │
               │ (mockServer.js)        │
               └────────────────────────┘
```

- **Runtime:** Node.js (v20+) & Express 5
- **In-Memory Store:** Redis 7 (via `ioredis`)
- **Proxy Engine:** `http-proxy-middleware`
- **Logging:** Winston structured multi-transport logging
- **Containerization:** Docker & Docker Compose

---

## 🚀 Quickstart (Run Locally)

### 1. Clone the Repository
```bash
git clone https://github.com/SaurabhSinghR45/rate-limiter-gateway.git
cd rate-limiter-gateway
npm install
```

### 2. Start Redis
Make sure Redis is running on port `6379`:
```bash
# Using Docker (Fastest):
docker run -d --name redis -p 6379:6379 redis:alpine

# Or using WSL / Linux:
sudo service redis-server start
```

### 3. Start the Gateway
```bash
npm start
```

You will see:
```text
Mock backend running on port 3000
Rate limiter gateway running on port 8080
Upstream target: http://127.0.0.1:3000
Web UI Console:  http://localhost:8080
Redis Connected
```

---

## 🖥️ Live Web UI Console

Open the built-in testing dashboard in your browser without any setup:

👉 **[http://localhost:8080](http://localhost:8080)** *(or run `npm run ui` in your terminal)*

- Dispatch individual requests or test **⚡ Burst x10**.
- Switch algorithms on the fly (`tokenBucket`, `leakyBucket`, etc.).
- Inspect live request latencies, status badges (**ALLOW 200 OK** vs **BLOCK 429**), and per-IP statistics.

---

## 📡 API Usage & Endpoints

All client requests hit the Gateway on port **`8080`**:

### Send a Request (with Algorithm Selection)
```bash
# Token Bucket (Default)
curl.exe http://localhost:8080/api/posts?algo=tokenBucket

# Leaky Bucket
curl.exe http://localhost:8080/api/posts?algo=leakyBucket

# Sliding Window Counter
curl.exe http://localhost:8080/api/posts?algo=slidingCounter

# Sliding Window Log
curl.exe http://localhost:8080/api/posts?algo=slidingLog

# Fixed Window Counter
curl.exe http://localhost:8080/api/posts?algo=fixedWindow
```

### Trigger Rate Limiting (PowerShell Quick Test)
```powershell
1..10 | ForEach-Object { curl.exe -s http://localhost:8080/api/posts }
```

### View Live Telemetry Stats
```bash
curl.exe http://localhost:8080/stats
```
**Response:**
```json
{
  "127.0.0.1": {
    "total": 10,
    "allowed": 5,
    "blocked": 5
  }
}
```

---

## 🚢 Deployment Guide

### Option 1: One-Click Docker Compose (Local or Cloud VPS)

The project includes a ready-to-run `docker-compose.yml` that boots Redis and the Gateway together with automated health checks:

```bash
# 1. Start the entire cluster in the background
docker compose up -d

# 2. View live logs
docker compose logs -f

# 3. Stop the cluster when finished
docker compose down
```

The gateway is now live at `http://YOUR-SERVER-IP:8080`!

---

### Option 2: Deploy to Cloud (Render / Railway / Fly.io)

1. **Create a Redis Instance:**
   - On [Railway](https://railway.app), [Render](https://render.com), or [Upstash](https://upstash.com), create a free Redis database and copy the Redis Connection URL (`redis://...`).
2. **Deploy the Gateway Web Service:**
   - Link your GitHub repo (`https://github.com/SaurabhSinghR45/rate-limiter-gateway`).
   - Set Build Command: `npm install`
   - Set Start Command: `npm start`
   - Add Environment Variable:
     - `REDIS_URL` = `your_redis_connection_url`
     - `PORT` = `8080`
3. Click **Deploy**!

---

### Option 3: Production Linux Server (Ubuntu with PM2 & Systemd)

```bash
# 1. Install Redis & PM2
sudo apt update && sudo apt install -y redis-server
sudo systemctl enable --now redis-server
sudo npm install -g pm2

# 2. Start Gateway with PM2 process manager
pm2 start server.js --name "rate-limiter-gateway"
pm2 save
pm2 startup
```

---

## 📁 Repository Structure

```
rate-limiter-gateway/
├── server.js                  # Main Gateway & Reverse Proxy (Port 8080)
├── mockServer.js              # Private Upstream Backend (Port 3000)
├── Dockerfile                 # Production Container Image Spec
├── docker-compose.yml         # Multi-container orchestration (Redis + Gateway)
├── package.json               # Node.js dependencies & scripts
├── UI/
│   └── index.html             # High-performance SaaS testing dashboard
├── src/
│   ├── algorithms/            # 5 Redis Lua rate limiting implementations
│   │   ├── tokenBucket.js
│   │   ├── leakyBucket.js
│   │   ├── slidingWindowCounter.js
│   │   ├── slidingWindowLog.js
│   │   └── fixedWindowCounter.js
│   ├── config/
│   │   ├── rateLimitConfig.js # Declarative thresholds & route mapping
│   │   └── redisClient.js     # Resilient ioredis client with retry strategy
│   └── middleware/
│       ├── rateLimiter.js     # Core decision & algorithm selector middleware
│       ├── requestLogger.js   # Asynchronous latency logger (res.on finish)
│       ├── statsTracker.js    # In-memory per-client analytics engine
│       └── logger.js          # Winston file & console logging transports
```

---

## 👤 Author

**Saurabh Singh**
- GitHub: [@SaurabhSinghR45](https://github.com/SaurabhSinghR45)
- Repository: [rate-limiter-gateway](https://github.com/SaurabhSinghR45/rate-limiter-gateway)
