import { useEffect, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { CodeField } from '@/components/shell/CodeField'
import { ToolButton } from '@/components/shell/ToolButton'
import { VennMark } from '@/components/shell/VennMark'
import { confirmCode, listAuthenticators, signOut, startEnroll } from '@/lib/auth'

// Adds an authenticator app: scan the QR code (or type the key), then enter a code to prove it works.
// Optional, from Settings; once added, signing in asks for its code too.
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

export function TwoFactorVerify({ onDone }: { onDone: () => void }) {
  const [factorId, setFactorId] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => { listAuthenticators().then(f => setFactorId(f[0]?.id ?? null)) }, [])
  // A beat before the code box appears, so it reads as a new step and a key still held from the
  // email code doesn't land in it
  useEffect(() => { const t = setTimeout(() => setReady(true), 700); return () => clearTimeout(t) }, [])
  return (
    <main className="page-in grid min-h-dvh place-items-center px-6 py-12">
      <div className="flex w-full max-w-sm flex-col gap-4">
        <header className="flex justify-center pb-6"><VennMark /></header>
        <p className="inline-flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
          <Check className="size-3.5" strokeWidth={1.5} aria-hidden />Email code accepted
        </p>
        <div className="flex flex-col gap-1 px-1">
          <h1 className="text-sm text-foreground">Now enter the code from your authenticator app</h1>
          <p className="text-xs text-muted-foreground">You’ve added an authenticator to your account, so there’s one more code: the 6 digits it shows for this community. It changes every 30 seconds.</p>
        </div>
        <div className="min-h-12">
          {factorId && ready && <div className="page-in"><CodeField label="Authenticator code" onCode={code => confirmCode(factorId, code).then(onDone)} /></div>}
        </div>
        <p className="px-1 text-xs text-muted-foreground">Lost your phone? Ask a facilitator to remove your authenticator, then sign in with just the email code.</p>
        <button type="button" onClick={() => signOut()} className="self-start rounded-sm px-1 text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">Sign out</button>
      </div>
    </main>
  )
}
