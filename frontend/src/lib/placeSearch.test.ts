import { describe, expect, it } from "vitest"

import { INDIA_REGIONS, regionCodeFromName } from "./indiaRegions"
import { placeFromNominatim, placesFromNominatim, type NominatimResult } from "./placeSearch"

// Shapes taken from real Nominatim responses (Sept 2026).
const kasol: NominatimResult = {
  osm_type: "node",
  osm_id: 756382658,
  lat: "32.0098",
  lon: "77.3148",
  name: "Kasol",
  addresstype: "town",
  display_name: "Kasol, Bhuntar, Kullu, Himachal Pradesh, 175105, India",
  address: { state: "Himachal Pradesh" },
}
const tawangDistrict: NominatimResult = {
  osm_type: "relation",
  osm_id: 3841145,
  lat: "27.7",
  lon: "91.9",
  name: "Tawang district",
  addresstype: "state_district",
  display_name: "Tawang district, Arunachal Pradesh, India",
  address: { state: "Arunachal Pradesh" },
}

describe("regionCodeFromName", () => {
  it("recognises every state and UT by its own name", () => {
    for (const r of INDIA_REGIONS) expect(regionCodeFromName(r.name)).toBe(r.code)
  })

  it("ignores case, accents, '&' and a leading 'The'", () => {
    expect(regionCodeFromName("himachal pradesh")).toBe("HP")
    expect(regionCodeFromName("Jammu & Kashmir")).toBe("JK")
    expect(regionCodeFromName("The Dadra and Nagar Haveli and Daman and Diu")).toBe("DD")
  })

  it("knows older names", () => {
    expect(regionCodeFromName("Orissa")).toBe("OD")
    expect(regionCodeFromName("Pondicherry")).toBe("PY")
    expect(regionCodeFromName("National Capital Territory of Delhi")).toBe("DL")
    expect(regionCodeFromName("Andaman and Nicobar")).toBe("AN")
  })

  it("returns undefined for anything else", () => {
    expect(regionCodeFromName("")).toBeUndefined()
    expect(regionCodeFromName("Kullu")).toBeUndefined()
  })
})

describe("placeFromNominatim", () => {
  it("turns a result into a place with its state, rounded location and short context", () => {
    expect(placeFromNominatim(kasol)).toEqual({
      id: "osm:N756382658",
      name: "Kasol",
      lat: 32.01,
      lng: 77.315,
      stateCode: "HP",
      context: "Kullu, Himachal Pradesh",
    })
  })

  it("falls back to the first part of the address for a missing name, and leaves an unknown state blank", () => {
    const place = placeFromNominatim({ ...kasol, name: "", address: {} })
    expect(place.name).toBe("Kasol")
    expect(place.stateCode).toBe("")
  })

  it("drops whole regions and duplicate results", () => {
    const places = placesFromNominatim([kasol, tawangDistrict, kasol])
    expect(places.map((p) => p.id)).toEqual(["osm:N756382658"])
  })
})
