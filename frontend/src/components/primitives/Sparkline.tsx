import { Area, AreaChart, ResponsiveContainer } from "recharts"

export function Sparkline({
  data,
  color = "#6366f1",
  height = 40,
}: {
  data: number[]
  color?: string
  height?: number
}) {
  const points = data.filter((v) => Number.isFinite(v))

  if (points.length < 2) {
    return (
      <div
        className="flex items-center"
        style={{ width: "100%", height }}
        aria-hidden
      >
        <div
          className="h-px w-full rounded-full opacity-30"
          style={{ background: `linear-gradient(to right, transparent, ${color}, transparent)` }}
        />
      </div>
    )
  }

  const chartData = points.map((v, i) => ({ i, v }))
  const id = `sparkline-${color.replace(/[^a-z0-9]/gi, "")}`

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <AreaChart data={chartData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.5} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.6}
            fill={`url(#${id})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
