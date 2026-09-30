import { useMemo, useState } from "react"
import { HeartPulse, Plus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatTile } from "@/components/primitives/StatTile"
import { EmptyState } from "@/components/primitives/EmptyState"
import { ConfirmDialog } from "@/components/primitives/ConfirmDialog"
import { useVitalsStore } from "@/store/useVitalsStore"
import type { VitalMetricDef, VitalsReport } from "@/data/types"
import { VITALS_CATALOG } from "@/lib/vitalsCatalog"
import { parseDateKey } from "@/lib/dates"
import {
  formatMetricValue,
  formatRange,
  isOutOfRange,
  metricStatus,
  statusArrow,
  STATUS_LABEL,
  type MetricStatus,
} from "@/lib/vitals"
import { ReportDialog } from "@/components/pages/vitals/ReportDialog"
import { ReportsMatrix } from "@/components/pages/vitals/ReportsMatrix"
import { MetricTrend } from "@/components/pages/vitals/MetricTrend"

function formatDate(dateStr: string): string {
  const d = parseDateKey(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

const STATUS_RANK: Record<MetricStatus, number> = { low: 0, high: 0, borderline: 1, ok: 2 }

function formatMonthYear(dateStr: string): string {
  const d = parseDateKey(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" })
}

// A flagged metric, tinted by severity. Carries the reading's date when it
// came from an older report than the newest one.
function MetricChip({
  metric,
  value,
  status,
  date,
  isLatest,
}: {
  metric: VitalMetricDef
  value: number
  status: MetricStatus
  date: string
  isLatest: boolean
}) {
  const tone = isOutOfRange(status)
    ? "bg-rose-500/15 text-rose-300"
    : status === "borderline"
      ? "bg-amber-500/15 text-amber-300"
      : "bg-emerald-500/10 text-emerald-300"
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${tone}`}
      title={`${STATUS_LABEL[status]} · reference ${formatRange(metric.range)} ${metric.unit} · measured ${formatDate(date)}`}
    >
      {metric.shortLabel ?? metric.label} {formatMetricValue(value, metric.decimals)}{" "}
      {statusArrow(status)}
      {isLatest ? null : (
        <span className="font-normal opacity-70">· {formatMonthYear(date)}</span>
      )}
    </span>
  )
}

export function VitalsPage() {
  const reports = useVitalsStore((s) => s.reports)
  const loaded = useVitalsStore((s) => s.loaded)
  const saveReport = useVitalsStore((s) => s.saveReport)
  const deleteReport = useVitalsStore((s) => s.deleteReport)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingReport, setEditingReport] = useState<VitalsReport | null>(null)
  const [reportPendingDelete, setReportPendingDelete] = useState<VitalsReport | null>(null)
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null)

  const newestFirst = useMemo(
    () => [...reports].sort((a, b) => b.date.localeCompare(a.date)),
    [reports],
  )
  const latest = newestFirst[0] ?? null

  // Panels differ from lab to lab, so a single report is never the full picture.
  // Each metric is judged on its most recent measurement, whenever that was.
  const latestSummary = useMemo(() => {
    if (newestFirst.length === 0) return null
    const evaluated = VITALS_CATALOG.map((metric) => {
      const source = newestFirst.find((r) => r.results[metric.key] !== undefined)
      if (!source) return null
      const value = source.results[metric.key]
      return { metric, value, date: source.date, status: metricStatus(value, metric.range) }
    }).filter((x): x is NonNullable<typeof x> => x !== null)
    const outOfRange = evaluated.filter((e) => isOutOfRange(e.status)).length
    const borderline = evaluated.filter((e) => e.status === "borderline").length
    return {
      total: evaluated.length,
      inRange: evaluated.length - outOfRange,
      outOfRange,
      borderline,
      // Worst first; the sort is stable, so each band keeps its panel order.
      chips: [...evaluated].sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status]),
    }
  }, [newestFirst])

  const openAdd = () => {
    setEditingReport(null)
    setDialogOpen(true)
  }

  const openEdit = (report: VitalsReport) => {
    setEditingReport(report)
    setDialogOpen(true)
  }

  if (!loaded) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Vitals</h1>
          <p className="text-sm text-muted-foreground">Loading your reports…</p>
        </header>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Vitals</h1>
          <p className="text-sm text-muted-foreground">
            {reports.length} report{reports.length === 1 ? "" : "s"} · bloodwork over time
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="size-4" />
          Add report
        </Button>
      </header>

      {reports.length === 0 ? (
        <EmptyState
          icon={<HeartPulse />}
          title="No bloodwork yet"
          hint="Add your first report to start tracking your health metrics."
          action={<Button onClick={openAdd}>Add report</Button>}
        />
      ) : (
        <>
          {latest && latestSummary ? (
            <StatTile
              label={`Latest values · as of ${formatDate(latest.date)}${latest.lab ? ` · ${latest.lab}` : ""}`}
              value={`${latestSummary.inRange} of ${latestSummary.total} in range`}
              tone={latestSummary.outOfRange === 0 && latestSummary.borderline === 0 ? "positive" : "default"}
              icon={<HeartPulse className="size-4" />}
              sub={[
                latestSummary.outOfRange > 0 ? `${latestSummary.outOfRange} out of range` : null,
                latestSummary.borderline > 0 ? `${latestSummary.borderline} borderline` : null,
                `latest reading per metric across ${reports.length} report${reports.length === 1 ? "" : "s"}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            >
              <div className="flex flex-wrap gap-1.5">
                {latestSummary.chips.map(({ metric, value, status, date }) => (
                  <MetricChip
                    key={metric.key}
                    metric={metric}
                    value={value}
                    status={status}
                    date={date}
                    isLatest={date === latest.date}
                  />
                ))}
              </div>
            </StatTile>
          ) : null}

          <ReportsMatrix
            reports={reports}
            onSelectMetric={setSelectedMetric}
            onEdit={openEdit}
            onDelete={setReportPendingDelete}
          />

          <Card className="rounded-2xl border-border/60 bg-card/85 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-base">Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <MetricTrend reports={reports} selectedKey={selectedMetric} onSelectKey={setSelectedMetric} />
            </CardContent>
          </Card>
        </>
      )}

      {dialogOpen ? (
        <ReportDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          report={editingReport}
          existingDates={reports.map((r) => r.date)}
          onSave={(report) => saveReport(report, editingReport?.date)}
        />
      ) : null}

      <ConfirmDialog
        open={reportPendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setReportPendingDelete(null)
        }}
        title="Delete this report?"
        description={
          reportPendingDelete
            ? `Deletes the ${formatDate(reportPendingDelete.date)} report and all its values. This can't be undone.`
            : ""
        }
        onConfirm={() => {
          if (reportPendingDelete) {
            deleteReport(reportPendingDelete.date).catch((e: unknown) =>
              toast.error(`Couldn't delete report: ${e instanceof Error ? e.message : "unknown error"}`),
            )
          }
        }}
      />
    </div>
  )
}
