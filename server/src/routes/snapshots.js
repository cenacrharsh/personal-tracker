import { Router } from "express"

import { Snapshot } from "../models/Snapshot.js"
import { snapshotSchema, validate } from "../validation.js"

const router = Router()

const FIELDS = ["date", "ts", "netWorth", "equity", "gold", "silver", "debt", "emergencyFund"]

// Keep at most this many snapshots per user (~2 years of daily points),
// matching the client-side localStorage cap.
const MAX_SNAPSHOTS = 730

function toClient(doc) {
  const out = {}
  for (const f of FIELDS) out[f] = doc[f]
  return out
}

// GET all snapshots, ascending by timestamp.
router.get("/", async (req, res) => {
  const docs = await Snapshot.find({ userId: req.userId }).sort({ ts: 1 })
  res.json(docs.map(toClient))
})

// POST upserts a snapshot by date.
router.post("/", validate(snapshotSchema), async (req, res) => {
  const { date } = req.body

  const update = {}
  for (const f of FIELDS) if (f in req.body) update[f] = req.body[f]

  await Snapshot.findOneAndUpdate(
    { userId: req.userId, date },
    { $set: { ...update, userId: req.userId } },
    { upsert: true, setDefaultsOnInsert: true },
  )

  const count = await Snapshot.countDocuments({ userId: req.userId })
  if (count > MAX_SNAPSHOTS) {
    const oldest = await Snapshot.find({ userId: req.userId })
      .sort({ ts: 1 })
      .limit(count - MAX_SNAPSHOTS)
      .select("_id")
    await Snapshot.deleteMany({ _id: { $in: oldest.map((d) => d._id) } })
  }

  res.json({ ok: true })
})

export default router
