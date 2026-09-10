/**
 * Dán một danh sách vào màn soạn.
 *
 * Chủ site chép sáu gạch đầu dòng từ một trang khác, dán vào một khối danh
 * sách, và nhận về **một** dòng chạy tràn khỏi khối. Không phải khối vẽ sai:
 * ô nhập là `input` một dòng, trình duyệt bỏ hết ký tự xuống dòng trước khi
 * bất cứ đoạn mã nào của mình nhìn thấy, và không có chỗ nào đọc clipboard —
 * `grep onPaste` trên cả repo trước lượt này trả về rỗng.
 *
 * Nên phần được kiểm ở đây là chỗ nối: cái clipboard mang tới có thành đúng
 * số mục không, và một lần dán bình thường có còn dán được không.
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ListAttrs, ListItem, ReportBlock } from 'post-renderer'
import { runsToText } from 'post-renderer'
import { describe, expect, it, vi } from 'vitest'
import type { PostDetail } from '../lib/apiClient'
import { EditorCanvas } from './Editor'

function reportPost(body: unknown): PostDetail {
  return {
    id: 'p1',
    module_id: 'sensory',
    en: 'Tiêu đề',
    vi: 'mô tả',
    kind: 'note',
    date_label: '2026.09',
    status: 'draft',
    template: 'report',
    hero_image_url: null,
    theme_color: null,
    sort_order: 0,
    slug: 'bai',
    body,
    lead: 'dẫn',
    further_reading: [],
  } as unknown as PostDetail
}

const listOf = (items: ListItem[]): ReportBlock[] =>
  [{ type: 'list', id: 'b1', items } as unknown as ReportBlock]

function draw(items: ListItem[]) {
  const onChange = vi.fn()
  render(
    <EditorCanvas template="report" post={reportPost(listOf(items))} onChange={onChange} onHeroDrop={vi.fn()} />,
  )
  return onChange
}

/** Cái danh sách vừa được ghi ra, đọc lại thành chữ cho dễ so. */
function written(onChange: ReturnType<typeof vi.fn>): ListAttrs {
  const body = onChange.mock.calls.at(-1)?.[0].body as unknown[]
  return body.find((b) => (b as { type?: string }).type === 'list') as ListAttrs
}

const lines = (list: ListAttrs) => list.items.map((i) => runsToText(i.runs))

const SIX = [
  'Chưa chốt test cases.',
  'Chưa có giới hạn cho việc bổ sung test cases.',
  'Chưa có deadline phản hồi.',
  'Chưa có cách xử lý khi khách hàng không phản hồi.',
  'Chưa có distinction giữa bug và change request.',
  'Chưa có exit criteria.',
]

describe('dán danh sách vào khối danh sách', () => {
  it('sáu gạch đầu dòng thành sáu dòng, không phải một', async () => {
    const onChange = draw([{ runs: [{ t: '' }] }])
    await userEvent.click(screen.getByPlaceholderText('một dòng'))
    await userEvent.paste(SIX.map((l) => `- ${l}`).join('\n'))

    expect(lines(written(onChange))).toEqual(SIX)
  })

  it('dán vào dòng trống thì thay chỗ nó, không để lại một mục rỗng ở trên', async () => {
    const onChange = draw([{ runs: [{ t: '' }] }])
    await userEvent.click(screen.getByPlaceholderText('một dòng'))
    await userEvent.paste('- một\n- hai')

    expect(lines(written(onChange))).toEqual(['một', 'hai'])
  })

  it('dán vào dòng đã có chữ thì chữ ấy ở lại, cái dán vào nằm dưới', async () => {
    const onChange = draw([{ runs: [{ t: 'sẵn có' }] }])
    await userEvent.click(screen.getByDisplayValue('sẵn có'))
    await userEvent.paste('- một\n- hai')

    expect(lines(written(onChange))).toEqual(['sẵn có', 'một', 'hai'])
  })

  it('dán danh sách đánh số vào khối trống thì khối chuyển sang đánh số', async () => {
    const onChange = draw([{ runs: [{ t: '' }] }])
    await userEvent.click(screen.getByPlaceholderText('một dòng'))
    await userEvent.paste('1. một\n2. hai')

    expect(written(onChange).ordered).toBe(true)
  })

  it('khối đã có chữ thì không bị đổi kiểu đánh số — đó là chọn lựa của người viết', async () => {
    const onChange = draw([{ runs: [{ t: 'sẵn có' }] }])
    await userEvent.click(screen.getByDisplayValue('sẵn có'))
    await userEvent.paste('1. một\n2. hai')

    expect(written(onChange).ordered).toBeUndefined()
  })

  it('thụt lề trong cái dán vào thành mục con', async () => {
    const onChange = draw([{ runs: [{ t: '' }] }])
    await userEvent.click(screen.getByPlaceholderText('một dòng'))
    await userEvent.paste('- cha\n  - con')

    const list = written(onChange)
    expect(lines(list)).toEqual(['cha'])
    expect(runsToText(list.items[0].children?.[0].runs)).toBe('con')
  })

  it('link trong cái dán vào giữ được, và vẽ ra thành link', async () => {
    const onChange = draw([{ runs: [{ t: '' }] }])
    await userEvent.click(screen.getByPlaceholderText('một dòng'))
    await userEvent.paste('- xem [đây](https://a.com)\n- và https://b.com')

    const list = written(onChange)
    expect(list.items[0].runs).toContainEqual({ t: 'đây', href: 'https://a.com' })
    expect(list.items[1].runs).toContainEqual({ t: 'https://b.com', href: 'https://b.com' })
  })

  it('dán một cụm chữ vào giữa câu vẫn là dán như thường', async () => {
    // Chặn cả những lần dán bình thường là làm hỏng thao tác hay dùng nhất
    // trong một ô nhập, để đổi lấy một trường hợp hiếm hơn nhiều.
    const onChange = draw([{ runs: [{ t: 'sẵn có' }] }])
    const field = screen.getByDisplayValue('sẵn có')
    await userEvent.click(field)
    await userEvent.paste(' thêm chữ')
    await userEvent.tab()

    expect(lines(written(onChange))).toEqual(['sẵn có thêm chữ'])
  })
})
