import { Router } from "express"
import mongoose from "mongoose"

import { Portfolio } from "../models/Portfolio.js"
import { CreditCard } from "../models/CreditCard.js"
import { CardMonthly } from "../models/CardMonthly.js"
import { Snapshot } from "../models/Snapshot.js"
import { BillPayment } from "../models/BillPayment.js"
import { TrackerEntry } from "../models/TrackerEntry.js"
import { VitalsReport } from "../models/VitalsReport.js"

const router = Router()

const deleteAll = (userId, session) => Promise.all([
  Portfolio.deleteMany({ userId }, { session }),
  CreditCard.deleteMany({ userId }, { session }),
  CardMonthly.deleteMany({ userId }, { session }),
  Snapshot.deleteMany({ userId }, { session }),
  BillPayment.deleteMany({ userId }, { session }),
  TrackerEntry.deleteMany({ userId }, { session }),
  VitalsReport.deleteMany({ userId }, { session }),
])

// Wipe all of the current user's data (account itself is kept).
// Uses a transaction so the wipe across 7 collections is all-or-nothing;
// falls back to a plain Promise.all on standalone Mongo (no replica set),
// which doesn't support transactions.
router.post("/reset", async (req, res) => {
  const userId = req.userId
  const session = await mongoose.startSession()
  try {
    await session.withTransaction(() => deleteAll(userId, session))
  } catch (err) {
    // Standalone Mongo (no replica set, e.g. local dev / mongodb-memory-server)
    // can't run transactions — fall back to a plain (non-atomic) wipe.
    const noTxnSupport = /Transaction numbers|IllegalOperation/i.test(err?.message ?? "")
    if (!noTxnSupport) throw err
    await deleteAll(userId, undefined)
  } finally {
    await session.endSession()
  }
  res.json({ ok: true })
})

export default router
