import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

/*
 * Backend tests were left out, and nothing else ran them: there was no CI
 * workflow, so a pull request was checked by two Vercel builds and nothing
 * more. Migration 0016 dropped `posts.n` while the create endpoint kept
 * writing it, and creating a post stayed broken because `npm test` — the one
 * thing anyone runs — could not see the suite that covers it.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    /*
     * `node`, not `jsdom`. Building a DOM costs about a fifth of a second per
     * file, and most of this suite is plain functions: measured over 125 files,
     * environment time fell from 48.9s to 24.5s by flipping this default.
     *
     * A test that touches `document`, `window`, `localStorage` or renders a
     * component needs a DOM, so it goes in the globs below. The failure when
     * one is missing is loud — `document is not defined` — not subtle.
     */
    environment: 'node',
    environmentMatchGlobs: [
      // Anything that renders JSX.
      ['**/*.test.tsx', 'jsdom'],
      // Hooks: they need React's renderer, which needs a document.
      ['frontend/src/data/**/*.test.ts', 'jsdom'],
      ['frontend/src/lib/use*.test.ts', 'jsdom'],
      ['frontend/src/admin/lib/*.test.ts', 'jsdom'],
      // Reach into the real DOM: selections, key handling, media queries.
      ['frontend/src/admin/components/*.test.ts', 'jsdom'],
      ['frontend/src/lib/mediaShape.test.ts', 'jsdom'],
      ['frontend/src/lib/routeWords.test.ts', 'jsdom'],
      ['packages/post-renderer/src/elements/*.test.ts', 'jsdom'],
    ],
    include: [
      'frontend/src/**/*.test.{ts,tsx}',
      'packages/*/src/**/*.test.{ts,tsx}',
      'backend/**/*.test.ts',
    ],
    setupFiles: ['./vitest.setup.ts'],
  },
})
