import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'

// Light markdown for ideas, comments and updates: paragraphs, emphasis, links, lists, quotes, code.
// No images, headings or raw HTML, so posts stay text and stay in the app's type scale.
const ALLOWED = ['p', 'br', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre']

export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn('md text-sm leading-relaxed text-foreground', className)}>
      <ReactMarkdown
        allowedElements={ALLOWED}
        unwrapDisallowed
        skipHtml
        components={{ a: ({ node: _n, ...p }) => <a {...p} target="_blank" rel="noopener noreferrer" /> }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}

// For one-line excerpts: the text without markdown symbols
export function plain(md: string) {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}(>|[-*+]|\d+\.)\s+/gm, '')
    .replace(/[*_`~#]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
