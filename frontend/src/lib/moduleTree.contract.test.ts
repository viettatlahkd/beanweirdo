import { describe, expect, it } from 'vitest'
import { canReparent as onTheScreen } from './contentTree'
import { canReparent as onTheServer } from '../../../backend/lib/modules'

/**
 * One rule about the table of contents, written in two places that cannot
 * import each other.
 *
 * The frontend needs it so the CMS can grey out a move that will not work; the
 * backend needs it because the frontend is not the only thing that can call
 * the API, and a loop written into `modules` leaves a branch no walk can climb
 * out of. Backend and frontend are separate Vercel deployments with separate
 * dependency trees, so sharing the source would mean the backend build
 * reaching outside its own folder — a deployment risk taken for twenty lines.
 *
 * The same shape already went wrong once here with the template list: three
 * copies, no link between them, and months of `400` in production before
 * anyone noticed. `templateContract.test.ts` exists for that. This is the same
 * guard for the same reason, and it runs both implementations rather than
 * reading either one's source, so it compares behaviour and not spelling.
 */

const site = [
  { id: 'tuduy', parent_id: null },
  { id: 'bean', parent_id: null },
  { id: 'ghi', parent_id: null },
  { id: 'roasting', parent_id: 'bean' },
  { id: 'biochem', parent_id: 'bean' },
  { id: 'heat', parent_id: 'roasting' },
]

/** Pre-0025 rows: the column is missing rather than null. */
const unmigrated = [{ id: 'sensory' }, { id: 'biochem' }]

const cases: { name: string; rows: typeof site | typeof unmigrated; child: string; parent: string | null }[] = [
  { name: 'move to the top', rows: site, child: 'roasting', parent: null },
  { name: 'move one level down', rows: site, child: 'tuduy', parent: 'bean' },
  { name: 'move two levels down', rows: site, child: 'ghi', parent: 'heat' },
  { name: 'a module inside itself', rows: site, child: 'bean', parent: 'bean' },
  { name: 'inside its own child', rows: site, child: 'bean', parent: 'roasting' },
  { name: 'inside its own grandchild', rows: site, child: 'bean', parent: 'heat' },
  { name: 'inside a sibling, which is fine', rows: site, child: 'biochem', parent: 'roasting' },
  { name: 'a parent that does not exist', rows: site, child: 'bean', parent: 'khong-co' },
  { name: 'a child that does not exist', rows: site, child: 'khong-co', parent: 'bean' },
  { name: 'on a table that has not been migrated', rows: unmigrated, child: 'sensory', parent: 'biochem' },
]

describe('the reparent rule agrees on both sides of the API', () => {
  for (const c of cases) {
    it(`agrees on: ${c.name}`, () => {
      const screen = onTheScreen(c.rows, c.child, c.parent)
      const server = onTheServer(c.rows, c.child, c.parent)
      expect(screen.ok).toBe(server.ok)
      if (screen.ok === false && server.ok === false) {
        expect(screen.reason).toBe(server.reason)
      }
    })
  }
})

describe('the rule itself', () => {
  it('refuses every way of making a loop', () => {
    for (const parent of ['bean', 'roasting', 'heat']) {
      expect(onTheServer(site, 'bean', parent).ok).toBe(false)
    }
  })

  it('allows the moves that deepen the tree, which is the point of the column', () => {
    expect(onTheServer(site, 'ghi', 'bean').ok).toBe(true)
    expect(onTheServer(site, 'ghi', 'heat').ok).toBe(true)
  })

  it('still answers, on both sides, for a table that already contains a loop', () => {
    // Nothing should be able to write this, but a check that hangs on bad data
    // is worse than no check: the request never returns and the log says
    // nothing. Both sides must come back with the same verdict.
    const broken = [
      { id: 'a', parent_id: 'b' },
      { id: 'b', parent_id: 'a' },
      { id: 'c', parent_id: null },
    ]

    // Inside the loop: `b` is already below `a`, so this is refused.
    expect(onTheServer(broken, 'a', 'b').ok).toBe(false)
    expect(onTheScreen(broken, 'a', 'b').ok).toBe(false)

    // Outside it: `c` holds nothing, so filing it under `a` breaks no rule —
    // the point is that the walk over the loop ended to say so.
    expect(onTheServer(broken, 'c', 'a')).toEqual(onTheScreen(broken, 'c', 'a'))
    expect(onTheServer(broken, 'c', 'a').ok).toBe(true)
  })
})
