import { useEffect, useState } from "react"
import {
  Activity, ChevronLeft, ChevronRight, Dumbbell, Feather, Flame, CalendarDays, Trophy,
  Cookie, AlertTriangle, TrendingDown, Smartphone,
} from "lucide-react"
import { useTrackersStore } from "@/store/useTrackersStore"
import { YearPicker } from "@/components/primitives/YearPicker"
import { MONTH_NAMES, toDateKey, todayKey } from "@/lib/dates"
import { daysSinceLastLapse, longestLapseFreeRun } from "@/lib/habits"
import type { ActivityKey } from "@/data"

const WEEK_GOAL = 3
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

// "good" trackers reward a marked day; "bad" ones treat it as a lapse, so the
// metrics invert — streaks measure time since the last entry rather than a run
// of them, and the weekly number is a ceiling to stay under, not a target.
type Polarity = "good" | "bad"

type ActivityDef = {
  key: ActivityKey
  label: string
  icon: typeof Dumbbell
  polarity: Polarity
  goal?: number // good: minimum sessions per week
  weeklyLimit?: number // bad: slips allowed per week
  subtitle: string
  text: string
  dot: string
  dotShadow: string
  ring: string
  border: string
  iconBg: string
  hex: string // calendar dot fill
}

// Per-activity characteristics. Adding a tracker is one more entry here plus a
// matching def in server/src/routes/trackers.js.
const ACTIVITIES: Record<ActivityKey, ActivityDef> = {
  gym: {
    key: "gym", label: "Gym", icon: Dumbbell, polarity: "good", goal: WEEK_GOAL,
    subtitle: `Goal · ${WEEK_GOAL}× per week`,
    text: "text-green-400", dot: "bg-green-500", dotShadow: "shadow-green-500/30",
    ring: "ring-green-500", border: "border-green-500/40", iconBg: "bg-green-500/20",
    hex: "#22c55e",
  },
  badminton: {
    key: "badminton", label: "Badminton", icon: Feather, polarity: "good", goal: 1,
    subtitle: "Goal · 1× per week",
    text: "text-sky-400", dot: "bg-sky-500", dotShadow: "shadow-sky-500/30",
    ring: "ring-sky-500", border: "border-sky-500/40", iconBg: "bg-sky-500/20",
    hex: "#0ea5e9",
  },
  junk: {
    key: "junk", label: "Junk food", icon: Cookie, polarity: "bad", weeklyLimit: 2,
    subtitle: "Limit · 2× per week",
    text: "text-orange-400", dot: "bg-orange-500", dotShadow: "shadow-orange-500/30",
    ring: "ring-orange-500", border: "border-orange-500/40", iconBg: "bg-orange-500/20",
    hex: "#f97316",
  },
  social: {
    key: "social", label: "Social media", icon: Smartphone, polarity: "bad", weeklyLimit: 2,
    subtitle: "Limit · 2× per week",
    text: "text-red-400", dot: "bg-red-500", dotShadow: "shadow-red-500/30",
    ring: "ring-red-500", border: "border-red-500/40", iconBg: "bg-red-500/20",
    hex: "#ef4444",
  },
}
const ACTIVITY_ORDER: ActivityKey[] = ["gym", "badminton", "junk", "social"]

const keysIn = (p: Polarity) => ACTIVITY_ORDER.filter((k) => ACTIVITIES[k].polarity === p)

// Presentation for each group's headline tile. Both count days that carry an
// entry; the "bad" tile is warm-toned because that count is the bad news.
const GROUPS: Record<Polarity, {
  label: string
  icon: typeof Dumbbell
  headline: string
  headlineSub: string
  tile: string
  iconTile: string
  bar: string
  number: string
  blobA: string
  blobB: string
}> = {
  good: {
    label: "Activity", icon: Activity,
    headline: "Active days", headlineSub: "All activities combined",
    tile: "from-green-500/10 via-card/50 to-sky-500/10",
    iconTile: "from-green-500/30 to-sky-500/30",
    bar: "from-green-400 to-sky-400",
    number: "from-green-300 to-sky-300",
    blobA: "bg-sky-500/20", blobB: "bg-green-500/20",
  },
  bad: {
    label: "Avoid", icon: AlertTriangle,
    headline: "Lapsed days", headlineSub: "All habits combined",
    tile: "from-orange-500/10 via-card/50 to-red-500/10",
    iconTile: "from-orange-500/30 to-red-500/30",
    bar: "from-orange-400 to-red-400",
    number: "from-orange-300 to-red-300",
    blobA: "bg-red-500/20", blobB: "bg-orange-500/20",
  },
}

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

function monthRange(year: number, month: number): [string, string] {
  const mm = String(month + 1).padStart(2, "0")
  const last = String(new Date(year, month + 1, 0).getDate()).padStart(2, "0")
  return [`${year}-${mm}-01`, `${year}-${mm}-${last}`]
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

// Solid fill for one activity, evenly split when several are logged the same day.
function circleBackground(hexes: string[]): string {
  if (hexes.length === 1) return hexes[0]
  const step = 100 / hexes.length
  const stops = hexes.map((h, i) => `${h} ${i * step}% ${(i + 1) * step}%`).join(", ")
  return `linear-gradient(135deg, ${stops})`
}

// Weekly ring. For goals it fills toward a target; for limits it fills as the
// allowance is spent, so a full ring means trouble rather than success.
// `accent` is the habit's own colour, used once the limit is breached so the
// ring matches its calendar dots rather than a single shared red.
function ProgressRing({ count, target, mode, accent, accentText }: {
  count: number
  target: number
  mode: Polarity
  accent: string
  accentText: string
}) {
  const r = 52
  const circ = 2 * Math.PI * r
  const pct = Math.min(count / target, 1)
  const dash = pct * circ

  const met = mode === "good" ? count >= target : count <= target
  const stroke = mode === "good"
    ? met ? "#22c55e" : "#f59e0b"
    : count === 0 ? "#22c55e" : met ? "#f59e0b" : accent
  const numberColor = mode === "good"
    ? met ? "text-green-400" : "text-amber-400"
    : count === 0 ? "text-green-400" : met ? "text-amber-400" : accentText

  return (
    <div className="relative flex items-center justify-center">
      <svg width={128} height={128} className="-rotate-90">
        <circle cx={64} cy={64} r={r} fill="none" stroke="rgb(255 255 255 / 0.07)" strokeWidth={10} />
        <circle
          cx={64} cy={64} r={r}
          fill="none"
          stroke={stroke}
          strokeWidth={10}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`text-3xl font-black tabular-nums leading-none ${numberColor}`}>
          {count}
        </span>
        <span className="text-xs text-muted-foreground font-medium">/ {target}</span>
      </div>
    </div>
  )
}

export function TrackersPage() {
  const { toggleDay, isActiveDay, datesInRange, entriesFor, hydrate, loaded } = useTrackersStore()

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
  const polarity = activeDef.polarity
  const isBad = polarity === "bad"
  const group = GROUPS[polarity]
  const GroupIcon = group.icon
  const groupKeys = keysIn(polarity)
  const activeEntries = entriesFor(activeActivity)

  const weekDates = getWeekDates(weekStart)
  const weekKeys = weekDates.map(toDateKey)
  const weekCount = datesInRange(activeActivity, weekKeys[0], weekKeys[6]).length

  const [monthStart, monthEnd] = monthRange(year, calMonth)
  const monthCount = datesInRange(activeActivity, monthStart, monthEnd).length
  const yearCount = datesInRange(activeActivity, `${year}-01-01`, `${year}-12-31`).length

  // Combined days across every tracker in the group — a day counts once even if
  // several were logged. Both groups report logged days; only the framing
  // differs, since a day with no entry is unrecorded rather than proven clean.
  const markedDaysIn = (start: string, end: string) =>
    new Set(groupKeys.flatMap((k) => datesInRange(k, start, end))).size

  const monthHeadline = markedDaysIn(monthStart, monthEnd)
  const yearHeadline = markedDaysIn(`${year}-01-01`, `${year}-12-31`)

  // Good-habit metrics
  const weeklyStreak = activeDef.goal ? computeWeeklyStreak(activeEntries, activeDef.goal) : 0

  // Bad-habit metrics
  const sinceLastLapse = isBad ? daysSinceLastLapse(activeEntries, today) : 0
  const bestRun = isBad ? longestLapseFreeRun(activeEntries, today) : 0
  const prevMonth = calMonth === 0 ? 11 : calMonth - 1
  const prevYear = calMonth === 0 ? year - 1 : year
  const [prevStart, prevEnd] = monthRange(prevYear, prevMonth)
  const prevMonthCount = datesInRange(activeActivity, prevStart, prevEnd).length
  const monthDelta = monthCount - prevMonthCount

  const monthGrid = getMonthGrid(year, calMonth)
  const isCurrentWeek = toDateKey(weekStart) === toDateKey(getWeekStart(new Date()))

  const weekTarget = isBad ? activeDef.weeklyLimit : activeDef.goal
  const weekMet = weekTarget === undefined
    ? false
    : isBad ? weekCount <= weekTarget : weekCount >= weekTarget

  const weekCaption = () => {
    if (weekTarget === undefined) return ""
    if (!isBad) return weekMet ? "Goal met!" : `${weekTarget - weekCount} to go`
    if (weekCount === 0) return "None logged"
    if (weekCount <= weekTarget) return `${weekTarget - weekCount} left`
    return `Over by ${weekCount - weekTarget}`
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${activeDef.iconBg} ${activeDef.text}`}>
            <ActiveIcon className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight">{isBad ? "Habit Log" : "Activity Log"}</h1>
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

      {/* Group switch: build-up vs. cut-down */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex gap-1 rounded-full border border-border/60 bg-card/70 p-1">
          {(["good", "bad"] as Polarity[]).map((p) => {
            const g = GROUPS[p]
            const Icon = g.icon
            const active = p === polarity
            return (
              <button
                key={p}
                onClick={() => setActiveActivity(keysIn(p)[0])}
                aria-pressed={active}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                  active
                    ? p === "good"
                      ? "bg-green-500/20 text-green-400"
                      : "bg-red-500/20 text-red-400"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="size-4" />
                {g.label}
              </button>
            )
          })}
        </div>

        {/* Activity selector, scoped to the chosen group */}
        <div className="inline-flex gap-1 rounded-full border border-border/60 bg-card/70 p-1">
          {groupKeys.map((key) => {
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
      </div>

      {/* Headline tile for the current group */}
      <div className={`relative overflow-hidden rounded-2xl border border-white/10 bg-linear-to-br ${group.tile} p-5 shadow-lg shadow-black/20 backdrop-blur`}>
        <div className={`pointer-events-none absolute inset-x-0 top-0 h-1 bg-linear-to-r ${group.bar}`} />
        <div className={`pointer-events-none absolute -right-12 -top-12 size-44 rounded-full ${group.blobA} blur-3xl`} />
        <div className={`pointer-events-none absolute -bottom-12 -left-12 size-44 rounded-full ${group.blobB} blur-3xl`} />
        <div className="relative flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-3">
            <div className={`flex size-11 items-center justify-center rounded-xl bg-linear-to-br ${group.iconTile} text-white ring-1 ring-white/15`}>
              <GroupIcon className="size-5" />
            </div>
            <div>
              <div className="text-base font-bold tracking-tight">{group.headline}</div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{group.headlineSub}</div>
            </div>
          </div>
          <div className="grid w-full grid-cols-2 divide-x divide-white/10 sm:w-auto">
            <div className="flex flex-col items-center px-5 sm:px-7">
              <div className={`bg-linear-to-br ${group.number} bg-clip-text text-4xl font-black tabular-nums leading-none text-transparent`}>
                {monthHeadline}
              </div>
              <div className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">This month</div>
            </div>
            <div className="flex flex-col items-center px-5 sm:px-7">
              <div className={`bg-linear-to-br ${group.number} bg-clip-text text-4xl font-black tabular-nums leading-none text-transparent`}>
                {yearHeadline}
              </div>
              <div className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">{year}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats strip (reflects the selected activity) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {isBad ? (
          <>
            <StatCard
              icon={<Flame className={`size-4 ${activeDef.text}`} />}
              label="Since last lapse"
              value={sinceLastLapse}
              unit={`${sinceLastLapse === 1 ? "day" : "days"} · best ${bestRun}`}
              borderClass={activeDef.border}
            />
            <StatCard
              icon={<TrendingDown className={`size-4 ${activeDef.text}`} />}
              label="This month"
              value={monthCount}
              unit={
                monthDelta === 0
                  ? "same as last month"
                  : `${monthDelta > 0 ? "+" : ""}${monthDelta} vs last month`
              }
              unitClass={monthDelta < 0 ? "text-green-400" : monthDelta > 0 ? "text-red-400" : undefined}
              borderClass={activeDef.border}
            />
            <StatCard
              icon={<CalendarDays className={`size-4 ${activeDef.text}`} />}
              label={`${year}`}
              value={yearCount}
              unit="lapses"
              borderClass={activeDef.border}
              className="col-span-2 sm:col-span-1"
            />
          </>
        ) : (
          <>
            {activeDef.goal ? (
              <StatCard
                icon={<Flame className={`size-4 ${activeDef.text}`} />}
                label="Week streak"
                value={weeklyStreak}
                unit={weeklyStreak === 1 ? "week" : "weeks"}
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
          </>
        )}
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

          {/* Right panel: ring when there's a weekly number to hit or stay under */}
          <div className="flex shrink-0 flex-col items-center gap-1">
            {weekTarget !== undefined ? (
              <>
                <ProgressRing
                  count={weekCount}
                  target={weekTarget}
                  mode={polarity}
                  accent={activeDef.hex}
                  accentText={activeDef.text}
                />
                <span className={`text-xs font-semibold ${weekMet ? "text-green-400" : isBad ? activeDef.text : "text-muted-foreground"}`}>
                  {weekCaption()}
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

        {/* Calendar grid, colored per tracker in the current group */}
        <div className="space-y-1">
          {monthGrid.map((row, ri) => (
            <div key={ri} className="grid grid-cols-7 gap-1">
              {row.map((date, di) => {
                if (!date) return <div key={di} />
                const key = toDateKey(date)
                const hexes = groupKeys.filter((k) => isActiveDay(k, key)).map((k) => ACTIVITIES[k].hex)
                const marked = hexes.length > 0
                const isToday = key === today
                const isFuture = key > today

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
                        style={{ background: circleBackground(hexes) }}
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

        {/* Month summary + legend for the current group */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-border/40 pt-4">
          <span className="text-xs text-muted-foreground">
            {groupKeys
              .map((k) => `${datesInRange(k, monthStart, monthEnd).length} ${ACTIVITIES[k].label.toLowerCase()}`)
              .join(" · ")}
            {" this month"}
          </span>
          <div className="flex items-center gap-3">
            {groupKeys.map((k) => (
              <span key={k} className="flex items-center gap-1">
                <span className={`size-2.5 rounded-full ${ACTIVITIES[k].dot}`} />
                <span className="text-xs text-muted-foreground">{ACTIVITIES[k].label}</span>
              </span>
            ))}
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
  unitClass,
  borderClass,
  className = "",
}: {
  icon: React.ReactNode
  label: string
  value: number
  unit: string
  unitClass?: string
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
      <div className={`text-xs ${unitClass ?? "text-muted-foreground"}`}>{unit}</div>
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
