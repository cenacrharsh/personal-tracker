import { MongoMemoryServer } from "mongodb-memory-server"

const PORT = 4555
const BASE = `http://localhost:${PORT}/api`

let cookie = ""
async function call(path, { method = "GET", body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const setCookie = res.headers.get("set-cookie")
  if (setCookie) cookie = setCookie.split(";")[0]
  const text = await res.text()
  let json
  try { json = text ? JSON.parse(text) : null } catch { json = text }
  return { status: res.status, json }
}

function assert(cond, msg) {
  if (!cond) { console.error("FAIL:", msg); process.exit(1) }
  console.log("ok:", msg)
}

const mongo = await MongoMemoryServer.create()
process.env.MONGODB_URI = mongo.getUri()
process.env.JWT_SECRET = "test-secret"
process.env.PORT = String(PORT)
process.env.NODE_ENV = "test"

await import("../src/index.js")

// wait for server up
for (let i = 0; i < 50; i++) {
  try {
    const r = await fetch(`${BASE}/health`)
    if (r.ok) break
  } catch { /* not up yet */ }
  await new Promise((r) => setTimeout(r, 100))
}

// 0. health endpoints (public)
let r = await call("/health")
assert(r.status === 200 && r.json.ok === true, "plain health returns ok")
r = await call("/health?db=1")
assert(r.status === 200 && r.json.ok === true && r.json.db === "up", "health?db=1 pings the database")

// 1. unauthenticated access is blocked
r = await call("/portfolio")
assert(r.status === 401, "unauthenticated portfolio GET is 401")

// 2. signup
r = await call("/auth/signup", { method: "POST", body: { name: "You", email: "you@example.com", password: "secret123" } })
assert(r.status === 201 && r.json.user.email === "you@example.com", "signup creates user + sets cookie")

// 3. authed portfolio is null initially, then round-trips
r = await call("/portfolio")
assert(r.status === 200 && r.json === null, "portfolio null before first save")

r = await call("/portfolio", { method: "PUT", body: { age: 31, monthlyIncome: 200000, fdAmount: 5000 } })
assert(r.status === 200 && r.json.age === 31 && r.json.fdAmount === 5000, "portfolio PUT persists")

r = await call("/portfolio")
assert(r.status === 200 && r.json.monthlyIncome === 200000, "portfolio GET returns saved data")

// 4. cards round-trip (config + monthly assembled back)
r = await call("/cards", {
  method: "PUT",
  body: {
    creditCards: [{ id: "sbi", name: "SBI", anniversaryStartMonth: 1, feeWaiverTarget: 0, status: "active", annualFeeType: "ltf", annualFeeAmount: 0, creditLimit: 0, benefitsNote: "" }],
    creditCardDataByYear: { 2026: { sbi: { cashback: { 1: 100 }, expenses: { 1: 5000 } } } },
  },
})
assert(r.status === 200, "cards PUT ok")
r = await call("/cards")
assert(r.json.creditCards.length === 1 && r.json.creditCards[0].id === "sbi", "cards GET returns config")
assert(r.json.creditCardDataByYear["2026"].sbi.cashback["1"] === 100, "cards GET returns monthly data")

// 5. trackers round-trip (gym + badminton, distinct days)
r = await call("/trackers", {
  method: "PUT",
  body: {
    gym: { entries: ["2026-05-01", "2026-05-03", "2026-05-05"] },
    badminton: { entries: ["2026-05-02", "2026-05-04"] },
  },
})
assert(r.status === 200, "trackers PUT ok")
r = await call("/trackers")
assert(r.json.gym.entries.length === 3 && r.json.gym.entries.includes("2026-05-03"), "trackers GET returns gym entries")
assert(r.json.badminton.entries.length === 2 && r.json.badminton.entries.includes("2026-05-04"), "trackers GET returns badminton entries")

// 6. bills round-trip
r = await call("/bills", { method: "PUT", body: { creditCards: { "2026-1-sbi": { paid: true, paidAt: 123 } }, insurance: {} } })
assert(r.status === 200, "bills PUT ok")
r = await call("/bills")
assert(r.json.creditCards["2026-1-sbi"].paid === true, "bills GET returns paid status")

// 7. snapshots
r = await call("/snapshots", { method: "POST", body: { date: "2026-05-29", ts: 1000, netWorth: 50000, equity: 30000, gold: 10000, silver: 5000, debt: 5000, emergencyFund: 20000 } })
assert(r.status === 200, "snapshot POST ok")
r = await call("/snapshots")
assert(Array.isArray(r.json) && r.json.length === 1 && r.json[0].netWorth === 50000, "snapshots GET returns series")

// 8. isolation: a second user sees none of the first user's data
cookie = ""
r = await call("/auth/signup", { method: "POST", body: { name: "Her", email: "her@example.com", password: "secret123" } })
assert(r.status === 201, "second user signup")
r = await call("/portfolio")
assert(r.json === null, "second user has isolated (empty) portfolio")
r = await call("/trackers")
assert(r.json.gym.entries.length === 0, "second user has isolated (empty) trackers")

// 9. reset wipes current user's data
r = await call("/auth/login", { method: "POST", body: { email: "you@example.com", password: "secret123" } })
assert(r.status === 200, "login back as first user")
r = await call("/data/reset", { method: "POST" })
assert(r.status === 200, "reset ok")
r = await call("/portfolio")
assert(r.json === null, "portfolio cleared after reset")

console.log("\nALL SMOKE TESTS PASSED")
await mongo.stop()
process.exit(0)
