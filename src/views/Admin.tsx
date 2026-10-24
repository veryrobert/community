import { useState } from 'react'
import { Segmented } from '@/components/shell/Segmented'
import { Facilitation, type AdminSection } from '@/sheets/Settings'
import type { Store } from '@/lib/data'

// Facilitators' own area, separate from anyone's personal Settings: the community itself,
// its goals and tags, and who's in it
export function Admin({ store, onChanged }: { store: Store; onChanged: () => void }) {
  const [section, setSection] = useState<AdminSection>('community')
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-5">
      <div className="flex flex-col gap-5">
        <h1 className="text-xl text-foreground">Admin</h1>
        <Segmented<AdminSection> label="Admin section" value={section} onChange={setSection}
          options={[{ value: 'community', label: 'Community' }, { value: 'tags', label: 'Goals and tags' }, { value: 'people', label: 'People' }]} />
      </div>
      <Facilitation key={section} store={store} onChanged={onChanged} section={section} />
    </div>
  )
}
