// Lets a facilitator clear another member's two-factor, for a lost or replaced phone.
// The member's next sign-in then asks them to set it up again. Facilitators can't reset their own:
// they add a second authenticator in Settings, or another facilitator resets it.
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

  // The token is verified above, so its claims can be read. The caller must themselves have passed 2FA.
  const claims = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
  if (claims.aal !== 'aal2') return fail(403, 'Confirm your own two-factor first.')

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
