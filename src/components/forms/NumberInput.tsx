import { Input } from "@/components/ui/input"

export type NumberInputProps = {
  value: number
  onChange: (value: number) => void
  min?: number
  step?: number
  placeholder?: string
  disabled?: boolean
  ariaLabel?: string
}

export function NumberInput({
  value,
  onChange,
  min,
  step = 1000,
  placeholder,
  disabled,
  ariaLabel,
}: NumberInputProps) {
  return (
    <Input
      type="number"
      inputMode="numeric"
      aria-label={ariaLabel}
      disabled={disabled}
      min={min}
      step={step}
      value={Number.isFinite(value) ? value : 0}
      placeholder={placeholder}
      onChange={(e) => {
        const raw = e.target.value
        const parsed = raw === "" ? 0 : Number(raw)
        onChange(Number.isFinite(parsed) ? parsed : 0)
      }}
    />
  )
}

