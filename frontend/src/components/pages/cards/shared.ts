export { MONTHS } from "@/lib/dates"

const PREFERRED_CARD_ORDER = [
  "SBI Cashback",
  "SBI PhonePe",
  "HSBC Live+",
  "Kotak Platinum",
  "Amazon ICICI",
  "HDFC Millenia",
]
const PREFERRED_RANK = new Map(
  PREFERRED_CARD_ORDER.map((name, i) => [name.toLowerCase(), i]),
)
export function rankForCard(name: string): number {
  return PREFERRED_RANK.get(name.toLowerCase()) ?? Number.POSITIVE_INFINITY
}

export type View = "overview" | "card" | "settings"
export type DataField = "cashback" | "expenses"

const PALETTE = [
  "#6366f1",
  "#f59e0b",
  "#10b981",
  "#06b6d4",
  "#ec4899",
  "#a855f7",
  "#f43f5e",
  "#84cc16",
  "#0ea5e9",
  "#fb923c",
]

function safeNum(n: unknown) {
  const v = typeof n === "number" ? n : Number(n)
  return Number.isFinite(v) ? v : 0
}

export function colorFor(idx: number) {
  return PALETTE[idx % PALETTE.length]
}

export function getMonthValue(
  dataByYear: Record<number, Record<string, { cashback: Record<number, number>; expenses: Record<number, number> }>>,
  year: number,
  cardId: string,
  month: number,
  field: DataField,
) {
  return safeNum(dataByYear[year]?.[cardId]?.[field]?.[month] ?? 0)
}
