import { z } from "zod"

// Shared building blocks. z.number() in zod v4 already rejects NaN/Infinity.
const nonNeg = z.number().min(0)
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD")

// Returns 400 with the first issue message on failure; replaces req.body with
// the parsed data so unknown keys are stripped.
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body ?? {})
    if (!result.success) {
      return res.status(400).json({ error: result.error.issues[0]?.message ?? "Invalid request body" })
    }
    req.body = result.data
    next()
  }
}

// --- auth ---

export const signupSchema = z.object({
  name: z.string().trim().min(1, "name is required"),
  email: z.string().trim().email("A valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

export const loginSchema = z.object({
  email: z.string().trim().min(1, "email is required"),
  password: z.string().min(1, "password is required"),
})

// --- portfolio ---

const insuranceSchema = z.object({
  enabled: z.boolean().optional(),
  coverAmount: nonNeg.optional(),
  premium: nonNeg.optional(),
  renewalDate: z.string().max(20).optional(),
})

export const portfolioSchema = z.object({
  age: nonNeg.optional(),
  monthlyIncome: nonNeg.optional(),
  silverEnabled: z.boolean().optional(),
  zerodhaTotal: nonNeg.optional(),
  zerodhaGoldEtf: nonNeg.optional(),
  zerodhaSilverEtf: nonNeg.optional(),
  mfTotal: nonNeg.optional(),
  mfGold: nonNeg.optional(),
  mfSilver: nonNeg.optional(),
  fdAmount: nonNeg.optional(),
  rdAmount: nonNeg.optional(),
  epfPpfAmount: nonNeg.optional(),
  currentEmergencyFund: nonNeg.optional(),
  lifeInsurance: insuranceSchema.optional(),
  healthInsurance: insuranceSchema.optional(),
})

// --- snapshots ---

export const snapshotSchema = z.object({
  date: dateStr,
  ts: z.number(),
  netWorth: z.number().optional(),
  equity: z.number().optional(),
  gold: z.number().optional(),
  silver: z.number().optional(),
  debt: z.number().optional(),
  emergencyFund: z.number().optional(),
})

// --- cards ---

// JSON month keys arrive as strings "1".."12".
const monthMap = z.record(z.string().regex(/^([1-9]|1[0-2])$/, "month keys must be 1-12"), nonNeg)

const cardConfigSchema = z.object({
  id: z.string().min(1, "card id is required"),
  name: z.string().max(200),
  anniversaryStartMonth: z.number().int().min(1).max(12).optional(),
  feeWaiverTarget: nonNeg.optional(),
  status: z.enum(["active", "closed"]).optional(),
  annualFeeType: z.enum(["ltf", "paid"]).optional(),
  annualFeeAmount: nonNeg.optional(),
  creditLimit: nonNeg.optional(),
  benefitsNote: z.string().max(2000).optional(),
})

export const cardsSchema = z.object({
  creditCards: z.array(cardConfigSchema).default([]),
  creditCardDataByYear: z
    .record(
      z.string().regex(/^\d{4}$/, "year keys must be YYYY"),
      z.record(
        z.string().min(1),
        z.object({
          cashback: monthMap.default({}),
          expenses: monthMap.default({}),
        }),
      ),
    )
    .default({}),
})

// --- bills ---

const billStatus = z.object({
  paid: z.boolean(),
  paidAt: z.number().optional(),
})

export const billsSchema = z.object({
  creditCards: z.record(z.string().regex(/^\d{4}-\d{1,2}-.+$/, "card bill keys must be YYYY-M-cardId"), billStatus).default({}),
  insurance: z.record(z.string().regex(/^\d{4}-(life|health)$/, "insurance keys must be YYYY-life|health"), billStatus).default({}),
})

// --- trackers ---

export const trackersSchema = z.record(
  z.string().regex(/^[\w-]{1,40}$/, "invalid tracker key"),
  z.object({ entries: z.array(dateStr).default([]) }),
)

// --- vitals ---

export const vitalsDateParam = /^\d{4}-\d{2}-\d{2}$/

export const vitalsPutSchema = z.object({
  lab: z.string().max(500).optional(),
  notes: z.string().max(500).optional(),
  results: z
    .record(z.string().regex(/^[a-z0-9-]{1,40}$/, "invalid metric key"), z.number().positive("metric values must be > 0"))
    .refine((r) => Object.keys(r).length <= 60, "too many metrics"),
})
