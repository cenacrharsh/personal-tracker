import { neighbors } from "topojson-client"
import type { GeometryCollection, Topology } from "topojson-specification"

import statesTopo from "@/data/geo/india-states.topo.json"
import { assignRegionColors } from "@/lib/travel"
import { TRAVEL_STATE_COLORS, travelColorsSimilar } from "@/lib/tokens"

export const topo = statesTopo as unknown as Topology<{ states: GeometryCollection }>

// Each region's own colour, fixed for good and never shared with a neighbour.
// Shared by the map and the list of visited places so they always match.
const geometries = topo.objects.states.geometries
const colorIndex = assignRegionColors(
  geometries.map((g) => String(g.id)),
  neighbors(geometries),
  TRAVEL_STATE_COLORS.length,
  travelColorsSimilar,
)
export const REGION_COLOR: Record<string, string> = Object.fromEntries(
  geometries.map((g, i) => [String(g.id), TRAVEL_STATE_COLORS[colorIndex[i]]]),
)
