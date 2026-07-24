import { useMemo, useState } from "react"
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import type { VitalsReport } from "@/data/types"
import { PANEL_LABELS, VITALS_CATALOG } from "@/lib/vitalsCatalog"
import { formatMetricValue, metricStatus, STATUS_TONE_CLASS } from "@/lib/vitals"
import { AXIS_TICK, CHART_GRID_STROKE, CHART_TOOLTIP_STYLE } from "@/components/primitives/chart"
import { EmptyState } from "@/components/primitives/EmptyState"

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr)
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
  const values = chartData.map((d) => d.value)
  const dataMin = Math.min(...values, rangeLow ?? Infinity)
  const dataMax = Math.max(...values, rangeHigh ?? -Infinity)
  const pad = (dataMax - dataMin) * 0.15 || 1
  const yMin = Math.max(0, dataMin - pad)
  const yMax = dataMax + pad

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

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid stroke={CHART_GRID_STROKE} vertical={false} />
            <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
            <YAxis domain={[yMin, yMax]} tick={AXIS_TICK} axisLine={false} tickLine={false} width={48} />
            {rangeLow !== undefined || rangeHigh !== undefined ? (
              <ReferenceArea
                y1={rangeLow ?? yMin}
                y2={rangeHigh ?? yMax}
                fill="#10b981"
                fillOpacity={0.08}
                stroke="none"
              />
            ) : null}
            <Tooltip
              contentStyle={CHART_TOOLTIP_STYLE}
              formatter={(value) => {
                const num = Number(value)
                const status = metricStatus(num, metric.range)
                return [`${formatMetricValue(num, metric.decimals)} ${metric.unit}`, status]
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
      </div>
    </div>
  )
}
