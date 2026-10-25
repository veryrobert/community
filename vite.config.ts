import { copyFileSync } from 'node:fs'
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

// GitHub Pages can't send security headers, so the built page carries a Content Security Policy
// in a meta tag: scripts only from this site, network only to this Supabase project, no plugins,
// no forms posting elsewhere. Build only: the dev server needs inline scripts.
function csp(supabaseUrl: string, captcha: boolean): Plugin {
  const api = supabaseUrl.replace(/\/$/, '')
  const ws = api.replace(/^https/, 'wss')
  // Cloudflare Turnstile loads a script and an iframe from its own host, only when CAPTCHA is on
  const cf = captcha ? ' https://challenges.cloudflare.com' : ''
  const policy = [
    "default-src 'self'",
    `script-src 'self'${cf}`,
    `frame-src${cf || " 'none'"}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${api} https://avatars.githubusercontent.com`,
    "font-src 'self'",
    `connect-src 'self' ${api} ${ws}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
  return {
    name: 'csp',
    apply: 'build',
    transformIndexHtml: html => html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />\n    <meta name="referrer" content="strict-origin-when-cross-origin" />`),
  }
}

// Clean addresses (/people, /ideas/12) on GitHub Pages, which only has files: it serves 404.html for
// any path it doesn't know, so 404.html is the app too, and the app reads the address (lib/route.ts)
function spaFallback(): Plugin {
  return {
    name: 'spa-fallback',
    apply: 'build',
    closeBundle() { copyFileSync('dist/index.html', 'dist/404.html') },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  return {
    base: '/', // from the root, so deep addresses find the assets
    plugins: [react(), tailwindcss(), csp(env.VITE_SUPABASE_URL ?? '', Boolean(env.VITE_TURNSTILE_SITE_KEY)), spaFallback()],
    resolve: {
      alias: { '@': path.resolve(import.meta.dirname, './src') },
    },
  }
})
