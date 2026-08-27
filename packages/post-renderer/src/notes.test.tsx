import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  fieldNotesLabel,
  hasNotes,
  liveExplorations,
  nextId,
  notesOn,
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
