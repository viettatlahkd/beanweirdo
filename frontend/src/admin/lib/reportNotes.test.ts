import type { ReportBlock } from 'post-renderer'
import { describe, expect, it } from 'vitest'
import {
  cloneBlock,
  ensureIds,
  mergeTarget,
  moveBlock,
  removeBlock,
  toBody,
  vanishesWhenEmpty,
  type ReportContent,
} from './reportNotes'

const content = (): ReportContent => ({
  blocks: [
    { id: 'b1', type: 'heading', text: 'Tổng quan' },
    { id: 'b2', type: 'paragraph', text: 'Mẻ này đẩy lửa cao hơn 8%.' },
    { id: 'b3', type: 'image', caption: 'nhân sau khi drop' },
  ],
  notes: {
    explorations: [{ id: 'n1', text: 'Cần mua ẩm kế.' }],
    fieldNotes: [{ id: 'n2', anchor: 'b2', text: 'First crack muộn hơn.' }],
  },
})

describe('naming the blocks', () => {
  it('gives an id to a post written before notes existed', () => {
    const named = ensureIds([{ type: 'heading', text: 'A' }, { type: 'paragraph', text: 'B' }])
    expect(named.map((b) => b.id)).toEqual(['b1', 'b2'])
  })

  it('keeps ids that are already there, so existing notes stay attached', () => {
    const named = ensureIds([{ id: 'b7', type: 'heading', text: 'A' }, { type: 'paragraph', text: 'B' }])
    expect(named.map((b) => b.id)).toEqual(['b7', 'b1'])
  })
})

describe('emptying a block', () => {
  it('makes a paragraph vanish — the writer already said there is none', () => {
    expect(vanishesWhenEmpty({ type: 'paragraph', text: '' })).toBe(true)
  })

  it('leaves every other kind in place, to be rewritten', () => {
    const kinds: ReportBlock[] = [
      { type: 'heading', text: '' },
      { type: 'meta', text: '' },
      { type: 'table', table: { columns: [], rows: [] } },
      { type: 'image', caption: '' },
    ]
    expect(kinds.map(vanishesWhenEmpty)).toEqual([false, false, false, false])
  })

  it('merges into the nearest text above, skipping what is not text', () => {
    const blocks = content().blocks
    expect(mergeTarget(blocks, 2)).toBe(1)
    expect(mergeTarget(blocks, 0)).toBeNull()
    expect(mergeTarget([{ type: 'image', caption: '' }, { type: 'paragraph', text: '' }], 1)).toBeNull()
  })
})

describe('deleting a block that has notes', () => {
  it('re-anchors them to the block above', () => {
    const out = removeBlock(content(), 1, 'up')
    expect(out.blocks.map((b) => b.id)).toEqual(['b1', 'b3'])
    expect(out.notes.fieldNotes).toEqual([{ id: 'n2', anchor: 'b1', text: 'First crack muộn hơn.' }])
  })

  it('re-anchors them to the block below', () => {
    expect(removeBlock(content(), 1, 'down').notes.fieldNotes[0].anchor).toBe('b3')
  })

  it('carries them into the explorations, keeping the ones already there', () => {
    const out = removeBlock(content(), 1, 'explorations')
    expect(out.notes.explorations.map((e) => e.text)).toEqual(['Cần mua ẩm kế.', 'First crack muộn hơn.'])
    expect(out.notes.fieldNotes).toEqual([])
  })

  it('drops them when that is what was chosen', () => {
    const out = removeBlock(content(), 1, 'delete')
    expect(out.notes.fieldNotes).toEqual([])
    expect(out.notes.explorations).toHaveLength(1)
  })

  it('falls back to the explorations when the chosen side has no block', () => {
    const c = content()
    c.notes.fieldNotes = [{ id: 'n2', anchor: 'b1', text: 'Ghi ở khối đầu.' }]
    const out = removeBlock(c, 0, 'up')
    expect(out.notes.explorations.map((e) => e.text)).toContain('Ghi ở khối đầu.')
    expect(out.notes.fieldNotes).toEqual([])
  })

  it('leaves notes on other blocks alone', () => {
    const out = removeBlock(content(), 2, 'delete')
    expect(out.notes.fieldNotes).toHaveLength(1)
  })
})

describe('moving a block', () => {
  it('lifts it out and drops it in, rather than swapping with a neighbour', () => {
    const moved = moveBlock(content().blocks, 0, 2)
    expect(moved.map((b) => b.id)).toEqual(['b2', 'b3', 'b1'])
  })

  it('leaves the notes untouched, because they hold ids and not positions', () => {
    const c = content()
    const moved = moveBlock(c.blocks, 0, 2)
    expect(moved.find((b) => b.id === 'b2')).toBeTruthy()
    expect(c.notes.fieldNotes[0].anchor).toBe('b2')
  })

  it('does nothing when there is nowhere to go', () => {
    const blocks = content().blocks
    expect(moveBlock(blocks, 0, -1)).toBe(blocks)
    expect(moveBlock(blocks, 1, 1)).toBe(blocks)
  })
})

describe('cloning a block', () => {
  it('puts the copy directly beneath, under a name of its own', () => {
    const out = cloneBlock(content(), 0)
    expect(out.blocks.map((b) => b.id)).toEqual(['b1', 'b4', 'b2', 'b3'])
  })

  it('brings the notes along, anchored to the copy', () => {
    const out = cloneBlock(content(), 1)
    const copy = out.blocks[2]
    expect(out.notes.fieldNotes.map((n) => n.anchor)).toEqual(['b2', copy.id])
    expect(out.notes.fieldNotes[1].text).toBe('First crack muộn hơn.')
  })
})

describe('what gets stored', () => {
  it('writes the notes beside the blocks, last and keyed', () => {
    const body = toBody(content())
    expect(body).toHaveLength(4)
    expect((body[3] as { type: string }).type).toBe('notes')
  })

  it('adds nothing at all to a post with no notes', () => {
    const body = toBody({ blocks: content().blocks, notes: { explorations: [], fieldNotes: [] } })
    expect(body).toHaveLength(3)
  })
})
