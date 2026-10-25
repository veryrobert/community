// Clean addresses: /, /roadmap, /people, /ideas/12, /roadmap/12, /admin/people. GitHub Pages serves the
// app for any path through 404.html (see vite.config.ts). The demo is a single file, demo.html, so it
// keeps the same paths after a # instead, whether opened as /demo.html or /demo.
const hashMode = /\.html$|^\/demo\/?$/.test(location.pathname)

// Older links used #ideas/12; move them to /ideas/12. Leaves sign-in returns (#access_token=…) alone.
if (!hashMode && /^#[a-z][\w/-]*$/i.test(location.hash)) {
  history.replaceState(null, '', `/${location.hash.slice(1)}`)
}

// The address as parts, e.g. ['ideas', '12']
export function readPath(): string[] {
  return (hashMode ? location.hash.slice(1) : location.pathname.slice(1)).split('/').filter(Boolean)
}

// Replaces the address without adding to history; the app has its own back buttons
export function writePath(path: string) {
  const next = hashMode ? (path ? `#${path}` : location.pathname) : `/${path}`
  const now = hashMode ? location.hash || location.pathname : location.pathname
  if (now !== next) history.replaceState(null, '', next)
}

// A full link to a path, for sharing and copying
export function linkTo(path: string) {
  return hashMode ? `${location.origin}${location.pathname}#${path}` : `${location.origin}/${path}`
}

// Calls back when the address changes through the browser (back and forward)
export function onPathChange(fn: () => void) {
  const event = hashMode ? 'hashchange' : 'popstate'
  addEventListener(event, fn)
  return () => removeEventListener(event, fn)
}
