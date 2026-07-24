import type { ReactNode } from "react"

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon?: ReactNode
  title: string
  hint?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/60 bg-card/40 px-6 py-10 text-center">
      {icon ? <div className="text-muted-foreground [&>svg]:size-8">{icon}</div> : null}
      <div className="text-sm font-medium">{title}</div>
      {hint ? <div className="max-w-sm text-xs text-muted-foreground">{hint}</div> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}
