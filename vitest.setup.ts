/*
 * Most files in this suite run in the `node` environment (see
 * vitest.config.ts), where there is no DOM to clean up and
 * `@testing-library/react` has nothing to attach to. Loading it there would
 * pay the import cost 80-odd times for nothing, so the whole setup is behind
 * a check for a document.
 */
if (typeof document !== 'undefined') {
  await import('@testing-library/jest-dom/vitest')
  const { cleanup } = await import('@testing-library/react')
  const { afterEach } = await import('vitest')

  /*
   * vitest.config.ts does not set test.globals, so @testing-library/react's
   * built-in auto-cleanup (which only registers when it finds a global
   * `afterEach`) never fires. Register it explicitly so DOM from one test
   * doesn't leak into the next.
   */
  afterEach(() => {
    cleanup()
  })
}
