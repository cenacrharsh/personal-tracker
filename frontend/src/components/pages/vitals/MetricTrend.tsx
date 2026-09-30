import { useMemo, useState } from "react"
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import type { VitalsReport } from "@/data/types"
import { PANEL_LABELS, VITALS_CATALOG } from "@/lib/vitalsCatalog"
import { parseDateKey } from "@/lib/dates"
import { formatMetricValue, formatRange, metricStatus, STATUS_LABEL, STATUS_TONE_CLASS } from "@/lib/vitals"
import {
  AXIS_TICK,
  CHART_GRID_STROKE,
  CHART_TOOLTIP_STYLE,
  formatAxisNumber,
  niceAxisTicks,
} from "@/components/primitives/chart"
import { EmptyState } from "@/components/primitives/EmptyState"

function formatShortDate(dateStr: string): string {
  const d = parseDateKey(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })
}

export function MetricTrend({
  reports,
  selectedKey,
  onSelectKey,
}: {
  reports: VitalsReport[]
  selectedKey: string | null
  onSelectKey: (key: string) => void
}) {
  const metricsWithData = useMemo(
    () => VITALS_CATALOG.filter((m) => reports.filter((r) => r.results[m.key] !== undefined).length >= 1),
    [reports],
  )

  const [hoverKey, setHoverKey] = useState<string | null>(null)
  const activeKey = hoverKey ?? selectedKey ?? metricsWithData[0]?.key ?? null
  const metric = metricsWithData.find((m) => m.key === activeKey) ?? metricsWithData[0]

  const chartData = useMemo(() => {
    if (!metric) return []
    return reports
      .filter((r) => r.results[metric.key] !== undefined)
      .map((r) => ({
        date: r.date,
        label: formatShortDate(r.date),
        value: r.results[metric.key],
      }))
  }, [reports, metric])

  if (metricsWithData.length === 0 || !metric) {
    return (
      <EmptyState
        title="No trend yet"
        hint="Add a second report with the same metric to see how it changes over time."
      />
    )
  }

  const rangeLow = metric.range.low
  const rangeHigh = metric.range.high
  // The reference band is part of the picture, so the axis has to span it too.
  const scalePoints = [
    ...chartData.map((d) => d.value),
    ...(rangeLow !== undefined ? [rangeLow] : []),
    ...(rangeHigh !== undefined ? [rangeHigh] : []),
  ]
  const dataMin = Math.min(...scalePoints)
  const dataMax = Math.max(...scalePoints)
  const pad = (dataMax - dataMin) * 0.15 || Math.abs(dataMax) * 0.1 || 1
  const ticks = niceAxisTicks(Math.max(0, dataMin - pad), dataMax + pad)
  const yDomain: [number, number] = [ticks[0], ticks[ticks.length - 1]]
  const yAxisWidth = Math.min(
    72,
    Math.max(34, 12 + Math.max(...ticks.map((t) => formatAxisNumber(t).length)) * 7),
  )

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {metricsWithData.map((m) => (
          <button
            key={m.key}
            type="button"
            aria-pressed={m.key === activeKey}
            onClick={() => onSelectKey(m.key)}
            onMouseEnter={() => setHoverKey(m.key)}
            onMouseLeave={() => setHoverKey(null)}
            className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
              m.key === activeKey
                ? "border-indigo-400/40 bg-indigo-500/15 text-indigo-200"
                : "border-border/60 text-muted-foreground hover:text-foreground"
            }`}
            title={PANEL_LABELS[m.panel]}
          >
            {m.shortLabel ?? m.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-sm font-medium">{metric.label}</span>
        <span
          className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300"
          title="Reference range"
        >
          {formatRange(metric.range)} {metric.unit}
        </span>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {/* right margin holds the min/max labels — widest is "max 11000" */}
          <ComposedChart data={chartData} margin={{ top: 8, right: 56, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={CHART_GRID_STROKE} vertical={false} />
            <XAxis
              dataKey="label"
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
              tickMargin={8}
              minTickGap={12}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={yDomain}
              ticks={ticks}
              tickFormatter={formatAxisNumber}
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
              width={yAxisWidth}
              allowDecimals
            />
            {rangeLow !== undefined || rangeHigh !== undefined ? (
              <ReferenceArea
                y1={rangeLow ?? yDomain[0]}
                y2={rangeHigh ?? yDomain[1]}
                fill="#10b981"
                fillOpacity={0.08}
                stroke="none"
              />
            ) : null}
            {rangeHigh !== undefined ? (
              <ReferenceLine
                y={rangeHigh}
                stroke="#10b981"
                strokeOpacity={0.5}
                strokeDasharray="4 4"
                label={{ value: `max ${rangeHigh}`, position: "right", fill: "#6ee7b7", fontSize: 10 }}
              />
            ) : null}
            {rangeLow !== undefined ? (
              <ReferenceLine
                y={rangeLow}
                stroke="#10b981"
                strokeOpacity={0.5}
                strokeDasharray="4 4"
                label={{ value: `min ${rangeLow}`, position: "right", fill: "#6ee7b7", fontSize: 10 }}
              />
            ) : null}
            <Tooltip
              contentStyle={CHART_TOOLTIP_STYLE}
              formatter={(value) => {
                const num = Number(value)
                const status = metricStatus(num, metric.range)
                return [
                  `${formatMetricValue(num, metric.decimals)} ${metric.unit} · ${STATUS_LABEL[status]}`,
                  `Reference ${formatRange(metric.range)}`,
                ]
              }}
            />
            <Area type="monotone" dataKey="value" stroke="none" fill="#6366f1" fillOpacity={0.05} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#818cf8"
              strokeWidth={2}
              dot={(props) => {
                const { cx, cy, value, key } = props as {
                  cx?: number
                  cy?: number
                  value?: number
                  key?: string
                }
                if (cx === undefined || cy === undefined || value === undefined) return <g key={key} />
                const status = metricStatus(value, metric.range)
                const color =
                  status === "ok" ? "#34d399" : status === "borderline" ? "#fbbf24" : "#fb7185"
                return <circle key={key} cx={cx} cy={cy} r={4} fill={color} stroke="none" />
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className={STATUS_TONE_CLASS.ok}>■ In range</span>
        <span className={STATUS_TONE_CLASS.borderline}>■ Borderline</span>
        <span className={STATUS_TONE_CLASS.high}>■ Out of range</span>
        <span>
          <span className="text-emerald-300/40">■</span> Reference range
        </span>
      </div>
    </div>
  )
}
