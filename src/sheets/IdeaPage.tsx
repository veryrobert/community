import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { ToolButton } from '@/components/shell/ToolButton'

// An idea opens as its own page, as an issue does on GitHub: back on the left, its actions on the right,
// then the idea in the reading column
export function IdeaPage({ onBack, actions, children }: { onBack: () => void; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-5">
      <div className="-mx-2 flex items-center justify-between">
        <ToolButton icon={ArrowLeft} label="Back" side="bottom" onClick={onBack} />
        {actions}
      </div>
      {children}
    </div>
  )
}
