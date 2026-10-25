import { useCallback, useEffect, useState } from 'react'
import type { Factor } from '@supabase/supabase-js'
import { supabase } from './supabase'

// Sign-in and optional two-factor. The emailed code (or GitHub) is enough to sign in. Anyone who has
// added an authenticator must also pass its code (aal2); the database enforces that (two_factor_ok).

// Sign-in always returns to the site's root, the one address on Supabase's redirect list
const here = () => `${location.origin}/`

export async function signInWithGitHub() {
  const { error } = await supabase.auth.signInWithOAuth({ provider: 'github', options: { redirectTo: here() } })
  if (error) throw new Error(error.message)
}

// Emails a 6-digit code (and a link, if the email template has one). The code is the safer default:
// it works when the email opens in a different browser from the one signing in.
export async function sendCode(email: string, captchaToken?: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { shouldCreateUser: true, emailRedirectTo: here(), captchaToken },
  })
  if (error) {
    // The invite gate raises inside Supabase's user insert, which arrives as a generic database error
    if (/database error/i.test(error.message)) throw new Error('That email hasn’t been invited.')
    throw new Error(error.message)
  }
}

export async function verifyCode(email: string, token: string) {
  const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token, type: 'email' })
  if (error) throw new Error(/expired|invalid/i.test(error.message) ? 'That code is wrong or has expired. Send a new one.' : error.message)
}

export const signOut = () => supabase.auth.signOut()
export const signOutEverywhere = () => supabase.auth.signOut({ scope: 'global' })

// How long a sign-in lasts on a device. The database enforces it (signed_in_recently in schema.sql);
// the app signs out at the same point so nobody sits on a screen that can't load.
export const SESSION_DAYS = 30

// When the oldest sign-in step in this session happened, from the access token's amr claim
async function signedInAt() {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) return null
  try {
    const claims = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    const times = (claims.amr ?? []).map((m: { timestamp: number }) => m.timestamp * 1000)
    return times.length ? Math.min(...times) : null
  } catch { return null }
}

// Whether this sign-in has run out
async function expiry(): Promise<string | null> {
  const at = await signedInAt()
  if (at !== null && Date.now() - at > SESSION_DAYS * 86_400_000) return `Signed out after ${SESSION_DAYS} days. Sign in again to carry on.`
  return null
}

// Signs out with a reason the sign-in screen shows once
const REASON_KEY = 'community:signed-out'
async function expire(reason: string) {
  try { sessionStorage.setItem(REASON_KEY, reason) } catch { /* private mode */ }
  await signOut()
}
export function readSignOutReason() {
  try { return sessionStorage.getItem(REASON_KEY) } catch { return null }
}
export function clearSignOutReason() {
  try { sessionStorage.removeItem(REASON_KEY) } catch { /* private mode */ }
}

// On returning to the tab, and hourly while it's open, checks the sign-in hasn't run out
export function useSessionLimits() {
  useEffect(() => {
    const check = () => { expiry().then(reason => { if (reason) expire(reason) }) }
    const onVisible = () => { if (document.visibilityState === 'visible') check() }
    document.addEventListener('visibilitychange', onVisible)
    const timer = setInterval(check, 3_600_000)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(timer)
    }
  }, [])
}

// Where this session stands: needs an authenticator code (only for those who've added one), or done
export type Gate = 'loading' | 'verify' | 'ok'

export function useGate(userId: string | undefined) {
  const [gate, setGate] = useState<Gate>('loading')
  const check = useCallback(async () => {
    if (!userId) return
    const reason = await expiry()
    if (reason) { await expire(reason); return }
    const [{ data: level }, { data: factors }] = await Promise.all([
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      supabase.auth.mfa.listFactors(),
    ])
    const verified = factors?.totp.length ?? 0
    setGate(verified && level?.currentLevel !== 'aal2' ? 'verify' : 'ok')
  }, [userId])
  useEffect(() => { check() }, [check])
  return { gate, recheck: check }
}

export async function listAuthenticators(): Promise<Factor[]> {
  const { data, error } = await supabase.auth.mfa.listFactors()
  if (error) throw new Error(error.message)
  return data.totp
}

// Starts adding an authenticator app. Clears half-finished attempts first, which would otherwise pile up.
export async function startEnroll(name: string) {
  const { data: all } = await supabase.auth.mfa.listFactors()
  for (const f of all?.all ?? []) {
    if (f.status === 'unverified') await supabase.auth.mfa.unenroll({ factorId: f.id })
  }
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: name, issuer: document.title || 'community' })
  if (error) throw new Error(error.message)
  return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret }
}

// Checks a 6-digit authenticator code. Success upgrades this session to aal2.
export async function confirmCode(factorId: string, code: string) {
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
  if (error) throw new Error(/invalid|expired/i.test(error.message) ? 'That code didn’t match. Codes change every 30 seconds; try the current one.' : error.message)
}

export async function removeAuthenticator(factorId: string) {
  const { error } = await supabase.auth.mfa.unenroll({ factorId })
  if (error) throw new Error(error.message)
}

// Facilitators only, through the reset-2fa Edge Function (it needs the service key)
export async function resetTwoFactor(userId: string) {
  const { error } = await supabase.functions.invoke('reset-2fa', { body: { userId } })
  if (error) {
    const body = await (error as { context?: Response }).context?.json?.().catch(() => null)
    throw new Error(body?.error ?? error.message)
  }
}

export async function signInMethods() {
  const { data } = await supabase.auth.getUser()
  return (data.user?.identities ?? []).map(i => i.provider)
}
