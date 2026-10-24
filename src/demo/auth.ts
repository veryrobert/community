// Stand-in for lib/auth.ts in the demo. Sign-in and two-factor run through the real screens,
// with every code being 123456. Signing in with you@example.ie (or GitHub) is a returning member;
// any other email walks through a new member's first sign-in.
import { useSyncExternalStore } from 'react'
import type { Factor } from '@supabase/supabase-js'
import { becomeNewMember } from './data'

const CODE = '123456'
let session: { user: { id: string } } | null = { user: { id: 'me' } }
let gate: 'enroll' | 'verify' | 'ok' = 'ok'
const subs = new Set<() => void>()
const emit = () => subs.forEach(f => f())
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f) } }
const wrongCode = () => { throw new Error(`That code didn’t match. In the demo, every code is ${CODE}.`) }

export function useSession() { return useSyncExternalStore(subscribe, () => session) }

export const SESSION_HOURS = 12
export const IDLE_MINUTES = 30
export type Gate = 'loading' | 'enroll' | 'verify' | 'ok'

export const signOut = async () => { session = null; emit() }
export const signOutEverywhere = signOut
export async function signInWithGitHub() { session = { user: { id: 'me' } }; gate = 'verify'; emit() }
export async function sendCode() {}
export async function verifyCode(email: string, code: string) {
  if (code !== CODE) wrongCode()
  const returning = email.trim().toLowerCase() === 'you@example.ie'
  if (!returning) { becomeNewMember(email); factors = [] }
  session = { user: { id: 'me' } }
  gate = returning ? 'verify' : 'enroll'
  emit()
}
export function useGate() {
  const g = useSyncExternalStore(subscribe, () => gate)
  return { gate: g as Gate, recheck: () => {} }
}
export function useSessionLimits() {}
export function noteActivity() {}
export function readSignOutReason() { return null }
export function clearSignOutReason() {}

let factors = [{ id: 'f1', friendly_name: 'Authenticator app', factor_type: 'totp', status: 'verified', created_at: new Date(Date.now() - 30 * 864e5).toISOString(), updated_at: '' }] as unknown as Factor[]
export async function listAuthenticators() { return [...factors] }
export async function removeAuthenticator(id: string) { factors = factors.filter(f => f.id !== id) }
export async function signInMethods() { return ['email', 'github'] }
export async function resetTwoFactor() {}
// A stand-in QR: a plain grid, not a working code
const qr = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 21 21" shape-rendering="crispEdges">${
  Array.from({ length: 441 }, (_, i) => ((i * 7919) % 13 < 6 ? `<rect x="${i % 21}" y="${Math.floor(i / 21)}" width="1" height="1"/>` : '')).join('')}</svg>`)
export async function startEnroll(name: string) {
  return { factorId: `new-${name}`, qr, secret: 'DEMO DEMO DEMO DEMO' }
}
export async function confirmCode(factorId: string, code: string) {
  if (code !== CODE) wrongCode()
  if (!factors.some(f => f.id === factorId)) {
    factors = [...factors, { id: factorId, friendly_name: factors.length ? 'Backup authenticator' : 'Authenticator app', factor_type: 'totp', status: 'verified', created_at: new Date().toISOString(), updated_at: '' } as unknown as Factor]
  }
  gate = 'ok'
  emit()
}
