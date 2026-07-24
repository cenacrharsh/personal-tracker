import { useEffect, useRef, useState } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { VitalMetricDef } from "@/data/types"
import { formatRange, metricStatus, STATUS_TONE_CLASS } from "@/lib/vitals"

// Unlike NumberInput, blank stays blank — a bloodwork metric that wasn't
// tested must never be coerced to 0.
export function MetricInput({
  metric,
  value,
  onChange,
}: {
  metric: VitalMetricDef
  value: number | undefined
  onChange: (value: number | undefined) => void
}) {
  const [text, setText] = useState(value !== undefined ? String(value) : "")
  const focusedRef = useRef(false)
  const inputId = `metric-${metric.key}`

  useEffect(() => {
    if (focusedRef.current) return
    setText(value !== undefined ? String(value) : "")
  }, [value])

  const parsed = Number(text)
  const hasValue = text.trim() !== "" && Number.isFinite(parsed)
  const status = hasValue ? metricStatus(parsed, metric.range) : null

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={inputId} className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
        <span>{metric.label}</span>
        <span className="shrink-0 font-normal">
          {formatRange(metric.range)} {metric.unit}
        </span>
      </Label>
      <Input
        id={inputId}
        type="text"
        inputMode="decimal"
        placeholder="—"
        value={text}
        className={status ? STATUS_TONE_CLASS[status] : undefined}
        onFocus={(e) => {
          focusedRef.current = true
          e.currentTarget.select()
        }}
        onBlur={() => {
          focusedRef.current = false
          const trimmed = text.trim()
          if (trimmed === "") {
            if (value !== undefined) onChange(undefined)
            return
          }
          const n = Number(trimmed)
          if (!Number.isFinite(n) || n <= 0) {
            setText(value !== undefined ? String(value) : "")
            return
          }
          setText(String(n))
          if (n !== value) onChange(n)
        }}
        onChange={(e) => setText(e.target.value)}
      />
    </div>
  )
}
