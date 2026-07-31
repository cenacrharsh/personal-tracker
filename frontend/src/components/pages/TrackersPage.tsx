import { useEffect, useState } from "react"
import { Activity, ChevronLeft, ChevronRight, Dumbbell, Feather, Flame, CalendarDays, Trophy } from "lucide-react"
import { useTrackersStore } from "@/store/useTrackersStore"
import { YearPicker } from "@/components/primitives/YearPicker"
import { MONTH_NAMES, toDateKey, todayKey } from "@/lib/dates"
import type { ActivityKey } from "@/data"

const WEEK_GOAL = 3
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

type ActivityDef = {
  key: ActivityKey
  label: string
  icon: typeof Dumbbell
  goal?: number
  subtitle: string
  text: string
  dot: string
  dotShadow: string
  ring: string
  border: string
  iconBg: string
}

// Per-activity characteristics. Gym is goal-based (green); badminton is goal-free (blue).
// Adding an activity later is just one more entry here.
const ACTIVITIES: Record<ActivityKey, ActivityDef> = {
  gym: {
    key: "gym", label: "Gym", icon: Dumbbell, goal: WEEK_GOAL,
    subtitle: `Goal · ${WEEK_GOAL}× per week`,
    text: "text-green-400", dot: "bg-green-500", dotShadow: "shadow-green-500/30",
    ring: "ring-green-500", border: "border-green-500/40", iconBg: "bg-green-500/20",
  },
  badminton: {
    key: "badminton", label: "Badminton", icon: Feather, goal: 1,
    subtitle: "Goal · 1× per week",
    text: "text-sky-400", dot: "bg-sky-500", dotShadow: "shadow-sky-500/30",
    ring: "ring-sky-500", border: "border-sky-500/40", iconBg: "bg-sky-500/20",
  },
}
const ACTIVITY_ORDER: ActivityKey[] = ["gym", "badminton"]

function getWeekStart(d: Date): Date {
  const copy = new Date(d)
  const dow = copy.getDay() // 0=Sun
  const diff = dow === 0 ? -6 : 1 - dow // shift to Monday
  copy.setDate(copy.getDate() + diff)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + n)
  return copy
}

function getWeekDates(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
}

function getMonthGrid(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDow = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1 // Mon=0
  const rows: (Date | null)[][] = []
  let row: (Date | null)[] = Array(startDow).fill(null)
  for (let d = 1; d <= lastDay.getDate(); d++) {
    row.push(new Date(year, month, d))
    if (row.length === 7) {
      rows.push(row)
      row = []
    }
  }
  if (row.length > 0) {
    while (row.length < 7) row.push(null)
    rows.push(row)
  }
  return rows
}

function countInWeek(entries: string[], weekStart: Date): number {
  const start = toDateKey(weekStart)
  const end = toDateKey(addDays(weekStart, 6))
  return entries.filter((d) => d >= start && d <= end).length
}

// Consecutive weeks (counting back from now) that hit the weekly goal.
// The current week is in progress, so it only adds to the streak once the
// goal is met — never breaks it while still incomplete.
function computeWeeklyStreak(entries: string[], goal: number): number {
  if (entries.length === 0) return 0
  let cursor = getWeekStart(new Date())
  if (countInWeek(entries, cursor) < goal) {
    cursor = addDays(cursor, -7)
  }
  let streak = 0
  while (countInWeek(entries, cursor) >= goal) {
    streak++
    cursor = addDays(cursor, -7)
  }
  return streak
}

// SVG ring for weekly progress (gym only).
function ProgressRing({ count, goal }: { count: number; goal: number }) {
  const r = 52
  const circ = 2 * Math.PI * r
  const pct = Math.min(count / goal, 1)
  const dash = pct * circ
  const met = count >= goal

  return (
    <div className="relative flex items-center justify-center">
      <svg width={128} height={128} className="-rotate-90">
        <circle cx={64} cy={64} r={r} fill="none" stroke="rgb(255 255 255 / 0.07)" strokeWidth={10} />
        <circle
          cx={64} cy={64} r={r}
          fill="none"
          stroke={met ? "#22c55e" : "#f59e0b"}
          strokeWidth={10}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`text-3xl font-black tabular-nums leading-none ${met ? "text-green-400" : "text-amber-400"}`}>
          {count}
        </span>
        <span className="text-xs text-muted-foreground font-medium">/ {goal}</span>
      </div>
    </div>
  )
}

export function TrackersPage() {
  const { gym, badminton, toggleDay, isActiveDay, datesInRange, hydrate, loaded } = useTrackersStore()

  const [activeActivity, setActiveActivity] = useState<ActivityKey>("gym")
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()))
  const today = todayKey()

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [calMonth, setCalMonth] = useState(now.getMonth())

  useEffect(() => {
    if (!loaded) void hydrate()
  }, [hydrate, loaded])

  const activeDef = ACTIVITIES[activeActivity]
  const ActiveIcon = activeDef.icon
  const activeEntries = activeActivity === "gym" ? gym.entries : badminton.entries

  const weekDates = getWeekDates(weekStart)
  const weekKeys = weekDates.map(toDateKey)
  const weekCount = datesInRange(activeActivity, weekKeys[0], weekKeys[6]).length

  const monthStart = `${year}-${String(calMonth + 1).padStart(2, "0")}-01`
  const monthEnd = `${year}-${String(calMonth + 1).padStart(2, "0")}-${String(new Date(year, calMonth + 1, 0).getDate()).padStart(2, "0")}`
  const monthCount = datesInRange(activeActivity, monthStart, monthEnd).length
  const gymMonth = datesInRange("gym", monthStart, monthEnd).length
  const badmintonMonth = datesInRange("badminton", monthStart, monthEnd).length

  const yearCount = datesInRange(activeActivity, `${year}-01-01`, `${year}-12-31`).length

  // Combined "active days" across ALL activities — a day counts once even if
  // multiple activities were logged. Iterates ACTIVITY_ORDER, so any activity
  // added later is automatically included.
  const activeDaysIn = (start: string, end: string) =>
    new Set(ACTIVITY_ORDER.flatMap((k) => datesInRange(k, start, end))).size
  const monthActiveDays = activeDaysIn(monthStart, monthEnd)
  const yearActiveDays = activeDaysIn(`${year}-01-01`, `${year}-12-31`)

  const streak = activeDef.goal ? computeWeeklyStreak(activeEntries, activeDef.goal) : 0
  const monthGrid = getMonthGrid(year, calMonth)
  const isCurrentWeek = toDateKey(weekStart) === toDateKey(getWeekStart(new Date()))
  const weekMet = activeDef.goal ? weekCount >= activeDef.goal : false

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${activeDef.iconBg} ${activeDef.text}`}>
            <ActiveIcon className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight">Activity Log</h1>
            <p className="truncate text-xs text-muted-foreground">{activeDef.label} • {activeDef.subtitle}</p>
          </div>
        </div>
        <YearPicker
          year={year}
          onChange={setYear}
          onJumpToday={() => {
            setYear(now.getFullYear())
            setCalMonth(now.getMonth())
          }}
          isThisYear={year === now.getFullYear()}
        />
      </div>

      {/* Activity selector */}
      <div className="inline-flex gap-1 rounded-full border border-border/60 bg-card/70 p-1">
        {ACTIVITY_ORDER.map((key) => {
          const def = ACTIVITIES[key]
          const Icon = def.icon
          const active = key === activeActivity
          return (
            <button
              key={key}
              onClick={() => setActiveActivity(key)}
              aria-pressed={active}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                active ? `${def.iconBg} ${def.text}` : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="size-4" />
              {def.label}
            </button>
          )
        })}
      </div>

      {/* Combined active days — the page's headline metric, shown regardless of selection */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-linear-to-br from-green-500/10 via-card/50 to-sky-500/10 p-5 shadow-lg shadow-black/20 backdrop-blur">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-linear-to-r from-green-400 to-sky-400" />
        <div className="pointer-events-none absolute -right-12 -top-12 size-44 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-12 size-44 rounded-full bg-green-500/20 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-linear-to-br from-green-500/30 to-sky-500/30 text-white ring-1 ring-white/15">
              <Activity className="size-5" />
            </div>
            <div>
              <div className="text-base font-bold tracking-tight">Active days</div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">All activities combined</div>
            </div>
          </div>
          <div className="grid w-full grid-cols-2 divide-x divide-white/10 sm:w-auto">
            <div className="flex flex-col items-center px-5 sm:px-7">
              <div className="bg-linear-to-br from-green-300 to-sky-300 bg-clip-text text-4xl font-black tabular-nums leading-none text-transparent">
                {monthActiveDays}
              </div>
              <div className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">This month</div>
            </div>
            <div className="flex flex-col items-center px-5 sm:px-7">
              <div className="bg-linear-to-br from-green-300 to-sky-300 bg-clip-text text-4xl font-black tabular-nums leading-none text-transparent">
                {yearActiveDays}
              </div>
              <div className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">{year}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats strip (reflects the selected activity) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {activeDef.goal ? (
          <StatCard
            icon={<Flame className={`size-4 ${activeDef.text}`} />}
            label="Week streak"
            value={streak}
            unit={streak === 1 ? "week" : "weeks"}
            borderClass={activeDef.border}
          />
        ) : null}
        <StatCard
          icon={<CalendarDays className={`size-4 ${activeDef.text}`} />}
          label="This month"
          value={monthCount}
          unit="sessions"
          borderClass={activeDef.border}
        />
        <StatCard
          icon={<Trophy className={`size-4 ${activeDef.text}`} />}
          label={`${year}`}
          value={yearCount}
          unit="sessions"
          borderClass={activeDef.border}
          // Third of three cards: fills the second row instead of sitting
          // orphaned at half width on a phone.
          className="col-span-2 sm:col-span-1"
        />
      </div>

      {/* Week view */}
      <div className="rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur">
        {/* Week nav */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">
              {isCurrentWeek ? "This Week" : formatWeekRange(weekStart)}
            </div>
            <div className="text-xs text-muted-foreground">
              {isCurrentWeek ? formatWeekRange(weekStart) : ""}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setWeekStart((ws) => addDays(ws, -7))}
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
            >
              <ChevronLeft className="size-4" />
            </button>
            {!isCurrentWeek && (
              <button
                onClick={() => setWeekStart(getWeekStart(new Date()))}
                className={`rounded-lg px-2 py-1 text-xs font-medium transition-colors hover:bg-white/10 ${activeDef.text}`}
              >
                Today
              </button>
            )}
            <button
              onClick={() => setWeekStart((ws) => addDays(ws, 7))}
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        {/* Stacked on phones: side by side, the fixed-width ring squeezes the seven
            day buttons down to ~17px each and the labels collapse. */}
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-5">
          {/* Day buttons (color-coded for both activities) */}
          <div className="grid w-full grid-cols-7 gap-1.5 sm:flex-1 sm:gap-2">
            {weekDates.map((date, i) => {
              const key = weekKeys[i]
              const isToday = key === today
              const on = isActiveDay(activeActivity, key)
              const isFuture = key > today

              return (
                <button
                  key={key}
                  onClick={() => !isFuture && toggleDay(activeActivity, key)}
                  disabled={isFuture}
                  className={`flex flex-col items-center gap-1.5 rounded-xl py-3 transition-all duration-150 ${
                    on
                      ? `${activeDef.dot} text-white shadow-lg ${activeDef.dotShadow} scale-105`
                      : isFuture
                        ? "cursor-not-allowed opacity-30"
                        : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                  }`}
                >
                  <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
                    {DAY_LABELS[i]}
                  </span>
                  <span className={`text-base font-bold ${isToday && !on ? activeDef.text : ""}`}>
                    {date.getDate()}
                  </span>
                  <span className={`size-1.5 rounded-full ${on ? "bg-white/70" : isToday ? activeDef.dot : "bg-transparent"}`} />
                </button>
              )
            })}
          </div>

          {/* Right panel: goal ring for gym, simple count for goal-free activities */}
          <div className="flex shrink-0 flex-col items-center gap-1">
            {activeDef.goal ? (
              <>
                <ProgressRing count={weekCount} goal={activeDef.goal} />
                <span className={`text-xs font-semibold ${weekMet ? "text-green-400" : "text-muted-foreground"}`}>
                  {weekMet ? "Goal met!" : `${activeDef.goal - weekCount} to go`}
                </span>
              </>
            ) : (
              <div className="flex size-32 flex-col items-center justify-center">
                <span className={`text-4xl font-black tabular-nums ${activeDef.text}`}>{weekCount}</span>
                <span className="text-xs text-muted-foreground">this week</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Monthly calendar */}
      <div className="rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur">
        {/* Month nav */}
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm font-semibold">
            {MONTH_NAMES[calMonth]} {year}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                if (calMonth === 0) { setCalMonth(11); setYear((y) => y - 1) }
                else setCalMonth((m) => m - 1)
              }}
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              onClick={() => { setYear(now.getFullYear()); setCalMonth(now.getMonth()) }}
              className={`rounded-lg px-2 py-1 text-xs font-medium transition-colors hover:bg-white/10 ${activeDef.text}`}
            >
              Today
            </button>
            <button
              onClick={() => {
                if (calMonth === 11) { setCalMonth(0); setYear((y) => y + 1) }
                else setCalMonth((m) => m + 1)
              }}
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        {/* Day-of-week headers */}
        <div className="mb-2 grid grid-cols-7 gap-1">
          {DAY_LABELS.map((d) => (
            <div key={d} className="text-center text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              {d.slice(0, 1)}
            </div>
          ))}
        </div>

        {/* Calendar grid (green = gym, blue = badminton) */}
        <div className="space-y-1">
          {monthGrid.map((row, ri) => (
            <div key={ri} className="grid grid-cols-7 gap-1">
              {row.map((date, di) => {
                if (!date) return <div key={di} />
                const key = toDateKey(date)
                const gymOn = isActiveDay("gym", key)
                const badmintonOn = isActiveDay("badminton", key)
                const marked = gymOn || badmintonOn
                const isToday = key === today
                const isFuture = key > today

                // Solid circle for one activity, split green/blue when both are logged.
                const circleBg =
                  gymOn && badmintonOn
                    ? "linear-gradient(135deg, #22c55e 0 50%, #0ea5e9 50% 100%)"
                    : gymOn
                      ? "#22c55e"
                      : "#0ea5e9"

                return (
                  <button
                    key={key}
                    onClick={() => !isFuture && toggleDay(activeActivity, key)}
                    disabled={isFuture}
                    className={`relative flex h-11 w-full items-center justify-center rounded-lg text-sm font-medium transition-all duration-150 sm:h-10 ${
                      marked
                        ? "text-foreground"
                        : isToday
                          ? `ring-2 ${activeDef.ring} ring-offset-1 ring-offset-background text-foreground hover:bg-white/10`
                          : isFuture
                            ? "cursor-not-allowed text-muted-foreground/30"
                            : "text-muted-foreground hover:bg-white/10 hover:text-foreground"
                    }`}
                  >
                    {marked ? (
                      <span
                        className="flex size-8 items-center justify-center rounded-full text-white shadow-md"
                        style={{ background: circleBg }}
                      >
                        {date.getDate()}
                      </span>
                    ) : (
                      date.getDate()
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        {/* Month summary + legend (both activities) */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-border/40 pt-4">
          <span className="text-xs text-muted-foreground">
            {gymMonth} gym · {badmintonMonth} badminton this month
          </span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="size-2.5 rounded-full bg-green-500" />
              <span className="text-xs text-muted-foreground">Gym</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2.5 rounded-full bg-sky-500" />
              <span className="text-xs text-muted-foreground">Badminton</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  unit,
  borderClass,
  className = "",
}: {
  icon: React.ReactNode
  label: string
  value: number
  unit: string
  borderClass: string
  className?: string
}) {
  return (
    <div className={`rounded-xl border bg-card/60 p-4 backdrop-blur ${borderClass} ${className}`}>
      <div className="mb-2 flex items-center gap-1.5">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <div className="text-2xl font-black tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{unit}</div>
    </div>
  )
}

function formatWeekRange(weekStart: Date): string {
  const end = addDays(weekStart, 6)
  const startMonth = MONTH_NAMES[weekStart.getMonth()].slice(0, 3)
  const endMonth = MONTH_NAMES[end.getMonth()].slice(0, 3)
  if (weekStart.getMonth() === end.getMonth()) {
    return `${startMonth} ${weekStart.getDate()} – ${end.getDate()}`
  }
  return `${startMonth} ${weekStart.getDate()} – ${endMonth} ${end.getDate()}`
}
