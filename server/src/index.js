import "dotenv/config"
import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import helmet from "helmet"
import rateLimit from "express-rate-limit"
import mongoose from "mongoose"

import { connectDb } from "./db.js"
import { requireAuth } from "./middleware/auth.js"
import authRoutes from "./routes/auth.js"
import portfolioRoutes from "./routes/portfolio.js"
import cardsRoutes from "./routes/cards.js"
import snapshotsRoutes from "./routes/snapshots.js"
import billsRoutes from "./routes/bills.js"
import trackersRoutes from "./routes/trackers.js"
import dataRoutes from "./routes/data.js"
import vitalsRoutes from "./routes/vitals.js"
import travelRoutes from "./routes/travel.js"

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error("JWT_SECRET is missing or too short — set a random string of at least 32 characters (see .env.example).")
  process.exit(1)
}

const PORT = process.env.PORT || 4000
const origins = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)

// Exact-match only — no wildcard hostname allowance. A malformed/missing
// Origin header (e.g. curl, same-origin) is treated as "no origin to check".
const corsOrigin = (origin, cb) => {
  if (!origin) return cb(null, true)
  cb(null, origins.includes(origin))
}

const app = express()
// Render terminates TLS at its own proxy, so without this every request looks
// like it came from that proxy and the rate limiters below key the whole
// internet into one bucket. `1` (trust one hop) rather than `true`, which would
// let a client spoof X-Forwarded-For and rotate past the limiter at will.
app.set("trust proxy", 1)
app.use(helmet())
app.use(cors({ origin: corsOrigin, credentials: true }))
// CSRF guard. The auth cookie is SameSite=None in production, so a form on any
// site can send it; CORS only hides the response, the request still runs.
// Browsers always attach Origin to cross-site writes, so reject unknown ones.
app.use((req, res, next) => {
  const origin = req.get("origin")
  if (["GET", "HEAD", "OPTIONS"].includes(req.method) || !origin || origins.includes(origin)) return next()
  res.status(403).json({ error: "Origin not allowed" })
})
app.use(express.json({ limit: "2mb" }))
app.use(cookieParser())

const rateLimitDisabled = process.env.NODE_ENV === "test" || process.env.RATE_LIMIT_DISABLED === "1"

const globalLimiter = rateLimit({ windowMs: 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false })
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false })

if (!rateLimitDisabled) app.use(globalLimiter)

// Liveness check. Plain call only proves the web server is awake.
// `?db=1` also pings MongoDB so a single keep-alive request keeps Atlas warm too.
app.get("/api/health", async (req, res) => {
  if (req.query.db === undefined) return res.json({ ok: true })
  try {
    await mongoose.connection.db.admin().ping()
    res.json({ ok: true, db: "up" })
  } catch {
    res.status(503).json({ ok: false, db: "down" })
  }
})

app.use("/api/auth", rateLimitDisabled ? [] : authLimiter, authRoutes)

// Everything below requires authentication and is scoped to req.userId.
app.use("/api/portfolio", requireAuth, portfolioRoutes)
app.use("/api/cards", requireAuth, cardsRoutes)
app.use("/api/snapshots", requireAuth, snapshotsRoutes)
app.use("/api/bills", requireAuth, billsRoutes)
app.use("/api/trackers", requireAuth, trackersRoutes)
app.use("/api/data", requireAuth, dataRoutes)
app.use("/api/vitals", requireAuth, vitalsRoutes)
app.use("/api/travel", requireAuth, travelRoutes)

// Centralized error handler so async throws return JSON, not HTML.
app.use((err, req, res, _next) => {
  console.error(`[${req.method} ${req.path}]`, err)
  if (err?.code === 11000) return res.status(409).json({ error: "Already exists" })
  if (err?.name === "CastError" || err?.name === "ValidationError") {
    return res.status(400).json({ error: "Invalid request" })
  }
  res.status(500).json({ error: "Internal server error" })
})

connectDb(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/portfolio-tracker")
  .then(() => {
    app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`))
  })
  .catch((e) => {
    console.error("Failed to connect to MongoDB:", e.message)
    process.exit(1)
  })
