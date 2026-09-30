import { z } from "zod"

// Shared building blocks. z.number() in zod v4 already rejects NaN/Infinity.
const nonNeg = z.number().min(0)
const datePattern = /^\d{4}-\d{2}-\d{2}$/
const dateStr = z.string().regex(datePattern, "date must be YYYY-MM-DD")

// For routes with a `:date` param.
export function checkDateParam(req, res, next) {
  if (!datePattern.test(req.params.date)) return res.status(400).json({ error: "date must be YYYY-MM-DD" })
  next()
}

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
  monthlyExpenses: nonNeg.optional(),
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
  bondsAmount: nonNeg.optional(),
  npsAmount: nonNeg.optional(),
  currentEmergencyFund: nonNeg.optional(),
  emergencyFdAmount: nonNeg.optional(),
  emergencyRdAmount: nonNeg.optional(),
  emergencyMonthsTarget: z.number().int().min(3).max(6).optional(),
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

export const cardCreateSchema = cardConfigSchema
export const cardPatchSchema = cardConfigSchema.omit({ id: true }).partial()

export const cardMonthSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  field: z.enum(["cashback", "expenses"]),
  value: nonNeg,
})

// --- bills ---

// One row per paid bill; the key format depends on the kind.
export const billKeyPatterns = {
  card: /^\d{4}-\d{1,2}-.+$/, // `${year}-${month}-${cardId}`
  insurance: /^\d{4}-(life|health)$/, // `${year}-${type}`
}

export const billPaidSchema = z.object({
  paidAt: z.number().optional(),
})

// --- trackers ---

export const trackerKeyPattern = /^[\w-]{1,40}$/

// --- vitals ---

export const vitalsPutSchema = z.object({
  lab: z.string().max(500).optional(),
  notes: z.string().max(500).optional(),
  results: z
    .record(z.string().regex(/^[a-z0-9-]{1,40}$/, "invalid metric key"), z.number().positive("metric values must be > 0"))
    .refine((r) => Object.keys(r).length <= 60, "too many metrics"),
})
