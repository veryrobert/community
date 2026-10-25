import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { createForumThread, loadForumCategories } from '@/lib/data'
import type { ForumCategory } from '@/lib/types'

// Kept deliberately modest: forum posts are Markdown, so the same familiar text rules apply as
// ideas and comments. Categories are selected here; facilitators can curate the small set in SQL
// until the Admin category editor is added.
export function NewForumThread({ onPosted }: { onPosted: (slug: string) => void }) {
  const [categories, setCategories] = useState<ForumCategory[]>([])
  const [category, setCategory] = useState<number | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { loadForumCategories().then(cs => { setCategories(cs); setCategory(cs[0]?.id ?? null) }).catch(e => setError(e.message)) }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!category || title.trim().length < 3) return
    setBusy(true); setError(null)
    try { onPosted(await createForumThread({ category_id: category, title: title.trim(), body: body.trim() })) }
    catch (e) { setError((e as Error).message) }
    finally { setBusy(false) }
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-6 px-5 py-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-xs text-muted-foreground">Category</legend>
        <div className="flex flex-wrap gap-2">
          {categories.map(c => <button key={c.id} type="button" onClick={() => setCategory(c.id)} aria-pressed={category === c.id}
            className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring aria-pressed:bg-accent aria-pressed:text-foreground">
            {c.name}
          </button>)}
        </div>
      </fieldset>
      <label className="flex flex-col gap-2 text-xs text-muted-foreground">Title
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Start a discussion" minLength={3} maxLength={180} autoFocus />
      </label>
      <label className="flex flex-col gap-2 text-xs text-muted-foreground">What would you like to discuss?
        <Textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Markdown is supported" className="min-h-40" maxLength={12000} />
      </label>
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">Be constructive and generous.</p>
        <Button type="submit" disabled={busy || !category || title.trim().length < 3} className="h-10 rounded-md px-4 text-sm">Post</Button>
      </div>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </form>
  )
}
