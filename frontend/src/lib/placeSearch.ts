import { regionCodeFromName } from "@/lib/indiaRegions"

// Online fallback for places missing from the bundled city list, via
// OpenStreetMap's free Nominatim service. Its usage policy: searches only on
// an explicit user action (never as-you-type), at most one request a second,
// results cached, and OpenStreetMap credited wherever results are shown.

export type NominatimResult = {
  osm_type: "node" | "way" | "relation"
  osm_id: number
  lat: string
  lon: string
  name?: string
  addresstype?: string
  display_name: string
  address?: { state?: string }
}

export type OnlinePlace = {
  id: string // "osm:N756382658"
  name: string
  lat: number
  lng: number
  stateCode: string // "" when the state couldn't be worked out
  context: string // e.g. "Kullu, Himachal Pradesh"
}

// Whole regions aren't places you visit.
const AREA_TYPES = new Set(["country", "state", "state_district", "county"])

const round3 = (n: number) => Math.round(n * 1000) / 1000

export function placeFromNominatim(r: NominatimResult): OnlinePlace {
  const parts = r.display_name.split(",").map((p) => p.trim())
  const context = parts
    .slice(1)
    .filter((p) => p !== "India" && !/^\d+$/.test(p)) // drop country and PIN code
    .slice(-2)
    .join(", ")
  return {
    id: `osm:${r.osm_type[0].toUpperCase()}${r.osm_id}`,
    name: r.name || parts[0],
    lat: round3(Number(r.lat)),
    lng: round3(Number(r.lon)),
    stateCode: regionCodeFromName(r.address?.state ?? "") ?? "",
    context,
  }
}

export function placesFromNominatim(results: NominatimResult[]): OnlinePlace[] {
  const places = results.filter((r) => !AREA_TYPES.has(r.addresstype ?? "")).map(placeFromNominatim)
  return places.filter((p, i) => places.findIndex((q) => q.id === p.id) === i)
}

const cache = new Map<string, OnlinePlace[]>()
let lastRequestAt = 0

export async function searchPlacesOnline(query: string): Promise<OnlinePlace[]> {
  const q = query.trim()
  const key = q.toLowerCase()
  const cached = cache.get(key)
  if (cached) return cached

  const wait = lastRequestAt + 1000 - Date.now()
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
  lastRequestAt = Date.now()

  const params = new URLSearchParams({
    q,
    countrycodes: "in",
    format: "jsonv2",
    addressdetails: "1",
    limit: "6",
    "accept-language": "en",
  })
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`)
  if (!res.ok) throw new Error(`Search failed (${res.status})`)
  const places = placesFromNominatim((await res.json()) as NominatimResult[])
  cache.set(key, places)
  return places
}
