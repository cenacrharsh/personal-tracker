import { Router } from "express"

import { CreditCard } from "../models/CreditCard.js"
import { CardMonthly } from "../models/CardMonthly.js"

const router = Router()

const CONFIG_FIELDS = [
  "name", "anniversaryStartMonth", "feeWaiverTarget", "status",
  "annualFeeType", "annualFeeAmount", "creditLimit", "benefitsNote",
]

function configToClient(doc) {
  const out = { id: doc.cardId }
  for (const f of CONFIG_FIELDS) out[f] = doc[f]
  return out
}

// Mongoose Map fields are Map instances; JSON.stringify would turn them into {}.
const mapToObj = (m) => {
  if (!m) return {}
  if (m instanceof Map) return Object.fromEntries(m)
  if (typeof m.toObject === "function") return m.toObject()
  return m
}

// GET assembles { creditCards, creditCardDataByYear } from both collections.
router.get("/", async (req, res) => {
  const [configs, monthly] = await Promise.all([
    CreditCard.find({ userId: req.userId }),
    CardMonthly.find({ userId: req.userId }),
  ])

  const creditCards = configs.map(configToClient)

  const creditCardDataByYear = {}
  for (const m of monthly) {
    if (!creditCardDataByYear[m.year]) creditCardDataByYear[m.year] = {}
    creditCardDataByYear[m.year][m.cardId] = {
      cashback: mapToObj(m.cashback),
      expenses: mapToObj(m.expenses),
    }
  }

  res.json({ creditCards, creditCardDataByYear })
})

// PUT replaces the user's cards + monthly data with the posted blob.
// Whole-blob replace keeps mapping trivial; data volume is tiny.
router.put("/", async (req, res) => {
  const { creditCards = [], creditCardDataByYear = {} } = req.body ?? {}

  const configDocs = creditCards.map((c) => ({
    userId: req.userId,
    cardId: c.id,
    name: c.name,
    anniversaryStartMonth: c.anniversaryStartMonth,
    feeWaiverTarget: c.feeWaiverTarget,
    status: c.status,
    annualFeeType: c.annualFeeType,
    annualFeeAmount: c.annualFeeAmount,
    creditLimit: c.creditLimit,
    benefitsNote: c.benefitsNote,
  }))

  const monthlyDocs = []
  for (const [year, byCard] of Object.entries(creditCardDataByYear)) {
    for (const [cardId, entry] of Object.entries(byCard ?? {})) {
      monthlyDocs.push({
        userId: req.userId,
        cardId,
        year: Number(year),
        cashback: entry?.cashback ?? {},
        expenses: entry?.expenses ?? {},
      })
    }
  }

  await Promise.all([
    CreditCard.deleteMany({ userId: req.userId }),
    CardMonthly.deleteMany({ userId: req.userId }),
  ])
  await Promise.all([
    configDocs.length ? CreditCard.insertMany(configDocs) : null,
    monthlyDocs.length ? CardMonthly.insertMany(monthlyDocs) : null,
  ])

  res.json({ ok: true })
})

export default router
