import { describe, expect, it } from 'vitest'
import { POST_TEMPLATES as ON_THE_SERVER } from '../../../backend/lib/posts'
import { POST_TEMPLATES, POST_TEMPLATE_KEYS, TEMPLATE_LABEL } from './templates'

/**
 * The frontend's template list against the backend's.
 *
 * `packages/post-renderer/src/templateContract.test.ts` already ties the
 * backend list to the database constraint and to the renderer's dispatcher.
 * What it never looked at is the frontend, where the same list was written
 * out three more times — and where a template missing from a copy shows up as
 * an option the editor does not offer rather than as an error.
 *
 * Frontend and backend are separate Vercel deployments with separate
 * dependency trees, so the frontend cannot import the backend at runtime.
 * A test can, because tests run from the repo root.
 */

describe('the post template list agrees everywhere', () => {
  it('the frontend registry and the backend name the same templates', () => {
    expect([...POST_TEMPLATE_KEYS].sort()).toEqual([...ON_THE_SERVER].sort())
  })

  it('names every template on screen', () => {
    for (const t of POST_TEMPLATES) {
      expect(TEMPLATE_LABEL[t.key]).toBe(t.label)
      expect(t.label).not.toBe('')
    }
  })

  it('labels nothing that is not a template', () => {
    expect(Object.keys(TEMPLATE_LABEL).sort()).toEqual([...POST_TEMPLATE_KEYS].sort())
  })
})
