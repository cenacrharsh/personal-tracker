import type { ReactNode } from "react"

export function RingProgress({
  percent,
  size = 120,
  stroke = 10,
  color,
  track = "rgba(255,255,255,0.08)",
  children,
}: {
  percent: number // 0-100, clamped
  size?: number
  stroke?: number
  color: string
  track?: string
  children?: ReactNode
}) {
  const clamped = Math.min(100, Math.max(0, Number.isFinite(percent) ? percent : 0))
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - clamped / 100)

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      {children ? <div className="absolute inset-0 flex items-center justify-center">{children}</div> : null}
    </div>
  )
}
