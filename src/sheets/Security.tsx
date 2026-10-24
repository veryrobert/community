import { useCallback, useEffect, useState } from 'react'
import type { Factor } from '@supabase/supabase-js'
import { FieldGroup } from '@/components/shell/Field'
import { RowMenu } from '@/components/shell/RowMenu'
import { useDialogs } from '@/components/shell/Dialogs'
import { listAuthenticators, removeAuthenticator, signInMethods, signOutEverywhere } from '@/lib/auth'
import { date } from '@/lib/types'
import { Enroll } from '@/views/TwoFactor'

const METHOD: Record<string, string> = { email: 'Email code', github: 'GitHub' }

export function Security() {
  const { confirm } = useDialogs()
  const [factors, setFactors] = useState<Factor[]>([])
  const [methods, setMethods] = useState<string[]>([])
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    listAuthenticators().then(setFactors).catch(e => setError(e.message))
    signInMethods().then(setMethods)
  }, [])
  useEffect(() => { refresh() }, [refresh])

  return (
    <FieldGroup title="Security">
      <p className="px-1 text-xs text-muted-foreground">
        Signs in with {methods.map(m => METHOD[m] ?? m).join(' or ') || 'email code'}, then an authenticator code.
        GitHub works when its primary email is the one you were invited with.
      </p>

      <ul className="flex flex-col">
        {factors.map(f => (
          <li key={f.id} className="border-t border-border py-1">
            <RowMenu label={f.friendly_name ?? 'Authenticator'} className="flex items-baseline justify-between gap-3 px-1 py-2"
              actions={factors.length > 1 ? [{
                label: 'Remove', destructive: true, onSelect: async () => {
                  if (await confirm({ title: 'Remove authenticator?', body: 'You’ll sign in with your other one.', action: 'Remove', destructive: true })) {
                    removeAuthenticator(f.id).then(refresh).catch(e => setError(e.message))
                  }
                },
              }] : []}>
              <span className="text-sm text-foreground">{f.friendly_name ?? 'Authenticator'}</span>
              <span className="text-xs text-muted-foreground">Added {date(f.created_at)}</span>
            </RowMenu>
          </li>
        ))}
      </ul>
      {factors.length === 1 && !adding && (
        <p className="-mt-3 px-1 text-xs text-muted-foreground">Add a backup on a second device, so losing one phone doesn’t lock you out.</p>
      )}

      {adding ? (
        <Enroll name={`Backup ${factors.length}`} onDone={() => { setAdding(false); refresh() }} />
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="self-start px-1 text-sm text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground">
          Add an authenticator
        </button>
      )}

      <button type="button" className="self-start px-1 text-sm text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
        onClick={async () => {
          if (await confirm({ title: 'Sign out everywhere?', body: 'Every device signed in to this account is signed out, including this one.', action: 'Sign out everywhere', destructive: true })) signOutEverywhere()
        }}>
        Sign out of all devices
      </button>
      {error && <p role="alert" className="px-1 text-xs text-destructive">{error}</p>}
    </FieldGroup>
  )
}
