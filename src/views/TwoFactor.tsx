import { useEffect, useState, type ReactNode } from 'react'
import { Check, Copy } from 'lucide-react'
import { CodeField } from '@/components/shell/CodeField'
import { ToolButton } from '@/components/shell/ToolButton'
import { confirmCode, listAuthenticators, signOut, startEnroll } from '@/lib/auth'

// Adds an authenticator app: scan the QR code (or type the key), then enter a code to prove it works.
// Used as the forced first step after an invited person's first sign-in, and in Settings for a backup.
export function Enroll({ name, onDone }: { name: string; onDone: () => void }) {
  const [setup, setSetup] = useState<{ factorId: string; qr: string; secret: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let live = true
    startEnroll(name).then(s => live && setSetup(s)).catch(e => live && setError(e.message))
    return () => { live = false }
  }, [name])

  // The clipboard API can refuse (permissions, some in-app browsers); fall back to the old copy command
  async function copy(secret: string) {
    try {
      await navigator.clipboard.writeText(secret)
    } catch {
      const field = document.createElement('textarea')
      field.value = secret
      field.setAttribute('readonly', '')
      field.style.position = 'fixed'
      field.style.opacity = '0'
      document.body.appendChild(field)
      field.select()
      document.execCommand('copy')
      field.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (error) return <p role="alert" className="px-1 text-xs text-destructive">{error}</p>
  if (!setup) return <p className="px-1 text-xs text-muted-foreground">Preparing</p>

  return (
    <div className="flex flex-col gap-4">
      <p className="px-1 text-sm text-muted-foreground">Scan this with an authenticator app, such as 1Password, Google Authenticator or Microsoft Authenticator.</p>
      {/* The QR code needs a light ground to scan, whatever the theme */}
      <img src={setup.qr} alt="QR code for your authenticator app" className="size-44 self-center rounded-xl bg-white p-2" />
      <div className="flex items-center gap-2 rounded-xl bg-secondary py-1 pr-1 pl-4">
        {/* Tapping the key selects all of it, for copying by hand */}
        <code className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground select-all">{setup.secret}</code>
        {copied && <span role="status" className="shrink-0 text-xs text-foreground">Copied</span>}
        <ToolButton icon={copied ? Check : Copy} label={copied ? 'Copied' : 'Copy key'} side="top" className="size-9 shrink-0 [&_svg]:size-4"
          onClick={() => copy(setup.secret)} />
      </div>
      <p className="px-1 text-sm text-foreground">Then enter the 6-digit code it shows</p>
      <CodeField label="Authenticator code" autoFocus={false} onCode={code => confirmCode(setup.factorId, code).then(onDone)} />
    </div>
  )
}

export function TwoFactorSetup({ onDone }: { onDone: () => void }) {
  return (
    <Screen title="Set up two-factor sign-in" note="Every member needs it. It keeps the community’s ideas and comments safe if an email account or GitHub account is ever compromised.">
      <Enroll name="Authenticator app" onDone={onDone} />
    </Screen>
  )
}

export function TwoFactorVerify({ onDone }: { onDone: () => void }) {
  const [factorId, setFactorId] = useState<string | null>(null)
  useEffect(() => { listAuthenticators().then(f => setFactorId(f[0]?.id ?? null)) }, [])
  return (
    <Screen title="Enter your authenticator code" note="Lost your phone? Ask a facilitator to reset your two-factor, then sign in again to set it up.">
      {factorId && <CodeField label="Authenticator code" onCode={code => confirmCode(factorId, code).then(onDone)} />}
    </Screen>
  )
}

function Screen({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center px-6 py-12">
      <div className="flex w-full max-w-sm flex-col gap-4">
        <h1 className="px-1 text-sm text-foreground">{title}</h1>
        {children}
        <p className="px-1 text-xs text-muted-foreground">{note}</p>
        <button type="button" onClick={() => signOut()} className="self-start px-1 text-xs text-muted-foreground underline decoration-border underline-offset-4 hover:text-foreground">Sign out</button>
      </div>
    </main>
  )
}
