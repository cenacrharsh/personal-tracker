import { Router } from "express"

import { Portfolio } from "../models/Portfolio.js"
import { portfolioSchema, validate } from "../validation.js"

const router = Router()

const FIELDS = [
  "age", "monthlyIncome", "monthlyExpenses", "silverEnabled",
  "zerodhaTotal", "zerodhaGoldEtf", "zerodhaSilverEtf",
  "mfTotal", "mfGold", "mfSilver",
  "fdAmount", "rdAmount", "epfPpfAmount", "bondsAmount", "npsAmount",
  "currentEmergencyFund", "emergencyFdAmount", "emergencyRdAmount", "emergencyMonthsTarget",
  "lifeInsurance", "healthInsurance",
]

function toClient(doc) {
  const out = {}
  for (const f of FIELDS) out[f] = doc[f]
  return out
}

// GET the current portfolio. A user who has never saved gets the schema
// defaults, so the client never needs its own copy of them.
router.get("/", async (req, res) => {
  const doc = await Portfolio.findOne({ userId: req.userId })
  res.json(toClient(doc ?? new Portfolio({ userId: req.userId })))
})

// PATCH only the fields that changed. Insurance sub-fields are set one by one
// ("lifeInsurance.premium") so editing one never overwrites the others.
router.patch("/", validate(portfolioSchema), async (req, res) => {
  const update = {}
  for (const f of FIELDS) {
    if (!(f in req.body)) continue
    if (f === "lifeInsurance" || f === "healthInsurance") {
      for (const [k, v] of Object.entries(req.body[f])) update[`${f}.${k}`] = v
    } else {
      update[f] = req.body[f]
    }
  }
  const doc = await Portfolio.findOneAndUpdate(
    { userId: req.userId },
    { $set: update, $setOnInsert: { userId: req.userId } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  )
  res.json(toClient(doc))
})

export default router
