import { useMemo, useState } from "react"
import { HeartPulse, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatTile } from "@/components/primitives/StatTile"
import { EmptyState } from "@/components/primitives/EmptyState"
import { ConfirmDialog } from "@/components/primitives/ConfirmDialog"
import { useVitalsStore } from "@/store/useVitalsStore"
import type { VitalsReport } from "@/data/types"
import { VITALS_CATALOG } from "@/lib/vitalsCatalog"
import { formatMetricValue, metricStatus, statusArrow } from "@/lib/vitals"
import { ReportDialog } from "@/components/pages/vitals/ReportDialog"
import { ReportsMatrix } from "@/components/pages/vitals/ReportsMatrix"
import { MetricTrend } from "@/components/pages/vitals/MetricTrend"

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
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

  const latest = useMemo(
    () => (reports.length ? [...reports].sort((a, b) => b.date.localeCompare(a.date))[0] : null),
    [reports],
  )

  const latestSummary = useMemo(() => {
    if (!latest) return null
    const entries = Object.entries(latest.results)
    const flagged = entries
      .map(([key, value]) => {
        const metric = VITALS_CATALOG.find((m) => m.key === key)
        if (!metric) return null
        const status = metricStatus(value, metric.range)
        return status === "ok" ? null : { metric, value, status }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
    return { total: entries.length, inRange: entries.length - flagged.length, flagged }
  }, [latest])

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
              label={`Latest report · ${formatDate(latest.date)}${latest.lab ? ` · ${latest.lab}` : ""}`}
              value={`${latestSummary.inRange} of ${latestSummary.total} in range`}
              tone={latestSummary.flagged.length === 0 ? "positive" : "negative"}
              icon={<HeartPulse className="size-4" />}
            >
              {latestSummary.flagged.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {latestSummary.flagged.map(({ metric, value, status }) => (
                    <span
                      key={metric.key}
                      className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[11px] font-medium text-rose-300"
                    >
                      {metric.shortLabel ?? metric.label} {formatMetricValue(value, metric.decimals)} {statusArrow(status)}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Everything tested came back within range.</p>
              )}
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
          onSave={saveReport}
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
          if (reportPendingDelete) void deleteReport(reportPendingDelete.date)
        }}
      />
    </div>
  )
}
