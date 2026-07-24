import { Toaster as Sonner } from "sonner"

export function Toaster() {
  return (
    <Sonner
      theme="dark"
      position="bottom-right"
      toastOptions={{
        style: {
          background: "oklch(0.215 0.012 252)",
          border: "1px solid rgba(255,255,255,0.12)",
          color: "oklch(0.985 0 0)",
        },
      }}
    />
  )
}
