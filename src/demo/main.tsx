import { createRoot } from 'react-dom/client'
import { initTheme } from '@/lib/theme'
import '@/index.css'
import App from '@/App'

// The real app, start to finish, on sample data in memory (see demo/data.ts and demo/auth.ts).
// Nothing is saved; reloading resets it.
initTheme()

createRoot(document.getElementById('root')!).render(<App />)
