import { Router } from "express"
import bcrypt from "bcryptjs"

import { User } from "../models/User.js"
import { clearAuthCookie, requireAuth, setAuthCookie, signToken } from "../middleware/auth.js"
import { loginSchema, signupSchema, validate } from "../validation.js"

const router = Router()

const publicUser = (u) => ({ id: u._id, email: u.email, name: u.name })

// Signup is the only unauthenticated write path into the database, and bcrypt
// makes each call expensive on purpose. Closed unless explicitly enabled: turn
// SIGNUP_ENABLED on, register, turn it back off.
const requireSignupEnabled = (req, res, next) => {
  if (process.env.SIGNUP_ENABLED !== "true") {
    return res.status(403).json({ error: "Signup is disabled" })
  }
  next()
}

router.post("/signup", requireSignupEnabled, validate(signupSchema), async (req, res) => {
  const { email, password, name } = req.body
  const existing = await User.findOne({ email: String(email).toLowerCase() })
  if (existing) return res.status(409).json({ error: "Email already registered" })

  const passwordHash = await bcrypt.hash(String(password), 10)
  const user = await User.create({ email, name, passwordHash })

  setAuthCookie(res, signToken(user._id))
  res.status(201).json({ user: publicUser(user) })
})

router.post("/login", validate(loginSchema), async (req, res) => {
  const { email, password } = req.body

  const user = await User.findOne({ email: String(email).toLowerCase() })
  if (!user) return res.status(401).json({ error: "Invalid credentials" })

  const ok = await bcrypt.compare(String(password), user.passwordHash)
  if (!ok) return res.status(401).json({ error: "Invalid credentials" })

  setAuthCookie(res, signToken(user._id))
  res.json({ user: publicUser(user) })
})

router.post("/logout", (req, res) => {
  clearAuthCookie(res)
  res.json({ ok: true })
})

router.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.userId)
  if (!user) return res.status(401).json({ error: "Not authenticated" })
  res.json({ user: publicUser(user) })
})

export default router
