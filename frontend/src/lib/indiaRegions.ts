import { normalizeName } from "@/lib/travel"

export type RegionType = "state" | "ut"

export type Region = {
  code: string // stable id stored on the server — never renumber once data exists
  name: string
  type: RegionType
}

// All 28 states and 8 union territories. Codes also appear in
// scripts/build-travel-data.mjs, which bakes them into the map and city data.
export const INDIA_REGIONS: Region[] = [
  { code: "AN", name: "Andaman and Nicobar Islands", type: "ut" },
  { code: "AP", name: "Andhra Pradesh", type: "state" },
  { code: "AR", name: "Arunachal Pradesh", type: "state" },
  { code: "AS", name: "Assam", type: "state" },
  { code: "BR", name: "Bihar", type: "state" },
  { code: "CH", name: "Chandigarh", type: "ut" },
  { code: "CG", name: "Chhattisgarh", type: "state" },
  { code: "DD", name: "Dadra and Nagar Haveli and Daman and Diu", type: "ut" },
  { code: "DL", name: "Delhi", type: "ut" },
  { code: "GA", name: "Goa", type: "state" },
  { code: "GJ", name: "Gujarat", type: "state" },
  { code: "HR", name: "Haryana", type: "state" },
  { code: "HP", name: "Himachal Pradesh", type: "state" },
  { code: "JK", name: "Jammu and Kashmir", type: "ut" },
  { code: "JH", name: "Jharkhand", type: "state" },
  { code: "KA", name: "Karnataka", type: "state" },
  { code: "KL", name: "Kerala", type: "state" },
  { code: "LA", name: "Ladakh", type: "ut" },
  { code: "LD", name: "Lakshadweep", type: "ut" },
  { code: "MP", name: "Madhya Pradesh", type: "state" },
  { code: "MH", name: "Maharashtra", type: "state" },
  { code: "MN", name: "Manipur", type: "state" },
  { code: "ML", name: "Meghalaya", type: "state" },
  { code: "MZ", name: "Mizoram", type: "state" },
  { code: "NL", name: "Nagaland", type: "state" },
  { code: "OD", name: "Odisha", type: "state" },
  { code: "PY", name: "Puducherry", type: "ut" },
  { code: "PB", name: "Punjab", type: "state" },
  { code: "RJ", name: "Rajasthan", type: "state" },
  { code: "SK", name: "Sikkim", type: "state" },
  { code: "TN", name: "Tamil Nadu", type: "state" },
  { code: "TG", name: "Telangana", type: "state" },
  { code: "TR", name: "Tripura", type: "state" },
  { code: "UP", name: "Uttar Pradesh", type: "state" },
  { code: "UK", name: "Uttarakhand", type: "state" },
  { code: "WB", name: "West Bengal", type: "state" },
]

export const regionByCode: Record<string, Region> = Object.fromEntries(
  INDIA_REGIONS.map((r) => [r.code, r]),
)

export const STATE_COUNT = INDIA_REGIONS.filter((r) => r.type === "state").length
export const UT_COUNT = INDIA_REGIONS.filter((r) => r.type === "ut").length

// Picker order: alphabetical by name.
export const REGIONS_BY_NAME = [...INDIA_REGIONS].sort((a, b) => a.name.localeCompare(b.name))

// Older or alternate spellings that online search may return.
const NAME_ALIASES: Record<string, string> = {
  "andaman and nicobar": "AN",
  "national capital territory of delhi": "DL",
  "nct of delhi": "DL",
  "new delhi": "DL",
  "dadra and nagar haveli": "DD",
  "daman and diu": "DD",
  pondicherry: "PY",
  orissa: "OD",
  uttaranchal: "UK",
}

const simplifyName = (s: string) =>
  normalizeName(s).replace(/&/g, " and ").replace(/^the /, "").replace(/\s+/g, " ").trim()

const CODE_BY_NAME: Record<string, string> = {
  ...Object.fromEntries(INDIA_REGIONS.map((r) => [simplifyName(r.name), r.code])),
  ...NAME_ALIASES,
}

// "Himachal Pradesh" -> "HP"; undefined when the name isn't a state/UT.
export function regionCodeFromName(name: string): string | undefined {
  return CODE_BY_NAME[simplifyName(name)]
}
