import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// vitest.config.ts does not set test.globals, so @testing-library/react's
// built-in auto-cleanup (which only registers when it finds a global
// `afterEach`) never fires. Register it explicitly so DOM from one test
// doesn't leak into the next.
afterEach(() => {
  cleanup()
})
