import { Toaster as Sonner } from "sonner"

export function Toaster() {
  return (
    <Sonner
      theme="dark"
      position="bottom-right"
      // Sit above the bottom nav wherever it shows (see --toast-offset-bottom).
      offset={{ bottom: "var(--toast-offset-bottom)" }}
      mobileOffset={{ bottom: "var(--toast-offset-bottom)" }}
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
