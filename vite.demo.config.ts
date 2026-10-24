import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

const src = path.resolve(import.meta.dirname, './src')
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  build: { outDir: 'dist-demo', assetsInlineLimit: 100_000_000, rollupOptions: { input: 'demo.html' } },
  resolve: {
    alias: [
      { find: '@/lib/data', replacement: `${src}/demo/data.ts` },
      { find: '@/lib/auth', replacement: `${src}/demo/auth.ts` },
      { find: '@/lib/supabase', replacement: `${src}/demo/supabase.ts` },
      { find: '@', replacement: src },
    ],
  },
})
