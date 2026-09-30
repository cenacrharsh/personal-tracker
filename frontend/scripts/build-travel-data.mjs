// Generates the Travel map's bundled data. Run by hand when the sources change:
//   node scripts/build-travel-data.mjs
// Outputs (committed): src/data/geo/india-states.topo.json, src/data/geo/india-cities.json
//
// Sources:
// - State boundaries: github.com/udit-001/india-maps-data (36 states/UTs, post-2020
//   layout, borders per India's official map). No license stated; fine for this
//   private, login-gated app.
// - Cities: GeoNames cities5000 (CC BY 4.0, credit "GeoNames").
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { unzipSync, strFromU8 } from "fflate"
import { feature } from "topojson-client"
import { topology } from "topojson-server"
import { presimplify, quantile, simplify } from "topojson-simplify"

const MAP_URL =
  "https://raw.githubusercontent.com/udit-001/india-maps-data/273a91960b2317c8431e562942293de959e2bd68/topojson/india.json"
const CITIES_URL = "https://download.geonames.org/export/dump/cities5000.zip"

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "../src/data/geo")
const MAX_STATES_BYTES = 80_000
const MAX_CITIES_BYTES = 400_000

// Region code -> [map `st_nm`, GeoNames admin1 code]. Codes match lib/indiaRegions.ts.
const REGIONS = {
  AN: ["Andaman and Nicobar Islands", "01"],
  AP: ["Andhra Pradesh", "02"],
  AR: ["Arunachal Pradesh", "30"],
  AS: ["Assam", "03"],
  BR: ["Bihar", "34"],
  CH: ["Chandigarh", "05"],
  CG: ["Chhattisgarh", "37"],
  DD: ["Dadra and Nagar Haveli and Daman and Diu", "52"],
  DL: ["Delhi", "07"],
  GA: ["Goa", "33"],
  GJ: ["Gujarat", "09"],
  HR: ["Haryana", "10"],
  HP: ["Himachal Pradesh", "11"],
  JK: ["Jammu and Kashmir", "12"],
  JH: ["Jharkhand", "38"],
  KA: ["Karnataka", "19"],
  KL: ["Kerala", "13"],
  LA: ["Ladakh", "41"],
  LD: ["Lakshadweep", "14"],
  MP: ["Madhya Pradesh", "35"],
  MH: ["Maharashtra", "16"],
  MN: ["Manipur", "17"],
  ML: ["Meghalaya", "18"],
  MZ: ["Mizoram", "31"],
  NL: ["Nagaland", "20"],
  OD: ["Odisha", "21"],
  PY: ["Puducherry", "22"],
  PB: ["Punjab", "23"],
  RJ: ["Rajasthan", "24"],
  SK: ["Sikkim", "29"],
  TN: ["Tamil Nadu", "25"],
  TG: ["Telangana", "40"],
  TR: ["Tripura", "26"],
  UP: ["Uttar Pradesh", "36"],
  UK: ["Uttarakhand", "39"],
  WB: ["West Bengal", "28"],
}

// Common old/alternate names -> [GeoNames asciiname, region]. GeoNames'
// own alternatenames are too noisy (codes, transliterations) to use directly.
const ALIASES = {
  Bangalore: ["Bengaluru", "KA"],
  Bombay: ["Mumbai", "MH"],
  Calcutta: ["Kolkata", "WB"],
  Madras: ["Chennai", "TN"],
  Gurgaon: ["Gurugram", "HR"],
  Poona: ["Pune", "MH"],
  Mysore: ["Mysuru", "KA"],
  Mangalore: ["Mangaluru", "KA"],
  Belgaum: ["Belagavi", "KA"],
  Hubli: ["Hubballi", "KA"],
  Trivandrum: ["Thiruvananthapuram", "KL"],
  Cochin: ["Kochi", "KL"],
  Calicut: ["Kozhikode", "KL"],
  Baroda: ["Vadodara", "GJ"],
  Banaras: ["Varanasi", "UP"],
  Benares: ["Varanasi", "UP"],
  Allahabad: ["Prayagraj", "UP"],
  Simla: ["Shimla", "HP"],
  Gauhati: ["Guwahati", "AS"],
  Vizag: ["Visakhapatnam", "AP"],
  Trichy: ["Tiruchirappalli", "TN"],
  Coorg: ["Madikeri", "KA"],
  Pondicherry: ["Puducherry", "PY"],
  Panaji: ["Panjim", "GA"],
  Margao: ["Madgaon", "GA"],
  Nasik: ["Nashik", "MH"],
}

async function download(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`)
  return new Uint8Array(await res.arrayBuffer())
}

function fail(message) {
  console.error(`✗ ${message}`)
  process.exit(1)
}

const round3 = (n) => Math.round(n * 1000) / 1000

// Great-circle distance in km.
function distanceKm(lat1, lng1, lat2, lng2) {
  const rad = Math.PI / 180
  const a =
    Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lng2 - lng1) * rad) / 2) ** 2
  return 12742 * Math.asin(Math.sqrt(a))
}

async function buildStates() {
  const source = JSON.parse(strFromU8(await download(MAP_URL)))
  const codeByName = Object.fromEntries(Object.entries(REGIONS).map(([code, [name]]) => [name, code]))
  const states = feature(source, source.objects.states)

  const seen = new Set()
  for (const f of states.features) {
    const code = codeByName[f.properties.st_nm]
    if (!code) fail(`map region "${f.properties.st_nm}" has no code`)
    if (seen.has(code)) fail(`map region ${code} appears twice`)
    seen.add(code)
    f.id = code
    f.properties = {}
  }
  const missing = Object.keys(REGIONS).filter((c) => !seen.has(c))
  if (missing.length) fail(`map is missing regions: ${missing.join(", ")}`)

  const topo = presimplify(topology({ states }, 1e4))
  const simplified = simplify(topo, quantile(topo, 0.25))
  for (const g of simplified.objects.states.geometries) {
    if (!g.arcs?.length) fail(`region ${g.id} lost its shape during simplification`)
  }
  return simplified
}

async function buildCities() {
  const files = unzipSync(await download(CITIES_URL))
  const text = strFromU8(files["cities5000.txt"])
  const codeByAdmin1 = Object.fromEntries(Object.entries(REGIONS).map(([code, [, admin1]]) => [admin1, code]))

  const rows = []
  for (const line of text.split("\n")) {
    const c = line.split("\t")
    if (c[8] !== "IN") continue
    const stateCode = codeByAdmin1[c[10]]
    if (!stateCode) fail(`GeoNames admin1 "${c[10]}" (${c[2]}) has no region code`)
    rows.push({ id: Number(c[0]), name: c[2], stateCode, lat: round3(Number(c[4])), lng: round3(Number(c[5])), pop: Number(c[14]) })
  }
  rows.sort((a, b) => b.pop - a.pop)

  // GeoNames sometimes lists one town twice (e.g. as a city and a suburb).
  const kept = []
  for (const r of rows) {
    const dup = kept.some(
      (k) => k.name === r.name && k.stateCode === r.stateCode && distanceKm(k.lat, k.lng, r.lat, r.lng) < 5,
    )
    if (!dup) kept.push(r)
  }

  for (const [alias, [name, stateCode]] of Object.entries(ALIASES)) {
    const target = kept.find((r) => r.name === name && r.stateCode === stateCode)
    if (!target) {
      console.warn(`! alias ${alias}: no city "${name}" in ${stateCode}, skipped`)
      continue
    }
    ;(target.aliases ??= []).push(alias)
  }

  // Compact rows: [geonameid, name, region, lat, lng, population, aliases?]
  return {
    count: kept.length,
    dropped: rows.length - kept.length,
    rows: kept.map((r) => {
      const row = [r.id, r.name, r.stateCode, r.lat, r.lng, r.pop]
      if (r.aliases) row.push(r.aliases)
      return row
    }),
  }
}

function write(file, data, maxBytes) {
  const json = JSON.stringify(data)
  if (json.length > maxBytes) fail(`${file} is ${json.length} bytes, over the ${maxBytes} budget`)
  writeFileSync(join(OUT_DIR, file), json)
  console.log(`✓ ${file}: ${(json.length / 1024).toFixed(1)} KB`)
}

mkdirSync(OUT_DIR, { recursive: true })
const states = await buildStates()
write("india-states.topo.json", states, MAX_STATES_BYTES)
const cities = await buildCities()
write("india-cities.json", cities.rows, MAX_CITIES_BYTES)
console.log(`  36 regions, ${cities.count} cities (${cities.dropped} duplicates dropped)`)
