import { useEffect, useRef, useState, type KeyboardEvent } from "react"
import { geoMercator, geoPath } from "d3-geo"
import { select } from "d3-selection"
import "d3-transition"
import { zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from "d3-zoom"
import type { MultiPolygon, Polygon } from "geojson"
import { Minus, Plus, RotateCcw } from "lucide-react"
import { feature, mesh } from "topojson-client"

import { Button } from "@/components/ui/button"
import type { VisitedCity } from "@/data/types"
import { regionByCode } from "@/lib/indiaRegions"
import { TRAVEL_UNVISITED } from "@/lib/tokens"
import { REGION_COLOR, topo } from "@/components/pages/travel/regionColors"

// Geometry is fixed, so project it once at load rather than per render.
const statesFC = feature(topo, topo.objects.states)

const WIDTH = 600
const PAD = 8
const projection = geoMercator().fitWidth(WIDTH - PAD * 2, statesFC)
const path = geoPath(projection)
const [[, top], [, bottom]] = path.bounds(statesFC)
projection.translate([projection.translate()[0] + PAD, projection.translate()[1] - top + PAD])
const HEIGHT = Math.ceil(bottom - top + PAD * 2)

// Regions too small to tap on a phone get a round hit target (and a visible
// ring) at the centre of their largest part. Measured on the largest part, as
// Puducherry and DNH & DD are specks spread far apart. ~24 units is ~13px on a
// 360px-wide screen.
const TINY_REGION_SIZE = 24
const HIT_RADIUS = 16
const RING_RADIUS = 8
const DOT_RADIUS = 4
const MAX_ZOOM = 8

type Shape = { code: string; d: string; tiny: { x: number; y: number } | null }

function largestPart(geometry: Polygon | MultiPolygon): Polygon {
  if (geometry.type === "Polygon") return geometry
  const parts = geometry.coordinates.map((coordinates) => ({ type: "Polygon" as const, coordinates }))
  return parts.reduce((a, b) => (path.area(b) > path.area(a) ? b : a))
}

const SHAPES: Shape[] = statesFC.features.map((f) => {
  const part = largestPart(f.geometry as Polygon | MultiPolygon)
  const [[x0, y0], [x1, y1]] = path.bounds(part)
  const tiny = Math.max(x1 - x0, y1 - y0) < TINY_REGION_SIZE
  const [x, y] = path.centroid(part)
  return { code: String(f.id), d: path(f) ?? "", tiny: tiny ? { x, y } : null }
})
const BORDERS = path(mesh(topo, topo.objects.states, (a, b) => a !== b)) ?? ""
const OUTLINE = path(mesh(topo, topo.objects.states, (a, b) => a === b)) ?? ""

export function IndiaMap({
  visited,
  cityCounts,
  cities,
  selected,
  onSelect,
}: {
  visited: Set<string>
  cityCounts: Map<string, number>
  cities: VisitedCity[]
  selected: string | null
  onSelect: (code: string) => void
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const [transform, setTransform] = useState<ZoomTransform>(zoomIdentity)
  const k = transform.k

  // Pinch or drag to zoom and pan. The map owns touch gestures, like any map
  // app. A mouse wheel still scrolls the page; zoom with a trackpad pinch,
  // ctrl/⌘ + wheel, or the buttons.
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const behavior = zoom<SVGSVGElement, unknown>()
      .extent([
        [0, 0],
        [WIDTH, HEIGHT],
      ])
      .scaleExtent([1, MAX_ZOOM])
      .translateExtent([
        [0, 0],
        [WIDTH, HEIGHT],
      ])
      .clickDistance(6) // a slightly shaky tap still opens the state
      .filter((event: MouseEvent & WheelEvent) =>
        event.type === "wheel" ? event.ctrlKey || event.metaKey : !event.button,
      )
      .on("zoom", (event: { transform: ZoomTransform }) => setTransform(event.transform))
    // Double-tap would also open the state it lands on, so it doesn't zoom.
    const selection = select(svg).call(behavior).on("dblclick.zoom", null)
    zoomRef.current = behavior
    return () => {
      selection.on(".zoom", null)
    }
  }, [])

  const zoomBy = (factor: number) => {
    const behavior = zoomRef.current
    if (svgRef.current && behavior) select(svgRef.current).transition().duration(250).call(behavior.scaleBy, factor)
  }
  const resetZoom = () => {
    const behavior = zoomRef.current
    if (svgRef.current && behavior) select(svgRef.current).transition().duration(300).call(behavior.transform, zoomIdentity)
  }

  const fillFor = (code: string) => (visited.has(code) ? REGION_COLOR[code] : TRAVEL_UNVISITED)
  const labelFor = (code: string) => {
    const count = cityCounts.get(code) ?? 0
    const status = visited.has(code) ? `visited${count ? `, ${count} ${count === 1 ? "city" : "cities"}` : ""}` : "not visited"
    return `${regionByCode[code]?.name ?? code}, ${status}`
  }
  const regionProps = (code: string) => ({
    role: "button",
    tabIndex: 0,
    "aria-label": labelFor(code),
    onClick: () => onSelect(code),
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        onSelect(code)
      }
    },
  })
  const selectedShape = selected ? SHAPES.find((s) => s.code === selected) : undefined

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className={`block h-auto w-full touch-none select-none ${k > 1 ? "cursor-grab active:cursor-grabbing" : ""}`}
        role="group"
        aria-label={`Map of India: ${visited.size} of ${SHAPES.length} states and union territories visited`}
      >
        <g transform={transform.toString()}>
          <g>
            {SHAPES.map((s) => (
              <path
                key={s.code}
                d={s.d}
                fill={fillFor(s.code)}
                className="cursor-pointer outline-none transition-[fill] duration-300 focus-visible:brightness-125 md:hover:brightness-125"
                {...regionProps(s.code)}
                // Tiny regions are focused through their ring below, not twice.
                {...(s.tiny ? { tabIndex: -1, "aria-hidden": true } : {})}
              >
                <title>{labelFor(s.code)}</title>
              </path>
            ))}
          </g>

          {/* Borders drawn once on top of the fills, so shared edges aren't doubled.
              Strokes and dots keep their on-screen size at any zoom. */}
          <path
            d={BORDERS}
            fill="none"
            stroke="#151a1f"
            strokeWidth={1.2}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
          />
          <path
            d={OUTLINE}
            fill="none"
            stroke="#3a424d"
            strokeWidth={0.8}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
          />

          {selectedShape ? (
            <path
              d={selectedShape.d}
              fill="none"
              stroke="#f8fafc"
              strokeWidth={2}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
          ) : null}

          {SHAPES.filter((s) => s.tiny).map((s) => (
            <g key={s.code} {...regionProps(s.code)} className="cursor-pointer outline-none">
              <circle cx={s.tiny!.x} cy={s.tiny!.y} r={HIT_RADIUS / k} fill="transparent" />
              <circle
                cx={s.tiny!.x}
                cy={s.tiny!.y}
                r={RING_RADIUS / k}
                fill={fillFor(s.code)}
                fillOpacity={0.35}
                stroke={visited.has(s.code) ? fillFor(s.code) : "#5b6573"}
                strokeWidth={s.code === selected ? 2.5 : 1.5}
                vectorEffect="non-scaling-stroke"
              />
              <title>{labelFor(s.code)}</title>
            </g>
          ))}

          {/* City dots: tapping one opens its state, so they don't take taps themselves. */}
          <g pointerEvents="none">
            {cities.map((c) => {
              const point = projection([c.lng, c.lat])
              if (!point) return null
              return (
                <circle
                  key={c.id}
                  cx={point[0]}
                  cy={point[1]}
                  r={DOT_RADIUS / k}
                  fill="#f8fafc"
                  stroke="#090e12"
                  strokeWidth={1.5}
                  vectorEffect="non-scaling-stroke"
                />
              )
            })}
          </g>
        </g>
      </svg>

      <div className="absolute top-1 right-1 flex flex-col gap-1.5 pointer-coarse:gap-2">
        <Button
          variant="secondary"
          size="icon-lg"
          className="size-10 bg-secondary/80 backdrop-blur"
          onClick={() => zoomBy(1.8)}
          disabled={k >= MAX_ZOOM}
          aria-label="Zoom in"
        >
          <Plus className="size-5" />
        </Button>
        <Button
          variant="secondary"
          size="icon-lg"
          className="size-10 bg-secondary/80 backdrop-blur"
          onClick={() => zoomBy(1 / 1.8)}
          disabled={k <= 1}
          aria-label="Zoom out"
        >
          <Minus className="size-5" />
        </Button>
        {k > 1 ? (
          <Button
            variant="secondary"
            size="icon-lg"
            className="size-10 bg-secondary/80 backdrop-blur"
            onClick={resetZoom}
            aria-label="Show all of India"
          >
            <RotateCcw className="size-4" />
          </Button>
        ) : null}
      </div>
    </div>
  )
}
