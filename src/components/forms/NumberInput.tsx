import { useEffect, useRef, useState } from "react"

import { Input } from "@/components/ui/input"

export type NumberInputProps = {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  placeholder?: string
  disabled?: boolean
  ariaLabel?: string
  className?: string
  emptyValue?: number
}

export function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1000,
  placeholder,
  disabled,
  ariaLabel,
  className,
  emptyValue = 0,
}: NumberInputProps) {
  const [text, setText] = useState<string>(() =>
    Number.isFinite(value) ? String(value) : "",
  )
  const focusedRef = useRef(false)

  useEffect(() => {
    if (focusedRef.current) return
    const next = Number.isFinite(value) ? String(value) : ""
    setText(next)
  }, [value])

  return (
    <Input
      type="number"
      inputMode="numeric"
      aria-label={ariaLabel}
      disabled={disabled}
      min={min}
      max={max}
      step={step}
      className={className}
      value={text}
      placeholder={placeholder ?? String(emptyValue)}
      onFocus={(e) => {
        focusedRef.current = true
        e.currentTarget.select()
      }}
      onBlur={() => {
        focusedRef.current = false
        if (text.trim() === "" || text === "-") {
          setText(String(emptyValue))
          if (value !== emptyValue) onChange(emptyValue)
          return
        }
        const parsed = Number(text)
        const safe = Number.isFinite(parsed) ? parsed : emptyValue
        setText(String(safe))
        if (safe !== value) onChange(safe)
      }}
      onChange={(e) => {
        const raw = e.target.value
        setText(raw)
        if (raw === "" || raw === "-" || raw === ".") return
        const parsed = Number(raw)
        if (Number.isFinite(parsed)) onChange(parsed)
      }}
    />
  )
}
