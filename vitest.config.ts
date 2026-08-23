import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    /*
     * Backend tests were left out, and nothing else ran them: there is no CI
     * workflow, so a pull request is checked by two Vercel builds and nothing
     * more. Migration 0016 dropped `posts.n` while the create endpoint kept
     * writing it, and creating a post stayed broken because `npm test` — the
     * one thing anyone runs — could not see the suite that covers it.
     */
    include: [
      'frontend/src/**/*.test.{ts,tsx}',
      'packages/*/src/**/*.test.{ts,tsx}',
      'backend/**/*.test.ts',
    ],
    setupFiles: ['./vitest.setup.ts'],
  },
})
