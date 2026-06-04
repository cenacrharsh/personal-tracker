export function formatINR(amount: number) {
  const safe = Number.isFinite(amount) ? amount : 0
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(safe)
}

export function formatCompactINR(amount: number) {
  const n = Number.isFinite(amount) ? amount : 0
  const abs = Math.abs(n)
  const sign = n < 0 ? "-" : ""
  if (abs >= 1_00_00_000) return `${sign}₹${(abs / 1_00_00_000).toFixed(2)} Cr`
  if (abs >= 1_00_000) return `${sign}₹${(abs / 1_00_000).toFixed(2)} L`
  if (abs >= 1_000) return `${sign}₹${(abs / 1_000).toFixed(1)} K`
  return `${sign}₹${Math.round(abs).toLocaleString("en-IN")}`
}

export function formatPercent(n: number, digits = 1) {
  if (!Number.isFinite(n)) return "0%"
  return `${n.toFixed(digits)}%`
}

export function formatSignedINR(n: number) {
  const safe = Number.isFinite(n) ? n : 0
  const sign = safe >= 0 ? "+" : "-"
  return `${sign}₹${Math.abs(Math.round(safe)).toLocaleString("en-IN")}`
}

export function clampNumber(value: unknown) {
  const n = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(n)) return 0
  return n
}

