import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Shared zod schemas (plan 00 Task A.1); used once Task B.12 wires the Sync layer.
  resolve: { alias: { '@contracts': fileURLToPath(new URL('../shared/contracts/src/index.ts', import.meta.url)) } },
  // Two pages: the patient board (index.html) and the admin page (admin.html, plan 00 Task B.15).
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('index.html', import.meta.url)),
        admin: fileURLToPath(new URL('admin.html', import.meta.url)),
      },
    },
  },
})
