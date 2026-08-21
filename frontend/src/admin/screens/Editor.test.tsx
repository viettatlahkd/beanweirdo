import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { CardData, ReportBlock } from 'post-renderer'
import { describe, expect, it, vi } from 'vitest'
import type { PostDetail } from '../lib/apiClient'
import { EditorCanvas } from './Editor'

// `body` is jsonb end to end (see lib/postData.ts) — its real shape depends
// on `template`, even though apiClient's PostDetail type narrows it to
// `SectionData[] | null` for convenience. Fixtures below intentionally pass
// CardData[]/ReportBlock[] through this `unknown`-typed override slot.
function basePost(overrides: Partial<Omit<PostDetail, 'body'>> & { body?: unknown } = {}): PostDetail {
  return {
    id: 'p1',
    moduleId: 'sensory',
    n: 1,
    en: 'Senses of Flavors',
    vi: 'mô tả',
    kind: 'essay',
    dateLabel: '2026.06',
    status: 'draft',
    template: 'article',
    heroImageUrl: null,
    sortOrder: 0,
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
    publishedAt: null,
    slug: 'senses-of-flavors',
    body: null,
    heroCaption: null,
    lead: 'một mô tả mở đầu',
    pullQuote: null,
    furtherReading: null,
    deletedAt: null,
    previousStatus: null,
    ...overrides,
  } as PostDetail
}

describe('EditorCanvas — article', () => {
  it('edits title, section heading/body and pull quote through the real Article overrides', async () => {
    const onChange = vi.fn()
    const post = basePost({
      body: [{ h: 'Nó là gì', p: 'nội dung cũ' }],
      pullQuote: 'trích dẫn cũ',
    })
    render(<EditorCanvas template="article" post={post} onChange={onChange} onHeroDrop={vi.fn()} />)

    const title = screen.getByDisplayValue('Senses of Flavors')
    await userEvent.type(title, '!')
    await userEvent.tab()
    expect(onChange).toHaveBeenLastCalledWith({ en: 'Senses of Flavors!' })

    const heading = screen.getByDisplayValue('Nó là gì')
    await userEvent.type(heading, '!')
    await userEvent.tab()
    expect(onChange).toHaveBeenLastCalledWith({ body: [{ h: 'Nó là gì!', p: 'nội dung cũ' }] })

    const body = screen.getByDisplayValue('nội dung cũ')
    await userEvent.type(body, ' thêm')
    await userEvent.tab()
    expect(onChange).toHaveBeenLastCalledWith({ body: [{ h: 'Nó là gì', p: 'nội dung cũ thêm' }] })

    const pull = screen.getByDisplayValue('trích dẫn cũ')
    await userEvent.type(pull, '!')
    await userEvent.tab()
    expect(onChange).toHaveBeenLastCalledWith({ pullQuote: 'trích dẫn cũ!' })
  })

  it('shows the existing hero image when set, and the drop prompt otherwise', () => {
    const { rerender } = render(
      <EditorCanvas template="article" post={basePost({ heroImageUrl: 'https://example.com/hero.png' })} onChange={vi.fn()} onHeroDrop={vi.fn()} />,
    )
    expect(document.querySelector('img')).toHaveAttribute('src', 'https://example.com/hero.png')

    rerender(<EditorCanvas template="article" post={basePost({ heroImageUrl: null })} onChange={vi.fn()} onHeroDrop={vi.fn()} />)
    expect(document.querySelector('img')).not.toBeInTheDocument()
    expect(screen.getByText(/kéo ảnh hero thả vào đây/)).toBeInTheDocument()
  })

  it('reports a dropped hero file via onHeroDrop', () => {
    const onHeroDrop = vi.fn()
    render(<EditorCanvas template="article" post={basePost()} onChange={vi.fn()} onHeroDrop={onHeroDrop} />)
    const dropZone = screen.getByText(/kéo ảnh hero thả vào đây/).closest('div') as HTMLElement
    const file = new File(['x'], 'hero.png', { type: 'image/png' })
    fireEvent.drop(dropZone, { dataTransfer: { files: [file] } })
    expect(onHeroDrop).toHaveBeenCalledWith(file)
  })
})

describe('EditorCanvas — cards', () => {
  const card: CardData = {
    hue: '#F2A0A5',
    groups: ['hoa'],
    title: 'Hoa nhài',
    sub: 'định nghĩa',
    tag: 'hương hoa · floral',
    parts: [{ type: 'method', heading: 'Phương pháp', body: 'mô tả phương pháp' }],
  }

  it('edits the title bar and card title through the real Cards overrides', async () => {
    const onChange = vi.fn()
    const post = basePost({ template: 'cards', body: [card] })
    render(<EditorCanvas template="cards" post={post} onChange={onChange} onHeroDrop={vi.fn()} />)

    // Cards has no override for the top-level post title, so it gets an external field.
    const titleBar = screen.getByDisplayValue('Senses of Flavors')
    await userEvent.type(titleBar, '!')
    await userEvent.tab()
    expect(onChange).toHaveBeenLastCalledWith({ en: 'Senses of Flavors!' })

    // the card term IS overridden, and visible even while the accordion is collapsed.
    const cardTitle = screen.getByDisplayValue('Hoa nhài')
    await userEvent.type(cardTitle, '!')
    await userEvent.tab()
    expect(onChange).toHaveBeenLastCalledWith({ body: [{ ...card, title: 'Hoa nhài!' }] })
  })

  it('edits a part heading and body once the card is opened', async () => {
    const onChange = vi.fn()
    const post = basePost({ template: 'cards', body: [card] })
    render(<EditorCanvas template="cards" post={post} onChange={onChange} onHeroDrop={vi.fn()} />)

    const cardRow = document.querySelector('[aria-expanded="false"]') as HTMLElement
    await userEvent.click(cardRow)

    const partHeading = screen.getByDisplayValue('Phương pháp')
    await userEvent.type(partHeading, '!')
    await userEvent.tab()
    expect(onChange).toHaveBeenLastCalledWith({
      body: [{ ...card, parts: [{ ...card.parts[0], heading: 'Phương pháp!' }] }],
    })

    const partBody = screen.getByDisplayValue('mô tả phương pháp')
    await userEvent.type(partBody, ' thêm')
    await userEvent.tab()
    expect(onChange).toHaveBeenLastCalledWith({
      body: [{ ...card, parts: [{ ...card.parts[0], body: 'mô tả phương pháp thêm' }] }],
    })
  })
})

describe('EditorCanvas — report', () => {
  const blocks: ReportBlock[] = [
    { type: 'meta', text: 'ROASTING · LOG · 2026.05' },
    { type: 'heading', text: 'Mẻ rang #14' },
  ]

  it('edits a block field in place', async () => {
    const onChange = vi.fn()
    const post = basePost({ template: 'report', body: blocks })
    render(<EditorCanvas template="report" post={post} onChange={onChange} onHeroDrop={vi.fn()} />)

    const metaField = screen.getByDisplayValue('ROASTING · LOG · 2026.05')
    await userEvent.type(metaField, '!')
    await userEvent.tab()
    expect(onChange).toHaveBeenLastCalledWith({ body: [{ type: 'meta', text: 'ROASTING · LOG · 2026.05!' }, blocks[1]] })
  })

  it('inserts a new block via the "+ thêm khối" menu', async () => {
    const onChange = vi.fn()
    const post = basePost({ template: 'report', body: blocks })
    render(<EditorCanvas template="report" post={post} onChange={onChange} onHeroDrop={vi.fn()} />)

    // one insert row before block 0, one after block 0, one after block 1
    const insertButtons = screen.getAllByText('+ thêm khối')
    await userEvent.click(insertButtons[1])
    await userEvent.click(screen.getByRole('button', { name: 'Đoạn văn' }))

    expect(onChange).toHaveBeenLastCalledWith({ body: [blocks[0], { type: 'paragraph', text: '' }, blocks[1]] })
  })

  it('removes a block', async () => {
    const onChange = vi.fn()
    const post = basePost({ template: 'report', body: blocks })
    render(<EditorCanvas template="report" post={post} onChange={onChange} onHeroDrop={vi.fn()} />)

    const removeButtons = screen.getAllByLabelText('xoá khối')
    await userEvent.click(removeButtons[0])

    expect(onChange).toHaveBeenLastCalledWith({ body: [blocks[1]] })
  })

  it('reorders a block with the move-down control', async () => {
    const onChange = vi.fn()
    const post = basePost({ template: 'report', body: blocks })
    render(<EditorCanvas template="report" post={post} onChange={onChange} onHeroDrop={vi.fn()} />)

    const moveDown = screen.getByLabelText('chuyển khối xuống')
    await userEvent.click(moveDown)

    expect(onChange).toHaveBeenLastCalledWith({ body: [blocks[1], blocks[0]] })
  })

  it('edits and adds items in a metrics block', async () => {
    const onChange = vi.fn()
    const metricsBlocks: ReportBlock[] = [{ type: 'metrics', items: [{ label: 'Nhiệt độ nạp', value: '198°C' }] }]
    const post = basePost({ template: 'report', body: metricsBlocks })
    render(<EditorCanvas template="report" post={post} onChange={onChange} onHeroDrop={vi.fn()} />)

    const valueField = screen.getByDisplayValue('198°C')
    await userEvent.type(valueField, '!')
    await userEvent.tab()
    expect(onChange).toHaveBeenLastCalledWith({ body: [{ type: 'metrics', items: [{ label: 'Nhiệt độ nạp', value: '198°C!' }] }] })

    await userEvent.click(screen.getByText('+ số liệu'))
    expect(onChange).toHaveBeenLastCalledWith({
      body: [{ type: 'metrics', items: [{ label: 'Nhiệt độ nạp', value: '198°C' }, { label: '', value: '' }] }],
    })
  })

  it('shows an empty-state prompt when there are no blocks yet', () => {
    render(<EditorCanvas template="report" post={basePost({ template: 'report', body: [] })} onChange={vi.fn()} onHeroDrop={vi.fn()} />)
    expect(screen.getByText(/Chưa có khối nào/)).toBeInTheDocument()
  })
})
