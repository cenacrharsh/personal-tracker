import { useMemo, useState } from "react"
import { ChevronDown } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { VitalsReport } from "@/data/types"
import { PANEL_LABELS, PANEL_ORDER, metricsByPanel } from "@/lib/vitalsCatalog"
import { todayKey } from "@/lib/dates"
import { MetricInput } from "./MetricInput"

export function ReportDialog({
  open,
  onOpenChange,
  report,
  existingDates,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  report: VitalsReport | null // null = adding a new report
  existingDates: string[]
  onSave: (report: VitalsReport) => Promise<void>
}) {
  const [date, setDate] = useState(report?.date ?? todayKey())
  const [lab, setLab] = useState(report?.lab ?? "")
  const [notes, setNotes] = useState(report?.notes ?? "")
  const [results, setResults] = useState<Record<string, number>>(report?.results ?? {})
  const [saving, setSaving] = useState(false)

  // Reset local form state whenever a different report opens (or the dialog reopens for "add new").
  const formKey = report?.date ?? "new"
  const [lastFormKey, setLastFormKey] = useState(formKey)
  if (formKey !== lastFormKey) {
    setLastFormKey(formKey)
    setDate(report?.date ?? todayKey())
    setLab(report?.lab ?? "")
    setNotes(report?.notes ?? "")
    setResults(report?.results ?? {})
  }

  const isEditing = report !== null
  const isDuplicateDate = date !== report?.date && existingDates.includes(date)

  const defaultOpenPanels = useMemo(() => {
    const set = new Set<string>()
    for (const panel of PANEL_ORDER) {
      const metrics = metricsByPanel(panel)
      const hasCore = metrics.some((m) => m.core)
      const hasValue = metrics.some((m) => results[m.key] !== undefined)
      if (hasCore || hasValue) set.add(panel)
    }
    return set
    // Only computed once per report load, not on every result edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formKey])

  const setMetricValue = (key: string, value: number | undefined) => {
    setResults((prev) => {
      const next = { ...prev }
      if (value === undefined) delete next[key]
      else next[key] = value
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave({ date, lab: lab.trim(), notes: notes.trim(), results })
      onOpenChange(false)
    } catch (e) {
      toast.error(`Couldn't save report: ${e instanceof Error ? e.message : "unknown error"}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit report" : "Add report"}</DialogTitle>
          <DialogDescription>
            Enter whichever values this report includes — leave the rest blank.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="grid gap-1.5">
            <Label htmlFor="vitals-date" className="text-xs text-muted-foreground">
              Report date
            </Label>
            <Input id="vitals-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            {isDuplicateDate ? (
              <p className="text-[11px] text-amber-300">A report exists for this date — saving will replace it.</p>
            ) : null}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="vitals-lab" className="text-xs text-muted-foreground">
              Lab (optional)
            </Label>
            <Input
              id="vitals-lab"
              value={lab}
              onChange={(e) => setLab(e.target.value)}
              placeholder="Thyrocare, Dr Lal…"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="vitals-notes" className="text-xs text-muted-foreground">
              Notes (optional)
            </Label>
            <Input id="vitals-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          {PANEL_ORDER.map((panel) => {
            const metrics = metricsByPanel(panel)
            return (
              <details key={panel} open={defaultOpenPanels.has(panel)} className="group rounded-xl border border-border/60 bg-muted/20">
                <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-sm font-medium pointer-coarse:py-3">
                  <span>{PANEL_LABELS[panel]}</span>
                  <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <div className="grid grid-cols-1 gap-3 border-t border-border/60 p-3 sm:grid-cols-2 lg:grid-cols-3">
                  {metrics.map((metric) => (
                    <MetricInput
                      key={metric.key}
                      metric={metric}
                      value={results[metric.key]}
                      onChange={(v) => setMetricValue(metric.key, v)}
                    />
                  ))}
                </div>
              </details>
            )
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving || !date}>
            {saving ? "Saving…" : "Save report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
