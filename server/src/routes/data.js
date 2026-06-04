import { Router } from "express"

import { Portfolio } from "../models/Portfolio.js"
import { CreditCard } from "../models/CreditCard.js"
import { CardMonthly } from "../models/CardMonthly.js"
import { Snapshot } from "../models/Snapshot.js"
import { BillPayment } from "../models/BillPayment.js"
import { TrackerEntry } from "../models/TrackerEntry.js"
import { TrackerDef } from "../models/TrackerDef.js"

const router = Router()

// Wipe all of the current user's data (account itself is kept).
router.post("/reset", async (req, res) => {
  const userId = req.userId
  await Promise.all([
    Portfolio.deleteMany({ userId }),
    CreditCard.deleteMany({ userId }),
    CardMonthly.deleteMany({ userId }),
    Snapshot.deleteMany({ userId }),
    BillPayment.deleteMany({ userId }),
    TrackerEntry.deleteMany({ userId }),
    TrackerDef.deleteMany({ userId }),
  ])
  res.json({ ok: true })
})

export default router
