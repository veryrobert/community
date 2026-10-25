import { useEffect, useRef } from 'react'

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

// Moves to a new address as a step the browser's back button returns from, or replaces the current one
export function writePath(path: string, replace = false) {
  const next = hashMode ? (path ? `#${path}` : location.pathname) : `/${path}`
  const now = hashMode ? location.hash || location.pathname : location.pathname
  if (now !== next) history[replace ? 'replaceState' : 'pushState'](null, '', next)
}

// Keeps a view's own part of the address (/people/<id>, /admin/tags) in step with what it shows.
// Opening the view within its own section (straight from a link, or back) replaces the address
// rather than adding a step; anything after that is a step.
export function useAddress(path: string) {
  const first = useRef(true)
  useEffect(() => {
    writePath(path, first.current && readPath()[0] === path.split('/')[0])
    first.current = false
  }, [path])
}

// A full link to a path, for sharing and copying
export function linkTo(path: string) {
  return hashMode ? `${location.origin}${location.pathname}#${path}` : `${location.origin}/${path}`
}

// Calls back when the address changes through the browser (back and forward)
export function onPathChange(fn: () => void) {
  addEventListener('popstate', fn)
  return () => removeEventListener('popstate', fn)
}
