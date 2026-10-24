import { useCallback, useEffect, useRef, useState } from 'react'

// Cloudflare Turnstile, Supabase's supported CAPTCHA. It stays invisible unless Cloudflare wants
// a person to tick a box. Off when VITE_TURNSTILE_SITE_KEY isn't set (local development).
// Supabase checks the token server-side once CAPTCHA is switched on in Auth > Attack Protection.
export const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined
const SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

type Turnstile = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string
  reset: (id: string) => void
  remove: (id: string) => void
}
declare global { interface Window { turnstile?: Turnstile } }

let loading: Promise<void> | null = null
function load() {
  if (window.turnstile) return Promise.resolve()
  loading ??= new Promise((res, rej) => {
    const s = document.createElement('script')
    s.src = SRC
    s.async = true
    s.onload = () => res()
    s.onerror = () => rej(new Error('The security check couldn’t load. Check your connection and reload.'))
    document.head.appendChild(s)
  })
  return loading
}

// Returns a ref for the widget's box and getToken(), which waits for a fresh single-use token
export function useTurnstile() {
  const box = useRef<HTMLDivElement>(null)
  const id = useRef<string | null>(null)
  const token = useRef<string | null>(null)
  const waiting = useRef<((t: string) => void) | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!SITE_KEY) return
    let live = true
    load().then(() => {
      if (!live || !box.current || !window.turnstile) return
      id.current = window.turnstile.render(box.current, {
        sitekey: SITE_KEY,
        appearance: 'interaction-only',
        theme: matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark',
        size: 'flexible',
        callback: (t: string) => { token.current = t; waiting.current?.(t); waiting.current = null },
        'expired-callback': () => { token.current = null },
        'error-callback': () => setError('The security check failed. Reload and try again.'),
      })
    }).catch(e => setError(e.message))
    return () => {
      live = false
      if (id.current) window.turnstile?.remove(id.current)
      id.current = null
    }
  }, [])

  const getToken = useCallback(async (): Promise<string | undefined> => {
    if (!SITE_KEY) return undefined
    const t = token.current ?? await new Promise<string>((res, rej) => {
      waiting.current = res
      setTimeout(() => rej(new Error('The security check is taking too long. Try again.')), 20_000)
    })
    // Each token works once; get the next one ready
    token.current = null
    if (id.current) window.turnstile?.reset(id.current)
    return t
  }, [])

  return { box, getToken, error }
}
