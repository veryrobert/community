import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SendField } from '@/components/shell/SendField'
import { CodeField } from '@/components/shell/CodeField'
import { sendCode, signInWithGitHub, clearSignOutReason, readSignOutReason, verifyCode } from '@/lib/auth'
import { useTurnstile } from '@/lib/turnstile'
import { About } from './About'

// Two ways in, both invite-only: GitHub, or a code sent to the invited email. Either way the
// next screen asks for the authenticator code.
export function SignIn() {
  const [email, setEmail] = useState<string | null>(null)
  const [about, setAbout] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reason] = useState(readSignOutReason)
  useEffect(clearSignOutReason, []) // shown once
  const captcha = useTurnstile()

  if (about) {
    return (
      <main className="flex min-h-dvh flex-col gap-6 py-6">
        <div className="mx-auto w-full max-w-2xl px-3">
          <button type="button" onClick={() => setAbout(false)} className="h-10 rounded-full px-2 text-sm text-muted-foreground hover:text-foreground">← Sign in</button>
        </div>
        <About signedIn={false} />
        <div className="h-12" />
      </main>
    )
  }

  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="flex w-full max-w-sm flex-col gap-4">
        {email ? (<>
          <p className="px-1 text-sm text-foreground">Enter the code sent to {email}</p>
          <CodeField label="Email code" onCode={code => verifyCode(email, code)} />
          <button type="button" onClick={() => setEmail(null)} className="self-start px-1 text-xs text-muted-foreground underline decoration-border underline-offset-4 hover:text-foreground">
            Use a different email, or send a new code
          </button>
        </>) : (<>
          {reason && <p role="status" className="px-1 text-xs text-muted-foreground">{reason}</p>}
          <p className="px-1 text-sm text-foreground">Sign in</p>
          <Button variant="secondary" className="h-12 rounded-xl text-base md:text-sm"
            onClick={() => signInWithGitHub().catch(e => setError(e.message))}>
            Continue with GitHub
          </Button>
          <div className="flex items-center gap-3 px-1 text-xs text-muted-foreground" aria-hidden>
            <span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" />
          </div>
          <SendField label="Email me a code" placeholder="Invited email address" type="email" autoComplete="email" enterKeyHint="go" icon={ArrowRight}
            clearOnSend={false} onSend={async v => { await sendCode(v, await captcha.getToken()); setEmail(v.trim().toLowerCase()) }} />
          {/* Cloudflare's check: invisible unless it needs a tick from a person */}
          <div ref={captcha.box} />
          {captcha.error && <p role="alert" className="px-1 text-xs text-destructive">{captcha.error}</p>}
          <p className="px-1 text-xs text-muted-foreground">Invite only. Use the email you were invited with, or a GitHub account whose primary email is that address.</p>
          <button type="button" onClick={() => setAbout(true)} className="self-start px-1 text-sm text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground">
            About this community, and how to join
          </button>
          {error && <p role="alert" className="px-1 text-xs text-destructive">{error}</p>}
        </>)}
      </div>
    </main>
  )
}
