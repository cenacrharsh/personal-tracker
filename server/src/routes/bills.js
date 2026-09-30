import { Router } from "express"

import { BillPayment } from "../models/BillPayment.js"
import { billKeyPatterns, billPaidSchema, validate } from "../validation.js"

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

function checkKey(req, res, next) {
  const pattern = Object.hasOwn(billKeyPatterns, req.params.kind) && billKeyPatterns[req.params.kind]
  if (!pattern) return res.status(400).json({ error: "kind must be card or insurance" })
  if (!pattern.test(req.params.key)) return res.status(400).json({ error: "invalid bill key" })
  next()
}

// A row exists only while the bill is paid: PUT marks it paid, DELETE unpaid.
router.put("/:kind/:key", checkKey, validate(billPaidSchema), async (req, res) => {
  const { kind, key } = req.params
  await BillPayment.updateOne(
    { userId: req.userId, kind, key },
    { $set: { paid: true, paidAt: req.body.paidAt } },
    { upsert: true },
  )
  res.json({ ok: true })
})

router.delete("/:kind/:key", checkKey, async (req, res) => {
  const { kind, key } = req.params
  await BillPayment.deleteOne({ userId: req.userId, kind, key })
  res.json({ ok: true })
})

export default router
