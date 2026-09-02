import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  fieldNotesLabel,
  hasNotes,
  liveExplorations,
  nextId,
  notesOn,
  segmentsFor,
  orphanNotes,
  readNotes,
  type PostNotes,
} from './notes'
import { Report } from './Report'
import type { ReportPostData } from './types'

const notes: PostNotes = {
  explorations: [
    { id: 'n1', text: 'Lần sau hạ lửa ở phút 6.' },
    { id: 'n2', text: 'Cần mua ẩm kế nhân.' },
  ],
  fieldNotes: [
    { id: 'n3', anchor: 'b2', text: 'First crack muộn hơn — nghi độ ẩm.' },
  ],
}

const post: ReportPostData = {
  title: 'Rang thử',
  template: 'report',
  blocks: [
    { id: 'b1', type: 'heading', text: 'Tổng quan' },
    { id: 'b2', type: 'paragraph', text: 'Mẻ này đẩy lửa cao hơn 8%.' },
  ],
  notes,
}

describe('reading what the database holds', () => {
  it('treats a post written before notes existed as having none', () => {
    expect(readNotes(undefined)).toEqual({ explorations: [], fieldNotes: [] })
    expect(hasNotes(readNotes(null))).toBe(false)
  })

  it('drops half-written entries rather than throwing', () => {
    const read = readNotes({ explorations: [{ id: 'n1', text: 'ok' }, { text: 'chưa có id' }], fieldNotes: 'hỏng' })
    expect(read.explorations).toHaveLength(1)
    expect(read.fieldNotes).toEqual([])
  })
})

describe('a half with nothing written in it', () => {
  it('does not count as content', () => {
    expect(hasNotes({ explorations: [{ id: 'n1', text: '   ' }], fieldNotes: [] })).toBe(false)
  })

  it('so both halves can exist from the start and only the written one draws', () => {
    const half: PostNotes = { explorations: [{ id: 'n1', text: 'có chữ' }], fieldNotes: [{ id: 'n2', anchor: 'b1', text: '' }] }
    expect(liveExplorations(half)).toHaveLength(1)
    expect(notesOn(half, 'b1')).toEqual([])
  })
})

describe('a field note holds the block, not the position', () => {
  it('finds its block by id', () => {
    expect(notesOn(notes, 'b2').map((n) => n.text)).toEqual(['First crack muộn hơn — nghi độ ẩm.'])
    expect(notesOn(notes, 'b1')).toEqual([])
    expect(notesOn(notes, undefined)).toEqual([])
  })

  it('is an orphan when its block is gone — for the editor to ask about', () => {
    expect(orphanNotes(notes, ['b1'])).toHaveLength(1)
    expect(orphanNotes(notes, ['b1', 'b2'])).toEqual([])
  })
})

describe('the name follows the template', () => {
  it.each([
    ['report', 'Field notes'],
    ['memo', 'Memo notes'],
    ['article', 'Article notes'],
    ['cards', 'Card notes'],
    ['longform', 'Longform notes'],
  ])('%s → %s', (template, label) => {
    expect(fieldNotesLabel(template)).toBe(label)
  })

  it('falls back rather than printing a blank heading', () => {
    expect(fieldNotesLabel(null)).toBe('Notes')
  })
})

describe('ids count up from what is already there', () => {
  it('so the same edit produces the same id', () => {
    expect(nextId('n', [])).toBe('n1')
    expect(nextId('n', ['n1', 'n2'])).toBe('n3')
    expect(nextId('n', ['n2'])).toBe('n1')
  })
})

describe('the notes column on the page', () => {
  it('draws both halves, named for the template', () => {
    render(<Report post={post} />)
    expect(screen.getByText('Explorations')).toBeTruthy()
    expect(screen.getByText('Field notes')).toBeTruthy()
    expect(screen.getByText('Lần sau hạ lửa ở phút 6.')).toBeTruthy()
  })

  it('puts a field note in the same grid row as the block it holds', () => {
    const { container } = render(<Report post={post} />)
    const note = screen.getByText('First crack muộn hơn — nghi độ ẩm.').closest('div[style*="grid-row"]')
    const block = container.querySelector('[data-testid="report-block-1"]')?.closest('div[style*="grid-row"]')
    expect(note).toBeTruthy()
    expect((note as HTMLElement).style.gridRow).toBe((block as HTMLElement).style.gridRow)
  })

  it('leaves the column out entirely when nothing is written', () => {
    render(<Report post={{ ...post, notes: { explorations: [], fieldNotes: [] } }} />)
    expect(screen.queryByText('Explorations')).toBeNull()
    expect(screen.queryByText('Field notes')).toBeNull()
  })

  it('keeps one spacing model whether or not notes are there', () => {
    const withNotes = render(<Report post={post} />).container.querySelector('[data-testid="report-block-0"]')
    const without = render(<Report post={{ ...post, notes: undefined }} />).container.querySelector(
      '[data-testid="report-block-0"]',
    )
    expect((withNotes as HTMLElement).style.margin).toBe((without as HTMLElement).style.margin)
  })
})

describe('how the column is cut into cells', () => {
  const blocks = [{ id: 'b1' }, { id: 'b2' }, { id: 'b3' }, { id: 'b4' }]

  it('opens a run at each annotated block and keeps the unannotated ones with it', () => {
    const n = { explorations: [], fieldNotes: [{ id: 'n1', anchor: 'b2', text: 'x' }] }
    expect(segmentsFor(blocks, n)).toEqual([
      { start: 0, end: 1, anchor: undefined },
      { start: 1, end: 4, anchor: 'b2' },
    ])
  })

  it('gives the explorations the whole column when no block is annotated', () => {
    expect(segmentsFor(blocks, undefined)).toEqual([{ start: 0, end: 4, anchor: undefined }])
  })

  it('still opens at block 0 when that is the annotated one', () => {
    const n = { explorations: [], fieldNotes: [{ id: 'n1', anchor: 'b1', text: 'x' }] }
    expect(segmentsFor(blocks, n)).toEqual([{ start: 0, end: 4, anchor: 'b1' }])
  })

  it('handles a post with no blocks at all', () => {
    expect(segmentsFor([], undefined)).toEqual([])
  })
})

describe('where the explorations sit', () => {
  it('at the head of the column, above the field notes — not at the foot', () => {
    // Two cells here — one opens the column, one holds the note — so read the
    // order across the whole column, not inside a single cell.
    const { container } = render(<Report post={post} />)
    const text = Array.from(container.querySelectorAll('div')).map((d) => d.textContent)
    expect(text.indexOf('Explorations')).toBeGreaterThan(-1)
    expect(text.indexOf('Explorations')).toBeLessThan(text.indexOf('Field notes'))
  })

  it('shares the first cell with the run of blocks before the first note', () => {
    const { container } = render(<Report post={post} />)
    const exp = Array.from(container.querySelectorAll('div')).find((d) => d.textContent === 'Explorations')
    const cell = exp?.closest('div[style*="grid-row"]') as HTMLElement
    expect(cell.style.gridRow).toBe('1')
  })
})
