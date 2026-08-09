import { useMemo } from "react"
import { Pencil, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { VitalsReport } from "@/data/types"
import { VITALS_CATALOG } from "@/lib/vitalsCatalog"
import {
  formatMetricValue,
  formatRange,
  metricStatus,
  statusArrow,
  STATUS_LABEL,
  STATUS_TONE_CLASS,
} from "@/lib/vitals"

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

export function ReportsMatrix({
  reports,
  onSelectMetric,
  onEdit,
  onDelete,
}: {
  reports: VitalsReport[]
  onSelectMetric: (key: string) => void
  onEdit: (report: VitalsReport) => void
  onDelete: (report: VitalsReport) => void
}) {
  const columns = useMemo(() => {
    const hasAnyData = (key: string) => reports.some((r) => r.results[key] !== undefined)
    return VITALS_CATALOG.filter((m) => m.core || hasAnyData(m.key))
  }, [reports])

  const rows = useMemo(() => [...reports].sort((a, b) => b.date.localeCompare(a.date)), [reports])

  return (
    <div className="overflow-x-auto rounded-2xl border border-border/60 bg-card/85 backdrop-blur">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="sticky left-0 z-10 bg-card">Date</TableHead>
            {columns.map((m) => (
              <TableHead key={m.key}>
                <button
                  type="button"
                  onClick={() => onSelectMetric(m.key)}
                  className="text-left hover:text-foreground"
                  title={`View ${m.label} trend`}
                >
                  <div>{m.shortLabel ?? m.label}</div>
                  <div className="text-[10px] font-normal text-muted-foreground">
                    {formatRange(m.range)} {m.unit}
                  </div>
                </button>
              </TableHead>
            ))}
            <TableHead className="w-16" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((report) => (
            <TableRow key={report.date} className="group">
              <TableCell className="sticky left-0 z-10 bg-card font-medium">
                <div>{formatDate(report.date)}</div>
                {report.lab ? <div className="text-[11px] font-normal text-muted-foreground">{report.lab}</div> : null}
              </TableCell>
              {columns.map((m) => {
                const value = report.results[m.key]
                if (value === undefined) {
                  return (
                    <TableCell key={m.key} className="text-muted-foreground">
                      —
                    </TableCell>
                  )
                }
                const status = metricStatus(value, m.range)
                return (
                  <TableCell
                    key={m.key}
                    className={STATUS_TONE_CLASS[status]}
                    title={`${STATUS_LABEL[status]} · reference ${formatRange(m.range)} ${m.unit}`}
                  >
                    {formatMetricValue(value, m.decimals)} {statusArrow(status)}
                  </TableCell>
                )
              })}
              <TableCell>
                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Edit report from ${formatDate(report.date)}`}
                    onClick={() => onEdit(report)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete report from ${formatDate(report.date)}`}
                    onClick={() => onDelete(report)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
