import "dotenv/config"
import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
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

const PORT = process.env.PORT || 4000
const origins = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim())

// Allow the configured origin(s) plus Vercel preview URLs (unique per PR deploy).
const corsOrigin = (origin, cb) => {
  if (!origin || origins.includes(origin) || /\.vercel\.app$/.test(new URL(origin).hostname)) {
    return cb(null, true)
  }
  cb(new Error("Not allowed by CORS"))
}

const app = express()
app.use(cors({ origin: corsOrigin, credentials: true }))
app.use(express.json({ limit: "2mb" }))
app.use(cookieParser())

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

app.use("/api/auth", authRoutes)

// Everything below requires authentication and is scoped to req.userId.
app.use("/api/portfolio", requireAuth, portfolioRoutes)
app.use("/api/cards", requireAuth, cardsRoutes)
app.use("/api/snapshots", requireAuth, snapshotsRoutes)
app.use("/api/bills", requireAuth, billsRoutes)
app.use("/api/trackers", requireAuth, trackersRoutes)
app.use("/api/data", requireAuth, dataRoutes)

// Centralized error handler so async throws return JSON, not HTML.
app.use((err, req, res, _next) => {
  console.error(err)
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
