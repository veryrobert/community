// Appearance: dark (the default), light, or follow the device. A setting for this device, kept
// in localStorage, since someone may want light on a laptop and dark on their phone.
export type Theme = 'dark' | 'light' | 'system'
const KEY = 'community:theme'
const media = () => matchMedia('(prefers-color-scheme: light)')

export function getTheme(): Theme {
  try {
    const t = localStorage.getItem(KEY)
    return t === 'light' || t === 'system' ? t : 'dark'
  } catch { return 'dark' }
}

function apply(theme: Theme) {
  const light = theme === 'light' || (theme === 'system' && media().matches)
  const html = document.documentElement
  html.dataset.theme = light ? 'light' : 'dark'
  html.classList.toggle('dark', !light)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', light ? '#f7f6f3' : '#000000')
}

export function setTheme(theme: Theme) {
  try { localStorage.setItem(KEY, theme) } catch { /* private mode */ }
  apply(theme)
}

// Call once before the first render, so the page never flashes the wrong colours
export function initTheme() {
  apply(getTheme())
  media().addEventListener('change', () => { if (getTheme() === 'system') apply('system') })
}
