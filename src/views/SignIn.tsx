import { useEffect, useState } from 'react'
import { ArrowRight, ChevronLeft, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SendField } from '@/components/shell/SendField'
import { CodeField } from '@/components/shell/CodeField'
import { VennMark } from '@/components/shell/VennMark'
import { sendCode, signInWithGitHub, clearSignOutReason, readSignOutReason, verifyCode } from '@/lib/auth'
import { useTurnstile } from '@/lib/turnstile'
import { loadAbout } from '@/lib/data'
import { About, Join } from './About'

// GitHub sign-in needs a GitHub OAuth app enabled in Supabase first; until then the button stays hidden
const GITHUB = import.meta.env.VITE_GITHUB_SIGNIN === 'on'

// Two ways in, both invite-only: GitHub, or a code sent to the invited email. Members who've added
// an authenticator are then asked for its code.
export function SignIn() {
  const [email, setEmail] = useState<string | null>(null)
  const [page, setPage] = useState<'signin' | 'about' | 'join'>('signin')
  const [error, setError] = useState<string | null>(null)
  const [reason] = useState(readSignOutReason)
  useEffect(clearSignOutReason, []) // shown once
  const captcha = useTurnstile()
  // The community's name is public (about() works signed out), so the page can say where you're signing in
  const [name, setName] = useState<string | null>(null)
  useEffect(() => { loadAbout().then(c => setName(c.name)).catch(() => {}) }, [])

  // About and How to join are pages of their own, each linking to the other and back to sign-in
  if (page !== 'signin') {
    return (
      <main key={page} className="page-in flex min-h-dvh flex-col gap-6 py-6">
        <div className="mx-auto w-full max-w-2xl px-3">
          <button type="button" onClick={() => setPage('signin')} className="inline-flex h-10 items-center gap-1 rounded-full px-2 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="size-4" strokeWidth={1.5} aria-hidden />Sign in</button>
        </div>
        {page === 'about' ? <About signedIn={false} onJoin={() => setPage('join')} /> : <Join onAbout={() => setPage('about')} />}
        <div className="h-12" />
      </main>
    )
  }

  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="flex w-full max-w-sm flex-col gap-4">
        <header className="flex flex-col items-center gap-3 pb-6">
          <VennMark />
          <h1 className="min-h-[1.2em] text-center text-[length:calc(var(--text-sm)*1.5)] leading-tight text-foreground">{name}</h1>
        </header>
        {email ? (<>
          <div className="flex flex-col gap-1 px-1">
            <p className="text-sm text-foreground">Check your email</p>
            <p className="text-xs text-muted-foreground">We sent a 6-digit code to {email}. It expires in 10 minutes.</p>
          </div>
          <CodeField label="Email code" onCode={code => verifyCode(email, code)} />
          <button type="button" onClick={() => setEmail(null)} className="self-start px-1 text-xs text-muted-foreground underline decoration-border underline-offset-4 hover:text-foreground">
            Use a different email, or send a new code
          </button>
        </>) : (<>
          {reason && <p role="status" className="px-1 text-xs text-muted-foreground">{reason}</p>}
          {GITHUB && (<>
          <Button variant="secondary" className="h-12 gap-2.5 rounded-xl text-base md:text-sm"
            onClick={() => signInWithGitHub().catch(e => setError(e.message))}>
            <GitHubLogo />
            Continue with GitHub
          </Button>
          <div className="flex items-center gap-3 px-1 text-xs text-muted-foreground" aria-hidden>
            <span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" />
          </div>
          </>)}
          <SendField label="Email me a code" placeholder="Email address" hintIcon={Mail} type="email" autoComplete="email" enterKeyHint="go" icon={ArrowRight}
            clearOnSend={false} onSend={async v => { await sendCode(v, await captcha.getToken()); setEmail(v.trim().toLowerCase()) }} />
          {/* Cloudflare's check: invisible unless it needs a tick from a person */}
          <div ref={captcha.box} />
          {captcha.error && <p role="alert" className="px-1 text-xs text-destructive">{captcha.error}</p>}
          <p className="px-1 text-center text-xs text-muted-foreground">
            {name ?? 'This community'} is currently open to designers working in the Irish public and civil service.
          </p>
          <nav aria-label="About" className="flex justify-center gap-4 px-1 text-xs text-muted-foreground">
            <button type="button" onClick={() => setPage('about')} className="underline decoration-border underline-offset-4 hover:text-foreground hover:decoration-foreground">About the community</button>
            <button type="button" onClick={() => setPage('join')} className="underline decoration-border underline-offset-4 hover:text-foreground hover:decoration-foreground">How to join</button>
          </nav>
          {error && <p role="alert" className="px-1 text-xs text-destructive">{error}</p>}
        </>)}
      </div>
    </main>
  )
}

// GitHub's mark (Lucide no longer ships brand logos)
function GitHubLogo() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="size-4" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  )
}
