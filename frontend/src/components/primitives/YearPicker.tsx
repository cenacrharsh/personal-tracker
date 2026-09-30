import { ChevronLeft, ChevronRight } from "lucide-react"

export function YearPicker({
  year,
  onChange,
  onJumpToday,
  isThisYear,
  minYear,
  maxYear,
}: {
  year: number
  onChange: (year: number) => void
  onJumpToday: () => void
  isThisYear: boolean
  minYear?: number
  maxYear?: number
}) {
  const canGoBack = minYear === undefined || year > minYear
  const canGoForward = maxYear === undefined || year < maxYear
  return (
    <div className="flex items-center gap-2 rounded-full border border-border/60 bg-card/70 p-1">
      <button
        onClick={() => canGoBack && onChange(year - 1)}
        disabled={!canGoBack}
        className="relative touch-target flex size-8 items-center justify-center rounded-full pointer-coarse:size-10 text-muted-foreground transition hover:bg-muted/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
        aria-label="Previous year"
      >
        <ChevronLeft className="size-4" />
      </button>
      <div className="min-w-16 text-center text-sm font-medium">{year}</div>
      <button
        onClick={() => canGoForward && onChange(year + 1)}
        disabled={!canGoForward}
        className="relative touch-target flex size-8 items-center justify-center rounded-full pointer-coarse:size-10 text-muted-foreground transition hover:bg-muted/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
        aria-label="Next year"
      >
        <ChevronRight className="size-4" />
      </button>
      {!isThisYear ? (
        <button
          onClick={onJumpToday}
          className="relative touch-target ml-1 rounded-full bg-indigo-500/15 px-3 py-1 text-xs pointer-coarse:py-2.5 font-medium text-indigo-200 transition hover:bg-indigo-500/25"
        >
          This year
        </button>
      ) : null}
    </div>
  )
}
