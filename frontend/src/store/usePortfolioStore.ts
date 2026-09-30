import { create } from "zustand"

import {
  DEFAULT_BILLS,
  DEFAULT_PORTFOLIO,
  repository,
  type BillKind,
  type BillsData,
  type CreditCardConfig,
  type CreditCardYearData,
  type InsuranceDetails,
  type PortfolioData,
  type PortfolioPatch,
  type Snapshot,
} from "@/data"
import { clampEmergencyMonths, computeEmergencyFundTotal, computeTotals } from "@/lib/portfolioMath"
import { clampNonNeg } from "@/lib/money"
import { todayKey } from "@/lib/dates"
import { debounceSave, discardFailedSaves, flushSaves, trackSave } from "@/store/useSyncStore"
import { useTrackersStore } from "@/store/useTrackersStore"
import { useVitalsStore } from "@/store/useVitalsStore"
import { useTravelStore } from "@/store/useTravelStore"

export type {
  CreditCardConfig,
  CreditCardMonthlyEntry,
  CreditCardYearData,
  InsuranceDetails,
} from "@/data"

function emptyMonthMap(): Record<number, number> {
  const m: Record<number, number> = {}
  for (let i = 1; i <= 12; i += 1) m[i] = 0
  return m
}

const clampMonth = (n: number) => {
  const v = Math.round(Number.isFinite(n) ? n : 1)
  return Math.min(12, Math.max(1, v))
}

export type PortfolioState = PortfolioData & {
  creditCards: CreditCardConfig[]
  creditCardDataByYear: Record<number, CreditCardYearData>

  loaded: boolean
  snapshots: Snapshot[]
  bills: BillsData

  setAge: (age: number) => void
  setMonthlyIncome: (v: number) => void
  setMonthlyExpenses: (v: number) => void
  setSilverEnabled: (enabled: boolean) => void

  setZerodhaTotal: (v: number) => void
  setZerodhaGoldEtf: (v: number) => void
  setZerodhaSilverEtf: (v: number) => void

  setMfTotal: (v: number) => void
  setMfGold: (v: number) => void
  setMfSilver: (v: number) => void

  setFdAmount: (v: number) => void
  setRdAmount: (v: number) => void
  setEpfPpfAmount: (v: number) => void
  setBondsAmount: (v: number) => void
  setNpsAmount: (v: number) => void

  setCurrentEmergencyFund: (v: number) => void
  setEmergencyFdAmount: (v: number) => void
  setEmergencyRdAmount: (v: number) => void
  setEmergencyMonthsTarget: (v: number) => void

  setLifeInsurance: (details: Partial<InsuranceDetails>) => void
  setHealthInsurance: (details: Partial<InsuranceDetails>) => void

  setCreditCardMonthValue: (params: {
    year: number
    cardId: string
    month: number
    field: "cashback" | "expenses"
    value: number
  }) => void
  setCreditCardMeta: (cardId: string, details: Partial<Omit<CreditCardConfig, "id">>) => void
  addCreditCard: (name: string) => void
  removeCreditCard: (cardId: string) => void

  setCreditCardBillPaid: (params: { year: number; month: number; cardId: string; paid: boolean }) => void
  setInsuranceBillPaid: (params: { year: number; type: "life" | "health"; paid: boolean }) => void

  reset: () => Promise<void>
  hydrate: () => Promise<void>
}

function mergeInsurance(current: InsuranceDetails, details: Partial<InsuranceDetails>): InsuranceDetails {
  return {
    ...current,
    ...details,
    coverAmount: typeof details.coverAmount === "number" ? clampNonNeg(details.coverAmount) : current.coverAmount,
    premium: typeof details.premium === "number" ? clampNonNeg(details.premium) : current.premium,
  }
}

export const ccBillKey = (year: number, month: number, cardId: string) => `${year}-${month}-${cardId}`
export const insuranceBillKey = (year: number, type: "life" | "health") => `${year}-${type}`

type InsuranceField = "lifeInsurance" | "healthInsurance"
type ScalarField = Exclude<keyof PortfolioData, InsuranceField>
type CardSettings = Omit<CreditCardConfig, "id">

// Portfolio fields edited since the last save: "fdAmount", "lifeInsurance.premium", ...
const dirtyPortfolio = new Set<string>()
// Card settings edited since the last save, per card id.
const dirtyCards = new Map<string, Set<keyof CardSettings>>()
// Inputs to today's net-worth snapshot; editing anything else doesn't touch it.
const NET_WORTH_FIELDS = new Set<string>([
  "silverEnabled", "zerodhaTotal", "zerodhaGoldEtf", "zerodhaSilverEtf", "mfTotal", "mfGold", "mfSilver",
  "fdAmount", "rdAmount", "epfPpfAmount", "bondsAmount", "npsAmount",
  "currentEmergencyFund", "emergencyFdAmount", "emergencyRdAmount",
])
// A card's create, settings, month and delete requests share one queue, so
// they reach the server in order (no edit can arrive before the card exists).
const cardQueue = (cardId: string) => `card:${cardId}`

export const usePortfolioStore = create<PortfolioState>()((set, get) => {
  // Upserts today's net-worth point and keeps the local list in step. Queued
  // like any other save, so points arrive in order and reset waits for them.
  const saveSnapshot = async () => {
    const snap = snapshotFromState(get())
    if (snap.netWorth <= 0 && snap.emergencyFund <= 0) return
    await repository.upsertSnapshot(snap)
    set((s) => ({ snapshots: [...s.snapshots.filter((x) => x.date !== snap.date), snap] }))
  }

  // Sends only the changed portfolio fields, with their values at send time.
  const queuePortfolioSave = (paths: string[]) => {
    for (const p of paths) dirtyPortfolio.add(p)
    debounceSave("portfolio", async () => {
      const paths = [...dirtyPortfolio]
      if (paths.length === 0) return // already sent by a retry
      dirtyPortfolio.clear()
      const s = get()
      const patch: Record<string, unknown> = {}
      for (const path of paths) {
        const [field, sub] = path.split(".") as [keyof PortfolioData, keyof InsuranceDetails | undefined]
        if (sub) {
          const current = s[field as InsuranceField]
          patch[field] = { ...(patch[field] as object), [sub]: current[sub] }
        } else {
          patch[field] = s[field]
        }
      }
      try {
        await repository.updatePortfolio(patch as PortfolioPatch)
      } catch (e) {
        for (const p of paths) dirtyPortfolio.add(p) // resent on retry
        throw e
      }
      if (paths.some((p) => NET_WORTH_FIELDS.has(p))) trackSave("snapshot", saveSnapshot)
    })
  }

  const setField = <K extends ScalarField>(field: K, value: PortfolioData[K]) => {
    set({ [field]: value } as Partial<PortfolioState>)
    queuePortfolioSave([field])
  }

  const setInsurance = (field: InsuranceField, details: Partial<InsuranceDetails>) => {
    set((s) => ({ [field]: mergeInsurance(s[field], details) }))
    queuePortfolioSave(Object.keys(details).map((k) => `${field}.${k}`))
  }

  const saveBill = (kind: BillKind, key: string, paid: boolean, paidAt: number) =>
    trackSave(`bill:${kind}:${key}`, () =>
      paid ? repository.markBillPaid(kind, key, paidAt) : repository.markBillUnpaid(kind, key),
    )

  const cardExists = (cardId: string) => get().creditCards.some((c) => c.id === cardId)

  return {
    // Placeholders until hydrate() loads the real data; the app shows a
    // skeleton until `loaded` is true.
    ...DEFAULT_PORTFOLIO,
    creditCards: [],
    creditCardDataByYear: {},
    loaded: false,
    snapshots: [],
    bills: DEFAULT_BILLS,

    hydrate: async () => {
      const [portfolio, cards, snapshots, bills] = await Promise.all([
        repository.getPortfolio(),
        repository.getCreditCards(),
        repository.listSnapshots(),
        repository.getBills(),
      ])
      set({
        ...portfolio,
        creditCards: cards.creditCards,
        creditCardDataByYear: cards.creditCardDataByYear,
        snapshots,
        bills,
        loaded: true,
      })
      // One net-worth point per day the app is opened.
      trackSave("snapshot", saveSnapshot)
    },

    setAge: (age) => setField("age", clampNonNeg(age)),
    setMonthlyIncome: (v) => setField("monthlyIncome", clampNonNeg(v)),
    setMonthlyExpenses: (v) => setField("monthlyExpenses", clampNonNeg(v)),
    setSilverEnabled: (enabled) => {
      set(enabled ? { silverEnabled: true } : { silverEnabled: false, zerodhaSilverEtf: 0, mfSilver: 0 })
      queuePortfolioSave(enabled ? ["silverEnabled"] : ["silverEnabled", "zerodhaSilverEtf", "mfSilver"])
    },

    setZerodhaTotal: (v) => setField("zerodhaTotal", clampNonNeg(v)),
    setZerodhaGoldEtf: (v) => setField("zerodhaGoldEtf", clampNonNeg(v)),
    setZerodhaSilverEtf: (v) => setField("zerodhaSilverEtf", get().silverEnabled ? clampNonNeg(v) : 0),

    setMfTotal: (v) => setField("mfTotal", clampNonNeg(v)),
    setMfGold: (v) => setField("mfGold", clampNonNeg(v)),
    setMfSilver: (v) => setField("mfSilver", get().silverEnabled ? clampNonNeg(v) : 0),

    setFdAmount: (v) => setField("fdAmount", clampNonNeg(v)),
    setRdAmount: (v) => setField("rdAmount", clampNonNeg(v)),
    setEpfPpfAmount: (v) => setField("epfPpfAmount", clampNonNeg(v)),
    setBondsAmount: (v) => setField("bondsAmount", clampNonNeg(v)),
    setNpsAmount: (v) => setField("npsAmount", clampNonNeg(v)),

    setCurrentEmergencyFund: (v) => setField("currentEmergencyFund", clampNonNeg(v)),
    setEmergencyFdAmount: (v) => setField("emergencyFdAmount", clampNonNeg(v)),
    setEmergencyRdAmount: (v) => setField("emergencyRdAmount", clampNonNeg(v)),
    setEmergencyMonthsTarget: (v) => setField("emergencyMonthsTarget", clampEmergencyMonths(v)),

    setLifeInsurance: (details) => setInsurance("lifeInsurance", details),
    setHealthInsurance: (details) => setInsurance("healthInsurance", details),

    setCreditCardMonthValue: ({ year, cardId, month, field, value }) => {
      const safeYear = Math.round(Number.isFinite(year) ? year : new Date().getFullYear())
      const safeMonth = clampMonth(month)
      set((s) => {
        const yearData = s.creditCardDataByYear[safeYear] ?? {}
        const cardData =
          yearData[cardId] ?? { cashback: emptyMonthMap(), expenses: emptyMonthMap() }
        return {
          creditCardDataByYear: {
            ...s.creditCardDataByYear,
            [safeYear]: {
              ...yearData,
              [cardId]: {
                ...cardData,
                [field]: { ...cardData[field], [safeMonth]: clampNonNeg(value) },
              },
            },
          },
        }
      })
      debounceSave(
        `card:${cardId}:month:${safeYear}:${safeMonth}:${field}`,
        async () => {
          if (!cardExists(cardId)) return // removed meanwhile
          const latest = get().creditCardDataByYear[safeYear]?.[cardId]?.[field]?.[safeMonth] ?? 0
          await repository.setCardMonthValue(cardId, { year: safeYear, month: safeMonth, field, value: latest })
        },
        cardQueue(cardId),
      )
    },

    setCreditCardMeta: (cardId, details) => {
      set((s) => ({
        creditCards: s.creditCards.map((card) => {
          if (card.id !== cardId) return card
          return {
            ...card,
            ...details,
            anniversaryStartMonth:
              typeof details.anniversaryStartMonth === "number"
                ? clampMonth(details.anniversaryStartMonth)
                : card.anniversaryStartMonth,
            feeWaiverTarget:
              typeof details.feeWaiverTarget === "number"
                ? clampNonNeg(details.feeWaiverTarget)
                : card.feeWaiverTarget,
            status: details.status === "active" || details.status === "closed" ? details.status : card.status,
            annualFeeType:
              details.annualFeeType === "ltf" || details.annualFeeType === "paid"
                ? details.annualFeeType
                : card.annualFeeType,
            annualFeeAmount:
              typeof details.annualFeeAmount === "number"
                ? clampNonNeg(details.annualFeeAmount)
                : card.annualFeeAmount,
            creditLimit:
              typeof details.creditLimit === "number" ? clampNonNeg(details.creditLimit) : card.creditLimit,
            benefitsNote: typeof details.benefitsNote === "string" ? details.benefitsNote : card.benefitsNote,
          }
        }),
      }))
      const fields = dirtyCards.get(cardId) ?? new Set()
      for (const k of Object.keys(details)) fields.add(k as keyof CardSettings)
      dirtyCards.set(cardId, fields)
      debounceSave(
        `card:${cardId}:settings`,
        async () => {
          const changed = dirtyCards.get(cardId)
          const card = get().creditCards.find((c) => c.id === cardId)
          if (!changed || !card) return // already sent by a retry, or removed meanwhile
          dirtyCards.delete(cardId)
          const patch: Partial<CardSettings> = {}
          for (const f of changed) Object.assign(patch, { [f]: card[f] })
          try {
            await repository.updateCard(cardId, patch)
          } catch (e) {
            // Resent on retry, merged with anything edited since.
            const now = dirtyCards.get(cardId) ?? new Set()
            for (const f of changed) now.add(f)
            dirtyCards.set(cardId, now)
            throw e
          }
        },
        cardQueue(cardId),
      )
    },

    addCreditCard: (name) => {
      const trimmed = name.trim()
      if (!trimmed) return
      const baseId = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
      const card: CreditCardConfig = {
        id: `${baseId || "card"}-${Date.now().toString(36)}`,
        name: trimmed,
        anniversaryStartMonth: 1,
        feeWaiverTarget: 0,
        status: "active",
        annualFeeType: "ltf",
        annualFeeAmount: 0,
        creditLimit: 0,
        benefitsNote: "",
      }
      set((s) => ({ creditCards: [...s.creditCards, card] }))
      trackSave(
        `card:${card.id}:create`,
        async () => {
          if (cardExists(card.id)) await repository.createCard(card) // skip if removed before a retry
        },
        cardQueue(card.id),
      )
    },

    removeCreditCard: (cardId) => {
      set((s) => {
        const nextByYear: Record<number, CreditCardYearData> = {}
        for (const [yk, yv] of Object.entries(s.creditCardDataByYear)) {
          const next: CreditCardYearData = {}
          for (const [cid, entry] of Object.entries(yv)) {
            if (cid !== cardId) next[cid] = entry
          }
          nextByYear[Number(yk)] = next
        }
        return { creditCards: s.creditCards.filter((c) => c.id !== cardId), creditCardDataByYear: nextByYear }
      })
      dirtyCards.delete(cardId)
      trackSave(`card:${cardId}:delete`, () => repository.deleteCard(cardId), cardQueue(cardId))
    },

    setCreditCardBillPaid: ({ year, month, cardId, paid }) => {
      const key = ccBillKey(year, clampMonth(month), cardId)
      const paidAt = Date.now()
      set((s) => {
        const next = { ...s.bills.creditCards }
        if (paid) next[key] = { paid: true, paidAt }
        else delete next[key]
        return { bills: { ...s.bills, creditCards: next } }
      })
      saveBill("card", key, paid, paidAt)
    },

    setInsuranceBillPaid: ({ year, type, paid }) => {
      const key = insuranceBillKey(year, type)
      const paidAt = Date.now()
      set((s) => {
        const next = { ...s.bills.insurance }
        if (paid) next[key] = { paid: true, paidAt }
        else delete next[key]
        return { bills: { ...s.bills, insurance: next } }
      })
      saveBill("insurance", key, paid, paidAt)
    },

    reset: async () => {
      // Let every edit finish saving first: nothing can land after the wipe,
      // and if the reset fails no edit has been lost.
      await flushSaves()
      await repository.reset()
      // Wiped on the server, so failed saves and unsent fields are moot.
      discardFailedSaves()
      dirtyPortfolio.clear()
      dirtyCards.clear()
      set({
        ...DEFAULT_PORTFOLIO,
        creditCards: [],
        creditCardDataByYear: {},
        snapshots: [],
        bills: DEFAULT_BILLS,
      })
      // Trackers refetch on next visit.
      useTrackersStore.setState({ trackers: {}, loaded: false })
      useVitalsStore.setState({ reports: [] })
      useTravelStore.setState({ states: [], cities: [], loaded: false })
      // Then load the server's defaults; the screen is already cleared if this fails.
      await get().hydrate().catch(() => {})
    },
  }
})

function snapshotFromState(s: PortfolioState): Snapshot {
  const totals = computeTotals(s)
  return {
    date: todayKey(),
    ts: Date.now(),
    netWorth: totals.totalPortfolioValue,
    equity: totals.totalEquity,
    gold: totals.totalGold,
    silver: totals.totalSilver,
    debt: totals.totalDebt,
    emergencyFund: computeEmergencyFundTotal(s),
  }
}
