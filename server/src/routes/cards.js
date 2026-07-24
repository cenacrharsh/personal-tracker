import { Router } from "express"

import { CreditCard } from "../models/CreditCard.js"
import { CardMonthly } from "../models/CardMonthly.js"
import { cardsSchema, validate } from "../validation.js"

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
// Upsert-then-prune (bulkWrite + deleteMany $nin) so there is never a window
// where the old data is gone and the new data isn't written yet.
router.put("/", validate(cardsSchema), async (req, res) => {
  const { creditCards, creditCardDataByYear } = req.body

  const postedCardIds = creditCards.map((c) => c.id)
  const configOps = creditCards.map((c) => ({
    updateOne: {
      filter: { userId: req.userId, cardId: c.id },
      update: {
        $set: {
          name: c.name,
          anniversaryStartMonth: c.anniversaryStartMonth,
          feeWaiverTarget: c.feeWaiverTarget,
          status: c.status,
          annualFeeType: c.annualFeeType,
          annualFeeAmount: c.annualFeeAmount,
          creditLimit: c.creditLimit,
          benefitsNote: c.benefitsNote,
        },
      },
      upsert: true,
    },
  }))

  const monthlyDocs = []
  for (const [year, byCard] of Object.entries(creditCardDataByYear)) {
    for (const [cardId, entry] of Object.entries(byCard ?? {})) {
      monthlyDocs.push({
        cardId,
        year: Number(year),
        cashback: entry?.cashback ?? {},
        expenses: entry?.expenses ?? {},
      })
    }
  }
  const monthlyOps = monthlyDocs.map((d) => ({
    updateOne: {
      filter: { userId: req.userId, cardId: d.cardId, year: d.year },
      update: { $set: { cashback: d.cashback, expenses: d.expenses } },
      upsert: true,
    },
  }))

  if (configOps.length) await CreditCard.bulkWrite(configOps)
  if (monthlyOps.length) await CardMonthly.bulkWrite(monthlyOps)

  await CreditCard.deleteMany({ userId: req.userId, cardId: { $nin: postedCardIds } })
  const monthlyPairs = monthlyDocs.map(({ cardId, year }) => ({ cardId, year }))
  await CardMonthly.deleteMany({
    userId: req.userId,
    ...(monthlyPairs.length ? { $nor: monthlyPairs } : {}),
  })

  res.json({ ok: true })
})

export default router
