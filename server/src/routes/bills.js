import { Router } from "express"

import { BillPayment } from "../models/BillPayment.js"

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
router.put("/", async (req, res) => {
  const { creditCards = {}, insurance = {} } = req.body ?? {}

  const docs = []
  for (const [key, status] of Object.entries(creditCards)) {
    docs.push({ userId: req.userId, kind: "card", key, paid: !!status?.paid, paidAt: status?.paidAt })
  }
  for (const [key, status] of Object.entries(insurance)) {
    docs.push({ userId: req.userId, kind: "insurance", key, paid: !!status?.paid, paidAt: status?.paidAt })
  }

  await BillPayment.deleteMany({ userId: req.userId })
  if (docs.length) await BillPayment.insertMany(docs)

  res.json({ ok: true })
})

export default router
