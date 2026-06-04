import jwt from "jsonwebtoken"

export function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "30d" })
}

// In production the frontend and API live on different domains, so the cookie
// must be SameSite=None; Secure to be sent on cross-site requests.
const isProd = process.env.NODE_ENV === "production"
const cookieOptions = {
  httpOnly: true,
  sameSite: isProd ? "none" : "lax",
  secure: isProd,
}

export function setAuthCookie(res, token) {
  res.cookie("token", token, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 })
}

export function clearAuthCookie(res) {
  // Must match the attributes used when setting, or the browser won't clear it.
  res.clearCookie("token", cookieOptions)
}

// Gate: requires a valid JWT cookie, sets req.userId.
export function requireAuth(req, res, next) {
  const token = req.cookies?.token
  if (!token) return res.status(401).json({ error: "Not authenticated" })
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.userId = payload.userId
    next()
  } catch {
    return res.status(401).json({ error: "Invalid session" })
  }
}
