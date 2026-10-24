import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initTheme } from '@/lib/theme'
import './index.css'
import App from './App.tsx'

// Refuse to run inside another site's frame (GitHub Pages can't send frame-ancestors), so the
// app can't be overlaid to trick someone into clicking
if (window.top !== window.self) throw new Error('This app can’t run in a frame.')

initTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
