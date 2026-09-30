import { MongoMemoryServer } from "mongodb-memory-server"

const PORT = 4555
const BASE = `http://localhost:${PORT}/api`

let cookie = ""
async function call(path, { method = "GET", body, headers = {} } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}), ...headers },
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
process.env.JWT_SECRET = "test-secret-at-least-32-characters-long"
process.env.PORT = String(PORT)
process.env.NODE_ENV = "test"
// Signup is closed by default in production; the suite needs it to create users.
process.env.SIGNUP_ENABLED = "true"

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

r = await call("/auth/signup", { method: "POST", body: { name: "You", email: "you@example.com", password: "secret123" } })
assert(r.status === 409, "duplicate signup returns 409")

// 3. portfolio: defaults before first save, then per-field PATCH
r = await call("/portfolio")
assert(r.status === 200 && r.json.age === 30 && r.json.lifeInsurance.enabled === true, "portfolio GET returns schema defaults before first save")

r = await call("/portfolio", { method: "PATCH", body: { age: 31, monthlyIncome: 200000, fdAmount: 5000 } })
assert(r.status === 200 && r.json.age === 31 && r.json.fdAmount === 5000, "portfolio PATCH persists")

r = await call("/portfolio", { method: "PATCH", body: { rdAmount: 700 } })
assert(r.json.rdAmount === 700 && r.json.fdAmount === 5000 && r.json.age === 31, "portfolio PATCH leaves other fields alone")

r = await call("/portfolio", { method: "PATCH", body: { lifeInsurance: { premium: 1200 } } })
r = await call("/portfolio", { method: "PATCH", body: { lifeInsurance: { coverAmount: 5000000 } } })
assert(r.json.lifeInsurance.premium === 1200 && r.json.lifeInsurance.coverAmount === 5000000, "insurance sub-field PATCHes don't overwrite each other")

r = await call("/portfolio", { method: "PATCH", body: { fdAmount: -100 } })
assert(r.status === 400 && typeof r.json.error === "string", "portfolio PATCH with negative number is 400")
r = await call("/portfolio")
assert(r.json.fdAmount === 5000, "invalid portfolio PATCH did not persist")

// 4. cards: create, patch settings, set month cells, delete
const card = { id: "sbi", name: "SBI", anniversaryStartMonth: 1, feeWaiverTarget: 0, status: "active", annualFeeType: "ltf", annualFeeAmount: 0, creditLimit: 0, benefitsNote: "" }
r = await call("/cards", { method: "POST", body: card })
assert(r.status === 201 && r.json.id === "sbi", "card POST creates a card")
r = await call("/cards", { method: "POST", body: { ...card, id: "hdfc", name: "HDFC" } })
assert(r.status === 201, "second card POST ok")
r = await call("/cards", { method: "POST", body: { ...card, name: "Renamed" } })
assert(r.status === 201 && r.json.name === "SBI", "repeating a card POST is safe and leaves the card as it was")

r = await call("/cards/sbi", { method: "PATCH", body: { creditLimit: 100000 } })
assert(r.status === 200 && r.json.creditLimit === 100000 && r.json.name === "SBI", "card PATCH changes only the posted setting")
r = await call("/cards/nope", { method: "PATCH", body: { creditLimit: 1 } })
assert(r.status === 404, "PATCH of an unknown card is 404")

r = await call("/cards/sbi/months", { method: "PUT", body: { year: 2026, month: 1, field: "cashback", value: 100 } })
assert(r.status === 200, "card month PUT ok")
await call("/cards/sbi/months", { method: "PUT", body: { year: 2026, month: 1, field: "expenses", value: 5000 } })
await call("/cards/sbi/months", { method: "PUT", body: { year: 2026, month: 2, field: "expenses", value: 3000 } })
r = await call("/cards/sbi/months", { method: "PUT", body: { year: 2026, month: 13, field: "expenses", value: 1 } })
assert(r.status === 400, "card month PUT with month 13 is 400")
r = await call("/cards/nope/months", { method: "PUT", body: { year: 2026, month: 1, field: "expenses", value: 1 } })
assert(r.status === 404, "month PUT for an unknown card is 404")
r = await call("/cards")
assert(!r.json.creditCardDataByYear["2026"]?.nope, "month PUT for an unknown card leaves no row behind")

r = await call("/cards")
assert(r.json.creditCards.length === 2, "cards GET returns both cards")
const sbi2026 = r.json.creditCardDataByYear["2026"].sbi
assert(sbi2026.cashback["1"] === 100 && sbi2026.expenses["1"] === 5000 && sbi2026.expenses["2"] === 3000, "month cells are set independently")

r = await call("/cards/hdfc", { method: "DELETE" })
assert(r.status === 200, "card DELETE ok")
r = await call("/cards")
assert(r.json.creditCards.length === 1 && r.json.creditCards[0].id === "sbi", "deleting one card leaves the other")

// 5. trackers: mark and unmark single days
for (const d of ["2026-05-01", "2026-05-03", "2026-05-05"]) await call(`/trackers/gym/${d}`, { method: "PUT" })
await call("/trackers/badminton/2026-05-02", { method: "PUT" })
r = await call("/trackers/gym/2026-05-03", { method: "PUT" })
assert(r.status === 200, "marking an already-marked day is ok (idempotent)")
r = await call("/trackers/gym/2026-05-05", { method: "DELETE" })
assert(r.status === 200, "tracker DELETE ok")
r = await call("/trackers/gym/not-a-date", { method: "PUT" })
assert(r.status === 400, "tracker PUT with malformed date is 400")
r = await call("/trackers")
assert(r.json.gym.entries.join() === "2026-05-01,2026-05-03", "trackers GET returns remaining gym entries")
assert(r.json.badminton.entries.join() === "2026-05-02", "trackers GET returns badminton entries")

// 6. bills: mark paid / unpaid
r = await call("/bills/card/2026-1-sbi", { method: "PUT", body: { paidAt: 123 } })
assert(r.status === 200, "bill PUT ok")
await call("/bills/insurance/2026-life", { method: "PUT", body: { paidAt: 456 } })
r = await call("/bills/insurance/2026-dental", { method: "PUT", body: {} })
assert(r.status === 400, "bill PUT with an invalid key is 400")
r = await call("/bills/constructor/x", { method: "PUT", body: {} })
assert(r.status === 400, "bill PUT with an inherited property name as kind is 400")
r = await call("/bills")
assert(r.json.creditCards["2026-1-sbi"].paid === true && r.json.insurance["2026-life"].paidAt === 456, "bills GET returns paid status")
await call("/bills/card/2026-1-sbi", { method: "DELETE" })
r = await call("/bills")
assert(!r.json.creditCards["2026-1-sbi"] && r.json.insurance["2026-life"], "bill DELETE unmarks only that bill")

// 7. snapshots
r = await call("/snapshots", { method: "POST", body: { date: "2026-05-29", ts: 1000, netWorth: 50000, equity: 30000, gold: 10000, silver: 5000, debt: 5000, emergencyFund: 20000 } })
assert(r.status === 200, "snapshot POST ok")
r = await call("/snapshots")
assert(Array.isArray(r.json) && r.json.length === 1 && r.json[0].netWorth === 50000, "snapshots GET returns series")

// 7b. vitals: upsert, re-upsert (update not duplicate), sorted GET, invalid body, delete
r = await call("/vitals/2026-01-01", {
  method: "PUT",
  body: { lab: "Thyrocare", notes: "", results: { hemoglobin: 14.5, "vitamin-d": 25 } },
})
assert(r.status === 200 && r.json.results.hemoglobin === 14.5, "vitals PUT upserts a report")

r = await call("/vitals/2026-01-01", { method: "PUT", body: { results: { hemoglobin: 15 } } })
assert(r.status === 200 && r.json.results.hemoglobin === 15, "vitals PUT on same date updates in place")
r = await call("/vitals")
assert(r.json.filter((v) => v.date === "2026-01-01").length === 1, "re-upserting the same date does not duplicate")

r = await call("/vitals/2025-06-01", { method: "PUT", body: { results: { hemoglobin: 13.8 } } })
assert(r.status === 200, "second vitals report PUT ok")
r = await call("/vitals")
assert(r.json.length === 2 && r.json[0].date === "2025-06-01" && r.json[1].date === "2026-01-01", "vitals GET is sorted by date ascending")

r = await call("/vitals/2026-02-01", { method: "PUT", body: { results: { "BAD KEY!": 5 } } })
assert(r.status === 400, "vitals PUT with invalid metric key is 400")

r = await call("/vitals/not-a-date", { method: "PUT", body: { results: { hemoglobin: 10 } } })
assert(r.status === 400, "vitals PUT with malformed date param is 400")

r = await call("/vitals/2026-01-01", { method: "DELETE" })
assert(r.status === 200, "vitals DELETE ok")
r = await call("/vitals/2026-01-01", { method: "DELETE" })
assert(r.status === 200, "deleting an already-deleted report is a safe no-op")

// 7c. travel: mark states, add/update cities, unmark cascades to cities, validation
const mumbai = { name: "Mumbai", stateCode: "MH", lat: 19.076, lng: 72.878 }
r = await call("/travel")
assert(r.status === 200 && r.json.states.length === 0 && r.json.cities.length === 0, "travel GET starts empty")
r = await call("/travel/states/GA", { method: "PUT" })
assert(r.status === 200, "travel state PUT ok")
await call("/travel/states/GA", { method: "PUT" })
r = await call("/travel")
assert(r.json.states.length === 1 && r.json.states[0] === "GA", "marking a state twice stores it once")
r = await call("/travel/cities/gn:1275339", { method: "PUT", body: mumbai })
assert(r.status === 200, "travel city PUT ok")
r = await call("/travel")
assert(r.json.cities.length === 1 && r.json.cities[0].id === "gn:1275339" && r.json.cities[0].stateCode === "MH", "travel GET returns the city")
assert(!r.json.states.includes("MH"), "adding a city does not write a state mark (it's derived)")
r = await call("/travel/cities/gn:1275339", { method: "PUT", body: { ...mumbai, stateCode: "GJ" } })
r = await call("/travel")
assert(r.json.cities.length === 1 && r.json.cities[0].stateCode === "GJ", "re-PUT of a city updates it in place")

r = await call("/travel/states/mh", { method: "PUT" })
assert(r.status === 400, "lowercase state code is 400")
r = await call("/travel/cities/bad%20id", { method: "PUT", body: mumbai })
assert(r.status === 400, "malformed city id is 400")
r = await call("/travel/cities/gn:1", { method: "PUT", body: { ...mumbai, lat: 200 } })
assert(r.status === 400, "out-of-range latitude is 400")
r = await call("/travel/cities/gn:1", { method: "PUT", body: { ...mumbai, stateCode: "Karnataka" } })
assert(r.status === 400, "invalid city state code is 400")

await call("/travel/states/KA", { method: "PUT" })
await call("/travel/cities/gn:1277333", { method: "PUT", body: { name: "Bengaluru", stateCode: "KA", lat: 12.97, lng: 77.59 } })
await call("/travel/cities/gn:1269920", { method: "PUT", body: { name: "Hampi", stateCode: "KA", lat: 15.33, lng: 76.46 } })
r = await call("/travel/states/KA", { method: "DELETE" })
assert(r.status === 200 && r.json.removedCities === 2, "unmarking a state removes its cities")
r = await call("/travel")
assert(!r.json.states.includes("KA") && !r.json.cities.some((c) => c.stateCode === "KA"), "state and its cities are gone")
assert(r.json.cities.length === 1, "other states' cities are untouched")
r = await call("/travel/states/KA", { method: "DELETE" })
assert(r.status === 200 && r.json.removedCities === 0, "unmarking an unvisited state is a safe no-op")
r = await call("/travel/cities/gn:1269920", { method: "DELETE" })
assert(r.status === 200, "deleting an already-deleted city is a safe no-op")

// 8. isolation: a second user sees none of the first user's data
cookie = ""
r = await call("/auth/signup", { method: "POST", body: { name: "Her", email: "her@example.com", password: "secret123" } })
assert(r.status === 201, "second user signup")
r = await call("/portfolio")
assert(r.json.fdAmount === 0, "second user has isolated (default) portfolio")
r = await call("/trackers")
assert(Object.keys(r.json).length === 0, "second user has isolated (empty) trackers")
await call("/cards/sbi", { method: "DELETE" })
r = await call("/vitals")
assert(Array.isArray(r.json) && r.json.length === 0, "second user has isolated (empty) vitals")
r = await call("/travel")
assert(r.json.states.length === 0 && r.json.cities.length === 0, "second user has isolated (empty) travel")
await call("/travel/states/GA", { method: "DELETE" })
await call("/vitals/2025-06-01", { method: "DELETE" })

// 9. reset wipes current user's data
r = await call("/auth/login", { method: "POST", body: { email: "you@example.com", password: "secret123" } })
assert(r.status === 200, "login back as first user")
r = await call("/vitals")
assert(r.json.some((v) => v.date === "2025-06-01"), "second user's DELETE did not remove first user's vitals report")
r = await call("/cards")
assert(r.json.creditCards.some((c) => c.id === "sbi"), "second user's DELETE did not remove first user's card")
r = await call("/travel")
assert(r.json.states.includes("GA") && r.json.cities.length === 1, "second user's DELETE did not remove first user's travel data")
r = await call("/data/reset", { method: "POST", headers: { Origin: "https://evil.example" } })
assert(r.status === 403, "reset from a foreign origin is rejected (CSRF)")
r = await call("/vitals")
assert(r.json.length > 0, "rejected cross-origin reset left data intact")
r = await call("/data/reset", { method: "POST", headers: { Origin: "http://localhost:5173" } })
assert(r.status === 200, "reset from the allowed origin passes the CSRF guard")
r = await call("/data/reset", { method: "POST" })
assert(r.status === 200, "reset ok")
r = await call("/portfolio")
assert(r.json.fdAmount === 0, "portfolio back to defaults after reset")
r = await call("/cards")
assert(r.json.creditCards.length === 0, "cards cleared after reset")
r = await call("/vitals")
assert(r.json.length === 0, "vitals cleared after reset")
r = await call("/travel")
assert(r.json.states.length === 0 && r.json.cities.length === 0, "travel cleared after reset")

console.log("\nALL SMOKE TESTS PASSED")
await mongo.stop()
process.exit(0)
