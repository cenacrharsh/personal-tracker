import { Router } from "express"

import { Portfolio } from "../models/Portfolio.js"
import { portfolioSchema, validate } from "../validation.js"

const router = Router()

const FIELDS = [
  "age", "monthlyIncome", "silverEnabled",
  "zerodhaTotal", "zerodhaGoldEtf", "zerodhaSilverEtf",
  "mfTotal", "mfGold", "mfSilver",
  "fdAmount", "rdAmount", "epfPpfAmount",
  "currentEmergencyFund", "lifeInsurance", "healthInsurance",
]

function toClient(doc) {
  const out = {}
  for (const f of FIELDS) out[f] = doc[f]
  return out
}

// GET current portfolio (null if never saved — frontend falls back to defaults).
router.get("/", async (req, res) => {
  const doc = await Portfolio.findOne({ userId: req.userId })
  res.json(doc ? toClient(doc) : null)
})

// PUT the whole portfolio blob.
router.put("/", validate(portfolioSchema), async (req, res) => {
  const update = {}
  for (const f of FIELDS) if (f in req.body) update[f] = req.body[f]
  const doc = await Portfolio.findOneAndUpdate(
    { userId: req.userId },
    { $set: update, $setOnInsert: { userId: req.userId } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  )
  res.json(toClient(doc))
})

export default router
