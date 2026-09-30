import type { TravelData, VisitedCity } from "@/data/types"

// A state counts as visited if it was marked directly or has at least one
// visited city — so adding a city marks its state without a second write.
export function visitedStateCodes(data: TravelData): Set<string> {
  return new Set([...data.states, ...data.cities.map((c) => c.stateCode)])
}

export function cityCountByState(cities: VisitedCity[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const c of cities) counts.set(c.stateCode, (counts.get(c.stateCode) ?? 0) + 1)
  return counts
}

// --- state colours ---

function hashCode(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) >>> 0
  return h
}

// Gives each region a colour index that looks random but never changes, and
// never matches a neighbour's. Regions with the most neighbours choose first;
// with more colours than any region has neighbours, a free colour always
// exists. Among free colours, one that doesn't resemble a neighbour's wins.
export function assignRegionColors(
  codes: string[],
  neighbors: number[][],
  colorCount: number,
  similar: (a: number, b: number) => boolean = () => false,
): number[] {
  const color = codes.map(() => -1)
  const order = codes
    .map((_, i) => i)
    .sort((a, b) => neighbors[b].length - neighbors[a].length || codes[a].localeCompare(codes[b]))
  for (const i of order) {
    const around = neighbors[i].map((n) => color[n]).filter((c) => c !== -1)
    const start = hashCode(codes[i]) % colorCount
    let best = -1
    let bestPenalty = Infinity
    for (let k = 0; k < colorCount; k++) {
      const c = (start + k) % colorCount
      if (around.includes(c)) continue
      const penalty = around.filter((n) => similar(c, n)).length
      if (penalty < bestPenalty) {
        best = c
        bestPenalty = penalty
      }
    }
    color[i] = best
  }
  return color
}

// --- city search ---

// Bundled GeoNames row: [geonameid, name, region code, lat, lng, population, aliases?].
// Sorted by population, largest first.
export type CityRow = [number, string, string, number, number, number, string[]?]

export type CityIndexEntry = { row: CityRow; keys: string[] }

export const cityIdFromRow = (row: CityRow) => `gn:${row[0]}`

// Lowercase, accents stripped ("Rishīkesh" -> "rishikesh").
export function normalizeName(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim()
}

export function buildCityIndex(rows: CityRow[]): CityIndexEntry[] {
  return rows.map((row) => ({ row, keys: [row[1], ...(row[6] ?? [])].map(normalizeName) }))
}

// 0 exact, 1 prefix, 2 prefix of a later word, 3 anywhere; -1 no match.
function matchRank(key: string, q: string): number {
  if (key === q) return 0
  if (key.startsWith(q)) return 1
  if (key.includes(` ${q}`) || key.includes(`-${q}`)) return 2
  if (key.includes(q)) return 3
  return -1
}

// Best matches first; within a rank, larger cities first (the index is
// population-sorted and the sort is stable). An empty query with a state
// filter lists that state's largest cities.
export function searchCities(
  index: CityIndexEntry[],
  query: string,
  { stateCode, limit = 8 }: { stateCode?: string; limit?: number } = {},
): CityRow[] {
  const q = normalizeName(query)
  const inState = (e: CityIndexEntry) => !stateCode || e.row[2] === stateCode
  if (!q) return stateCode ? index.filter(inState).slice(0, limit).map((e) => e.row) : []

  const hits: { row: CityRow; rank: number }[] = []
  for (const e of index) {
    if (!inState(e)) continue
    let best = -1
    for (const key of e.keys) {
      const r = matchRank(key, q)
      if (r !== -1 && (best === -1 || r < best)) best = r
    }
    if (best !== -1) hits.push({ row: e.row, rank: best })
  }
  return hits
    .sort((a, b) => a.rank - b.rank)
    .slice(0, limit)
    .map((h) => h.row)
}

// Indian units, one decimal below 10 ("4.5 L", "85 L", "1.3 Cr").
export function formatPopulation(n: number): string {
  const short = (v: number) => (v < 10 ? v.toFixed(1) : String(Math.round(v)))
  if (n >= 1e7) return `${short(n / 1e7)} Cr`
  if (n >= 1e5) return `${short(n / 1e5)} L`
  if (n >= 1e3) return `${Math.round(n / 1e3)}K`
  return String(n)
}
