import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReportBlock } from 'post-renderer'
import { describe, expect, it, vi } from 'vitest'
import type { PostDetail } from '../lib/apiClient'
import { EditorCanvas } from './Editor'

function basePost(body: unknown): PostDetail {
  return {
    id: 'p1',
    module_id: 'sensory',
    en: 'Rang thử',
    vi: 'mô tả',
    date_label: '2026.06',
    status: 'draft',
    template: 'report',
    hero_image_url: null,
    sort_order: 0,
    slug: 'rang-thu',
    body,
    lead: '',
  } as unknown as PostDetail
}

const blocks: ReportBlock[] = [
  { id: 'b1', type: 'heading', text: 'Tổng quan' },
  { id: 'b2', type: 'paragraph', text: 'Đẩy lửa cao hơn 8%.' },
  { id: 'b3', type: 'image', caption: 'nhân sau khi drop' },
]

/*
 * Ghi chú neo vào một **widget** cho mấy bài kiểm xoá khối.
 *
 * Chữ nay nằm trong dải liền mạch nên không có nút "xoá khối" riêng — xoá chữ
 * là xoá chữ. Chỉ widget (ảnh, bảng, số liệu) mới còn nút ấy, nên hộp thoại
 * "ghi chú đi đâu" cũng chỉ gặp ở đó.
 */
const noteOnImage = [
  ...blocks,
  { type: 'notes', explorations: [], fieldNotes: [{ id: 'n1', anchor: 'b3', text: 'First crack muộn hơn.' }] },
]

const withNote = [
  ...blocks,
  { type: 'notes', explorations: [], fieldNotes: [{ id: 'n1', anchor: 'b2', text: 'First crack muộn hơn.' }] },
]

const draw = (body: unknown, onChange = vi.fn()) => {
  render(<EditorCanvas template="report" post={basePost(body)} onChange={onChange} onHeroDrop={vi.fn()} />)
  return onChange
}

describe('the notes column in the editor', () => {
  it('shows both halves, so neither is behind a switch to find', () => {
    draw(withNote)
    expect(screen.getByText('Explorations')).toBeInTheDocument()
    expect(screen.getByText('Field notes')).toBeInTheDocument()
    expect(screen.getByDisplayValue('First crack muộn hơn.')).toBeInTheDocument()
  })

  it('writes a new exploration into the body beside the blocks', async () => {
    const onChange = draw(blocks)
    await userEvent.click(screen.getByLabelText('thêm vào Explorations'))

    const body = onChange.mock.lastCall?.[0].body as { type: string; explorations: unknown[] }[]
    expect(body).toHaveLength(4)
    expect(body[3].type).toBe('notes')
    expect(body[3].explorations).toEqual([{ id: 'n1', text: '' }])
  })

  it('anchors a field note to its block, not to its position', async () => {
    const onChange = draw(blocks)
    await userEvent.click(screen.getAllByLabelText('thêm ghi chú cho khối này')[0])

    const body = onChange.mock.lastCall?.[0].body as { type: string; fieldNotes: { anchor: string }[] }[]
    // Nút ✎ nay chỉ có ở widget, nên ghi chú neo vào tấm ảnh.
    expect(body[3].fieldNotes).toEqual([{ id: 'n1', anchor: 'b3', text: '' }])
  })

  it('adds nothing to the body of a post nobody wrote notes on', async () => {
    const onChange = draw(blocks)
    await userEvent.click(screen.getAllByLabelText('nhân bản khối')[0])
    expect(onChange.mock.lastCall?.[0].body).toHaveLength(4)
    expect((onChange.mock.lastCall?.[0].body as { type: string }[]).every((b) => b.type !== 'notes')).toBe(true)
  })
})

/*
 * The undo window is two real seconds. Faking the clock here breaks
 * testing-library's own flushing — every click hangs — so these wait for real
 * time instead. Three tests pay two seconds each; the alternative is a timer
 * length threaded through the component only so a test can shorten it, which
 * would leave the thing being tested different from the thing that ships.
 */
describe('deleting a block that has writing beside it', () => {
  it('asks where the writing goes, with deleting it as one of the choices', async () => {
    draw(noteOnImage)
    await userEvent.click(screen.getByLabelText('xoá khối'))

    expect(screen.getByText(/Khối này có 1 ghi chú/)).toBeInTheDocument()
    expect(screen.getByText('Lưu lên đoạn trên')).toBeInTheDocument()
    // Tấm ảnh là khối cuối, nên không có bên dưới để mà lưu xuống.
    expect(screen.queryByText('Lưu xuống đoạn dưới')).not.toBeInTheDocument()
    expect(screen.getByText('Chuyển sang Explorations')).toBeInTheDocument()
    expect(screen.getByText('Xoá cùng khối')).toBeInTheDocument()
  })

  it('does not ask at all when there is nothing to lose', async () => {
    const onChange = draw(withNote)
    await userEvent.click(screen.getByLabelText('xoá khối'))
    expect(screen.queryByText(/Làm gì với chúng/)).not.toBeInTheDocument()
    expect(onChange).toHaveBeenCalled()
  })

  it('offers only the sides that have a block on them', async () => {
    draw([blocks[2], { type: 'notes', explorations: [], fieldNotes: [{ id: 'n1', anchor: 'b3', text: 'x' }] }])
    await userEvent.click(screen.getByLabelText('xoá khối'))

    expect(screen.queryByText('Lưu lên đoạn trên')).not.toBeInTheDocument()
    expect(screen.queryByText('Lưu xuống đoạn dưới')).not.toBeInTheDocument()
    expect(screen.getByText('Chuyển sang Explorations')).toBeInTheDocument()
  })

  it(
    'waits before doing it, with no confirm step in between',
    async () => {
      const onChange = draw(noteOnImage)
      await userEvent.click(screen.getByLabelText('xoá khối'))
      await userEvent.click(screen.getByText('Lưu lên đoạn trên'))

      expect(screen.getByText('← quay lại')).toBeInTheDocument()
      expect(onChange).not.toHaveBeenCalled()

      await waitFor(() => expect(onChange).toHaveBeenCalled(), { timeout: 4000 })

      const body = onChange.mock.lastCall?.[0].body as { type: string; fieldNotes?: { anchor: string }[] }[]
      expect(body.filter((b) => b.type !== 'notes')).toHaveLength(2)
      expect(body.find((b) => b.type === 'notes')?.fieldNotes).toEqual([
        { id: 'n1', anchor: 'b2', text: 'First crack muộn hơn.' },
      ])
    },
    10000,
  )

  it(
    'takes it back if the writer says so inside the window',
    async () => {
      const onChange = draw(noteOnImage)
      await userEvent.click(screen.getByLabelText('xoá khối'))
      await userEvent.click(screen.getByText('Xoá cùng khối'))
      await userEvent.click(screen.getByText('← quay lại'))

      await new Promise((r) => setTimeout(r, 2600))

      expect(onChange).not.toHaveBeenCalled()
      expect(screen.getByText('Xoá cùng khối')).toBeInTheDocument()
    },
    10000,
  )

  it(
    'drops the writing when that is the choice',
    async () => {
      const onChange = draw(noteOnImage)
      await userEvent.click(screen.getByLabelText('xoá khối'))
      await userEvent.click(screen.getByText('Xoá cùng khối'))
      await waitFor(() => expect(onChange).toHaveBeenCalled(), { timeout: 4000 })

      const body = onChange.mock.lastCall?.[0].body as { type: string }[]
      expect(body.some((b) => b.type === 'notes')).toBe(false)
      expect(body).toHaveLength(2)
    },
    10000,
  )
})

describe('the blocks a report can hold', () => {
  it('offers a quote and a highlight box beside the older kinds', async () => {
    draw(blocks)
    await userEvent.click(screen.getAllByLabelText('thêm khối')[0])
    expect(screen.getByRole('button', { name: 'Trích dẫn' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Khối nhấn' })).toBeInTheDocument()
  })

  it('đổi cấp tiêu đề bằng số dấu thăng, không bằng nút', async () => {
    // Tiêu đề nay là một dòng trong dải chữ, nên cấp của nó là số dấu thăng
    // người viết gõ. Ba cái nút H1/H2/H3 cũ không còn chỗ đứng.
    const onChange = draw([{ id: 'b1', type: 'heading', text: 'Tổng quan', level: 2 }])
    await userEvent.click(screen.getByText('Tổng quan'))
    const run = screen.getByDisplayValue('## Tổng quan')
    await userEvent.clear(run)
    await userEvent.type(run, '### Tổng quan')
    await userEvent.tab()

    const body = onChange.mock.lastCall?.[0].body as { level?: number }[]
    expect(body[0].level).toBe(3)
  })

  it('cấp hiện tại đọc ra được ngay trong chữ thô', async () => {
    draw([{ id: 'b1', type: 'heading', text: 'Tổng quan', level: 2 }])
    await userEvent.click(screen.getByText('Tổng quan'))
    expect(screen.getByDisplayValue('## Tổng quan')).toBeInTheDocument()
  })

  it('writes the quote mark itself, so nobody types one', () => {
    draw([{ id: 'b1', type: 'quote', text: 'Vị mỏng ở cuối.', attribution: 'sổ rang' }])
    // Trích dẫn nay là chữ trong dải: dấu ngoặc kép do template in, còn nguồn
    // đi kèm dưới dạng một dòng gạch ngang.
    expect(screen.getByText('Vị mỏng ở cuối.')).toBeInTheDocument()
    expect(screen.getByText(/sổ rang/)).toBeInTheDocument()
  })
})
