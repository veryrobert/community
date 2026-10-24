// Lets a facilitator remove another member's authenticators, for a lost or replaced phone. The member
// then signs in with the email code alone. Facilitators remove their own in Settings.
import { createClient } from 'npm:@supabase/supabase-js@2.49.4'

const URL = Deno.env.get('SUPABASE_URL')!
const admin = createClient(URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('SITE_URL') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const fail = (status: number, msg: string) => new Response(JSON.stringify({ error: msg }), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer /, '')
  const { data: { user }, error } = await admin.auth.getUser(token)
  if (error || !user) return fail(401, 'Sign in again.')

  // The token is verified above, so its claims can be read. A caller who has an authenticator must
  // have passed it this session, as the database requires (two_factor_ok)
  const claims = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
  const { data: own } = await admin.auth.admin.mfa.listFactors({ userId: user.id })
  const hasAuthenticator = (own?.factors ?? []).some(f => f.status === 'verified')
  if (hasAuthenticator && claims.aal !== 'aal2') return fail(403, 'Enter your own authenticator code first.')

  const { data: me } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'facilitator') return fail(403, 'Only facilitators can reset two-factor.')

  const { userId } = await req.json() as { userId: string }
  if (!userId || userId === user.id) return fail(400, 'You can’t reset your own two-factor.')

  const { data: factors, error: listError } = await admin.auth.admin.mfa.listFactors({ userId })
  if (listError) return fail(500, listError.message)
  for (const f of factors.factors) {
    const { error: e } = await admin.auth.admin.mfa.deleteFactor({ id: f.id, userId })
    if (e) return fail(500, e.message)
  }
  return new Response(JSON.stringify({ removed: factors.factors.length }), { headers: { ...cors, 'Content-Type': 'application/json' } })
})
