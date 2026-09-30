import { describe, expect, it } from "vitest"

import type { VisitedCity } from "@/data/types"
import citiesJson from "@/data/geo/india-cities.json"
import statesTopo from "@/data/geo/india-states.topo.json"
import { INDIA_REGIONS, STATE_COUNT, UT_COUNT } from "./indiaRegions"
import { neighbors } from "topojson-client"
import type { GeometryCollection, Topology } from "topojson-specification"
import { TRAVEL_STATE_COLORS, travelColorsSimilar } from "./tokens"
import {
  assignRegionColors,
  buildCityIndex,
  cityCountByState,
  formatPopulation,
  normalizeName,
  searchCities,
  visitedStateCodes,
  type CityRow,
} from "./travel"

const city = (id: string, stateCode: string): VisitedCity => ({ id, name: id, stateCode, lat: 0, lng: 0 })

describe("visitedStateCodes", () => {
  it("marks a state visited when it has a city, without marking it directly", () => {
    const visited = visitedStateCodes({ states: [], cities: [city("gn:1", "KA")] })
    expect([...visited]).toEqual(["KA"])
  })

  it("combines directly marked states and city states without duplicates", () => {
    const visited = visitedStateCodes({ states: ["KA", "GA"], cities: [city("gn:1", "KA"), city("gn:2", "MH")] })
    expect([...visited].sort()).toEqual(["GA", "KA", "MH"])
  })

  it("unmarks a state once its only city is removed, if it wasn't marked", () => {
    expect(visitedStateCodes({ states: [], cities: [] }).has("KA")).toBe(false)
    expect(visitedStateCodes({ states: ["KA"], cities: [] }).has("KA")).toBe(true)
  })
})

describe("cityCountByState", () => {
  it("counts cities per state", () => {
    const counts = cityCountByState([city("a", "KA"), city("b", "KA"), city("c", "GA")])
    expect(counts.get("KA")).toBe(2)
    expect(counts.get("GA")).toBe(1)
    expect(counts.get("MH")).toBeUndefined()
  })
})

describe("assignRegionColors", () => {
  const topo = statesTopo as unknown as Topology<{ states: GeometryCollection }>
  const geometries = topo.objects.states.geometries
  const codes = geometries.map((g) => String(g.id))
  const around = neighbors(geometries)
  const colors = assignRegionColors(codes, around, TRAVEL_STATE_COLORS.length, travelColorsSimilar)
  const neighborPairs = around.flatMap((ns, i) => ns.filter((j) => j > i).map((j) => [i, j]))

  it("colours every region", () => {
    expect(colors.every((c) => c >= 0 && c < TRAVEL_STATE_COLORS.length)).toBe(true)
  })

  it("never gives neighbouring states the same or a look-alike colour", () => {
    expect(neighborPairs.length).toBeGreaterThan(50) // the map really has shared borders
    expect(neighborPairs.filter(([a, b]) => colors[a] === colors[b])).toEqual([])
    expect(neighborPairs.filter(([a, b]) => travelColorsSimilar(colors[a], colors[b]))).toEqual([])
  })

  it("gives the same colours every time", () => {
    expect(assignRegionColors(codes, around, TRAVEL_STATE_COLORS.length, travelColorsSimilar)).toEqual(colors)
  })

  it("uses a good spread of the palette", () => {
    expect(new Set(colors).size).toBeGreaterThanOrEqual(8)
  })

  it("finds the one free colour when every other colour is taken by a neighbour", () => {
    const allTouching = [[1, 2, 3], [0, 2, 3], [0, 1, 3], [0, 1, 2]]
    const result = assignRegionColors(["A", "B", "C", "D"], allTouching, 4)
    expect([...result].sort()).toEqual([0, 1, 2, 3])
  })
})

describe("searchCities", () => {
  const rows: CityRow[] = [
    [1, "Udaipur", "RJ", 24.57, 73.69, 451100],
    [2, "Bengaluru", "KA", 12.97, 77.59, 8495492, ["Bangalore"]],
    [3, "Rishīkesh", "UK", 30.1, 78.29, 66390],
    [4, "Udaipur", "TR", 23.53, 91.48, 32758],
    [5, "New Udaipur", "RJ", 0, 0, 20000],
    [6, "Hampi", "KA", 15.33, 76.46, 10000],
  ].sort((a, b) => (b[5] as number) - (a[5] as number)) as CityRow[]
  const index = buildCityIndex(rows)
  const names = (r: CityRow[]) => r.map((x) => `${x[1]}:${x[2]}`)

  it("ignores accents and case", () => {
    expect(normalizeName("  Rishīkesh ")).toBe("rishikesh")
    expect(names(searchCities(index, "RISHIKESH"))).toEqual(["Rishīkesh:UK"])
  })

  it("finds a city by its old name", () => {
    expect(names(searchCities(index, "bangal"))).toEqual(["Bengaluru:KA"])
  })

  it("lists same-named cities in different states, larger first, before partial matches", () => {
    expect(names(searchCities(index, "udaipur"))).toEqual(["Udaipur:RJ", "Udaipur:TR", "New Udaipur:RJ"])
  })

  it("ranks prefix matches above matches inside the name", () => {
    expect(names(searchCities(index, "u"))[0]).toBe("Udaipur:RJ")
    expect(names(searchCities(index, "pur")).length).toBe(3)
  })

  it("filters to a state, and lists its largest cities for an empty query", () => {
    expect(names(searchCities(index, "udaipur", { stateCode: "TR" }))).toEqual(["Udaipur:TR"])
    expect(names(searchCities(index, "", { stateCode: "KA" }))).toEqual(["Bengaluru:KA", "Hampi:KA"])
    expect(searchCities(index, "   ")).toEqual([])
  })

  it("respects the limit", () => {
    expect(searchCities(index, "u", { limit: 2 }).length).toBe(2)
  })
})

describe("formatPopulation", () => {
  it("uses Indian units", () => {
    expect(formatPopulation(8495492)).toBe("85 L")
    expect(formatPopulation(451100)).toBe("4.5 L")
    expect(formatPopulation(12691836)).toBe("1.3 Cr")
    expect(formatPopulation(66390)).toBe("66K")
    expect(formatPopulation(900)).toBe("900")
  })
})

describe("bundled data", () => {
  const codes = new Set(INDIA_REGIONS.map((r) => r.code))

  it("has all 28 states and 8 UTs", () => {
    expect(STATE_COUNT).toBe(28)
    expect(UT_COUNT).toBe(8)
    expect(codes.size).toBe(36)
  })

  it("draws every region exactly once on the map", () => {
    const ids = statesTopo.objects.states.geometries.map((g) => g.id).sort()
    expect(ids).toEqual([...codes].sort())
  })

  it("gives every city a known region, and places key cities correctly", () => {
    const rows = citiesJson as unknown as CityRow[]
    expect(rows.every((r) => codes.has(r[2]))).toBe(true)
    const stateOf = (name: string) => rows.find((r) => r[1] === name)?.[2]
    expect(stateOf("Leh")).toBe("LA")
    expect(stateOf("Hyderabad")).toBe("TG")
    expect(stateOf("Silvassa")).toBe("DD")
    expect(stateOf("Port Blair")).toBe("AN")
    expect(stateOf("Srinagar")).toBe("JK")
  })
})
