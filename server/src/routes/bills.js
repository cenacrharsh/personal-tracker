import { Router } from "express"

import { BillPayment } from "../models/BillPayment.js"
import { billsSchema, validate } from "../validation.js"

const router = Router()

// GET assembles { creditCards: {key:status}, insurance: {key:status} }.
router.get("/", async (req, res) => {
  const docs = await BillPayment.find({ userId: req.userId })
  const out = { creditCards: {}, insurance: {} }
  for (const d of docs) {
    const bucket = d.kind === "insurance" ? out.insurance : out.creditCards
    bucket[d.key] = { paid: d.paid, paidAt: d.paidAt }
  }
  res.json(out)
})

// PUT replaces the user's bill payments with the posted blob.
// Upsert-then-prune so there is never a window where the old data is gone
// and the new data isn't written yet.
router.put("/", validate(billsSchema), async (req, res) => {
  const { creditCards, insurance } = req.body

  const cardKeys = Object.keys(creditCards)
  const insuranceKeys = Object.keys(insurance)

  const ops = []
  for (const [key, status] of Object.entries(creditCards)) {
    ops.push({
      updateOne: {
        filter: { userId: req.userId, kind: "card", key },
        update: { $set: { paid: !!status?.paid, paidAt: status?.paidAt } },
        upsert: true,
      },
    })
  }
  for (const [key, status] of Object.entries(insurance)) {
    ops.push({
      updateOne: {
        filter: { userId: req.userId, kind: "insurance", key },
        update: { $set: { paid: !!status?.paid, paidAt: status?.paidAt } },
        upsert: true,
      },
    })
  }
  if (ops.length) await BillPayment.bulkWrite(ops)

  await BillPayment.deleteMany({ userId: req.userId, kind: "card", key: { $nin: cardKeys } })
  await BillPayment.deleteMany({ userId: req.userId, kind: "insurance", key: { $nin: insuranceKeys } })

  res.json({ ok: true })
})

export default router
