import type { CreditCardYearData } from "@/store/usePortfolioStore"

export type CreditCardMonthlyRecord = {
  year: number
  month: number
  cardId: string
  cashback: number
  expenses: number
}

// Flatten nested local state into row records (DB/API friendly).
export function toCreditCardMonthlyRecords(
  creditCardDataByYear: Record<number, CreditCardYearData>,
): CreditCardMonthlyRecord[] {
  const records: CreditCardMonthlyRecord[] = []

  for (const [yearKey, yearData] of Object.entries(creditCardDataByYear)) {
    const year = Number(yearKey)
    for (const [cardId, entry] of Object.entries(yearData)) {
      for (let month = 1; month <= 12; month += 1) {
        records.push({
          year,
          month,
          cardId,
          cashback: Number(entry.cashback[month] ?? 0),
          expenses: Number(entry.expenses[month] ?? 0),
        })
      }
    }
  }

  return records
}

// Rebuild nested state from row records (for backend response hydration).
export function fromCreditCardMonthlyRecords(records: CreditCardMonthlyRecord[]) {
  const byYear: Record<number, CreditCardYearData> = {}

  for (const record of records) {
    if (!byYear[record.year]) byYear[record.year] = {}
    if (!byYear[record.year][record.cardId]) {
      byYear[record.year][record.cardId] = {
        cashback: {},
        expenses: {},
      }
    }
    byYear[record.year][record.cardId].cashback[record.month] = Number(record.cashback || 0)
    byYear[record.year][record.cardId].expenses[record.month] = Number(record.expenses || 0)
  }

  return byYear
}

