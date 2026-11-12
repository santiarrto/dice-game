import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  root: fileURLToPath(new URL('./src', import.meta.url)),
  plugins: [react()],
  build: {
    outDir: fileURLToPath(new URL('./dist', import.meta.url)),
    emptyOutDir: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./test-setup.ts'],
    exclude: [...configDefaults.exclude, 'tests/e2e/**'],
  },
})
