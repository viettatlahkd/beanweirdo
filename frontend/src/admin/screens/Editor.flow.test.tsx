/**
 * Thân bài là một dải chữ liền mạch.
 *
 * Chủ site: *"cho nó thành liền mạch đi, chia khối này ẻ quá"*, và *"tôi muốn
 * bôi đen một loạt thì nó vẫn đang nhận mỗi bullet point là 1 dòng à?"*.
 *
 * Điều quan trọng nhất ở đây là **một ô nhập cho cả dải**. Trình duyệt không
 * cho một vùng chọn trải qua hai ô nhập, nên chừng nào mỗi khối còn một ô
 * riêng thì chừng ấy không bôi đen qua hai khối được. Mấy bài kiểm dưới đây
 * canh đúng chỗ ấy.
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import type { ReportBlock } from 'post-renderer'
import { textToRuns } from 'post-renderer'
import { describe, expect, it, vi } from 'vitest'
import type { PostDetail } from '../lib/apiClient'
import { EditorCanvas } from './Editor'

const head = (text: string, id: string) => ({ type: 'heading', id, level: 2, text }) as unknown as ReportBlock
const para = (text: string, id: string) => ({ type: 'paragraph', id, text }) as unknown as ReportBlock
const list = (id: string, ...lines: string[]) =>
  ({ type: 'list', id, items: lines.map((t) => ({ runs: textToRuns(t) })) }) as unknown as ReportBlock
const table = (id: string) =>
  ({ type: 'table', id, table: { columns: ['Ngày'], rows: [{ cells: ['01'] }], widths: [100] } }) as unknown as ReportBlock

/** Màn soạn tự nuôi lại chính nó, để gõ được nhiều bước liên tiếp. */
function draw(template: 'report' | 'memo' | 'bitesize', start: unknown) {
  const onChange = vi.fn()
  function Harness() {
    const [body, setBody] = useState<unknown>(start)
    return (
      <EditorCanvas
        template={template}
        post={
          {
            id: 'p1', module_id: 'sensory', en: 'T', vi: 'm', kind: 'note', date_label: '2026.09',
            status: 'draft', hero_image_url: null, theme_color: null, sort_order: 0, slug: 'b',
            further_reading: [], lead: '', template, body,
          } as unknown as PostDetail
        }
        onChange={(patch) => {
          onChange(patch)
          if ('body' in patch) setBody(patch.body)
        }}
        onHeroDrop={vi.fn()}
      />
    )
  }
  render(<Harness />)
  return onChange
}

const bodyOf = (onChange: ReturnType<typeof vi.fn>) => {
  const b = onChange.mock.calls.at(-1)?.[0].body
  const arr = (Array.isArray(b) ? b : ((b as { elements?: unknown[] }).elements ?? [])) as { type?: string }[]
  return arr.filter((x) => x.type !== 'notes')
}

const three = [head('Tiêu đề', 'b1'), para('Một đoạn.', 'b2'), list('b3', 'mục một', 'mục hai')]

describe('một ô nhập cho cả dải', () => {
  it('con trỏ ở ngoài thì vẽ đúng thứ trang vẽ', () => {
    draw('report', three)
    expect(screen.getByText('Tiêu đề')).toBeInTheDocument()
    expect(screen.getByText('Một đoạn.')).toBeInTheDocument()
    expect(screen.getByText('mục hai')).toBeInTheDocument()
  })

  it('bấm vào là cả dải mở ra thành **một** ô chứa toàn bộ markdown', async () => {
    draw('report', three)
    await userEvent.click(screen.getByText('Một đoạn.'))

    const fields = screen.getAllByRole('textbox').filter((el) => el.tagName === 'TEXTAREA')
    const run = fields.find((el) => (el as HTMLTextAreaElement).value.includes('mục một')) as HTMLTextAreaElement
    expect(run).toBeTruthy()
    // Cả tiêu đề, đoạn văn và hai mục nằm trong **cùng** một ô. Đó chính là
    // điều kiện để bôi đen chạy suốt qua chúng.
    expect(run.value).toBe('## Tiêu đề\n\nMột đoạn.\n\n- mục một\n- mục hai')
  })

  it('bấm vào khối nào thì con trỏ rơi vào dòng của khối ấy', async () => {
    draw('report', three)
    await userEvent.click(screen.getByText('mục một'))

    const run = screen.getAllByRole('textbox').find((el) => (el as HTMLTextAreaElement).value?.includes('mục một')) as HTMLTextAreaElement
    // Không rơi về đầu bài: dòng của danh sách nằm sau tiêu đề và đoạn văn.
    expect(run.selectionStart).toBeGreaterThan(run.value.indexOf('Một đoạn.'))
  })

  it('sửa xong thì dựng lại thành khối, giữ nguyên id', async () => {
    const onChange = draw('report', three)
    await userEvent.click(screen.getByText('Một đoạn.'))
    const run = screen.getAllByRole('textbox').find((el) => (el as HTMLTextAreaElement).value?.includes('mục một')) as HTMLTextAreaElement
    await userEvent.clear(run)
    await userEvent.type(run, '# Mới{Enter}{Enter}Chữ khác')
    await userEvent.tab()

    expect(bodyOf(onChange).map((b) => b.type)).toEqual(['heading', 'paragraph'])
    expect(bodyOf(onChange).map((b) => (b as { id?: string }).id)).toEqual(['b1', 'b2'])
  })

  it('gõ thêm gạch đầu dòng là ra thêm mục, không cần nút nào', async () => {
    const onChange = draw('report', [list('b1', 'một')])
    await userEvent.click(screen.getByText('một'))
    const run = screen.getAllByRole('textbox').find((el) => (el as HTMLTextAreaElement).value === '- một') as HTMLTextAreaElement
    await userEvent.type(run, '{End}\n- hai')
    await userEvent.tab()

    const items = (bodyOf(onChange)[0] as unknown as { items: unknown[] }).items
    expect(items).toHaveLength(2)
  })
})

describe('bảng cắm vào giữa dải, không phá dải', () => {
  const withTable = [para('trên', 'b1'), table('t1'), para('dưới', 'b2')]

  it('bảng vẫn là widget riêng, chữ hai bên là hai dải', () => {
    draw('report', withTable)
    expect(screen.getByText('trên')).toBeInTheDocument()
    expect(screen.getByText('dưới')).toBeInTheDocument()
    // Bảng giữ ô soạn của nó — kéo cột, thêm hàng vẫn ở đó.
    expect(screen.getByDisplayValue('Ngày')).toBeInTheDocument()
  })

  it('sửa dải chữ không đụng tới bề rộng cột của bảng', async () => {
    const onChange = draw('report', withTable)
    await userEvent.click(screen.getByText('trên'))
    const run = screen.getAllByRole('textbox').find((el) => (el as HTMLTextAreaElement).value === 'trên') as HTMLTextAreaElement
    await userEvent.type(run, ' thêm')
    await userEvent.tab()

    const t = bodyOf(onChange).find((b) => b.type === 'table') as unknown as { table: { widths: number[] } }
    expect(t.table.widths).toEqual([100])
  })
})

describe('gõ `/` trong dải chữ', () => {
  it('mở menu khi `/` đứng đầu một dòng', async () => {
    draw('report', [para('', 'b1')])
    await userEvent.click(screen.getByRole('textbox', { name: /Viết ở đây/i }))
    await userEvent.keyboard('/')

    expect(screen.getByRole('button', { name: 'Bảng' })).toBeInTheDocument()
  })

  it('loại chữ thì chèn ký hiệu tại chỗ và ở lại trong ô để gõ tiếp', async () => {
    const onChange = draw('report', [para('', 'b1')])
    await userEvent.click(screen.getByRole('textbox', { name: /Viết ở đây/i }))
    await userEvent.keyboard('/')
    await userEvent.click(screen.getByRole('button', { name: 'Danh sách đánh số' }))

    /*
     * Chưa ghi gì cả: `1. ` chưa có chữ nào phía sau thì đọc lại là một đoạn
     * văn rỗng, tức ký hiệu vừa chèn biến mất trước khi kịp gõ. Nên ô vẫn mở,
     * con trỏ ngay sau ký hiệu.
     */
    const run = screen.getAllByRole('textbox').find((el) => (el as HTMLTextAreaElement).value === '1. ') as HTMLTextAreaElement
    expect(run).toBeTruthy()
    expect(run.selectionStart).toBe(3)

    await userEvent.type(run, 'mục đầu')
    await userEvent.tab()

    // Ra một danh sách đánh số, không ra hai khối.
    expect(bodyOf(onChange).map((b) => b.type)).toEqual(['list'])
    expect((bodyOf(onChange)[0] as unknown as { ordered?: boolean }).ordered).toBe(true)
  })

  it('loại widget thì cắt dải rồi cắm vào giữa', async () => {
    const onChange = draw('report', [para('trên', 'b1')])
    await userEvent.click(screen.getByText('trên'))
    const run = screen.getAllByRole('textbox').find((el) => (el as HTMLTextAreaElement).value === 'trên') as HTMLTextAreaElement
    await userEvent.type(run, '{End}\n/')
    await userEvent.click(screen.getByRole('button', { name: 'Bảng' }))

    expect(bodyOf(onChange).map((b) => b.type)).toEqual(['paragraph', 'table'])
  })

  it('`/` giữa câu thì chỉ là một dấu gạch chéo', async () => {
    draw('report', [para('đường dẫn', 'b1')])
    await userEvent.click(screen.getByText('đường dẫn'))
    const run = screen.getAllByRole('textbox').find((el) => (el as HTMLTextAreaElement).value === 'đường dẫn') as HTMLTextAreaElement
    await userEvent.type(run, '{End}/x')

    expect(screen.queryByRole('button', { name: 'Bảng' })).toBeNull()
  })
})

describe('cả ba màn cùng một lối soạn', () => {
  it('memo cũng gom khối chữ vào một ô', async () => {
    draw('memo', { subtitle: 'phụ', elements: [head('Tiêu đề', 'b1'), para('Đoạn', 'b2')] })
    await userEvent.click(screen.getByText('Đoạn'))
    const run = screen.getAllByRole('textbox').find((el) => (el as HTMLTextAreaElement).value?.includes('Đoạn')) as HTMLTextAreaElement
    expect(run.value).toBe('## Tiêu đề\n\nĐoạn')
  })

  it('bitesize cũng vậy', async () => {
    draw('bitesize', { len: 'ngắn', elements: [para('Một', 'b1'), list('b2', 'mục')] })
    await userEvent.click(screen.getByText('Một'))
    const run = screen.getAllByRole('textbox').find((el) => (el as HTMLTextAreaElement).value?.includes('mục')) as HTMLTextAreaElement
    expect(run.value).toBe('Một\n\n- mục')
  })
})
