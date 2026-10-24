import { useState } from 'react'
import { Input } from '@/components/ui/input'

// A 6-digit code: numeric keypad on phones, fills from SMS/email autofill where offered,
// and submits itself on the sixth digit, so there's no button to press.
export function CodeField({ label, onCode, autoFocus = true }: { label: string; onCode: (code: string) => Promise<unknown>; autoFocus?: boolean }) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function change(v: string) {
    const digits = v.replace(/\D/g, '').slice(0, 6)
    setCode(digits)
    setError(null)
    if (digits.length < 6 || busy) return
    setBusy(true)
    try {
      await onCode(digits)
    } catch (e) {
      setError((e as Error).message)
      setCode('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Input
        aria-label={label}
        value={code}
        onChange={e => change(e.target.value)}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={6}
        autoFocus={autoFocus}
        disabled={busy}
        placeholder="000000"
        className="text-center font-mono text-lg tracking-[0.5em] tabular-nums"
      />
      {error && <p role="alert" className="px-1 text-xs text-destructive">{error}</p>}
    </div>
  )
}
