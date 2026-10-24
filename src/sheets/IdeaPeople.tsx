// Not shown in this version: the toggle for choosing follower, contributor or lead on an idea. Kept for when it returns.
import { useCallback, useEffect, useState } from 'react'
import { Field } from '@/components/shell/Field'
import { Segmented } from '@/components/shell/Segmented'
import { joinIdea, leaveIdea, loadPeople } from '@/lib/data'
import { ROLE, ROLE_ORDER, type Idea, type IdeaRole, type Person } from '@/lib/types'

export function usePeople(ideaId: number) {
  const [people, setPeople] = useState<Person[]>([])
  const refresh = useCallback(() => loadPeople(ideaId).then(setPeople), [ideaId])
  useEffect(() => { refresh() }, [refresh])
  return { people, refresh }
}

// Your role on the idea. Tap the selected one again to leave.
export function YourRole({ idea, userId, mine, onChanged }: { idea: Idea; userId: string; mine: IdeaRole | null; onChanged: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function change(r: IdeaRole | '') {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await (r ? joinIdea(idea.id, userId, r) : leaveIdea(idea.id, userId))
      onChanged()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Field label="Your role" aside={mine ? 'Tap again to leave' : undefined}>
      <Segmented<IdeaRole | ''> label="Your role on this idea" value={mine ?? ''} allowNone onChange={change}
        options={ROLE_ORDER.map(r => ({ value: r, label: ROLE[r] }))} />
      {error && <p role="alert" className="px-1 text-xs text-destructive">{error}</p>}
    </Field>
  )
}
