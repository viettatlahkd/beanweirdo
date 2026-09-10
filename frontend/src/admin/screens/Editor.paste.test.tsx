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

/**
 * Đưa con trỏ vào một ô soạn.
 *
 * Ô có hai mặt: con trỏ ở ngoài thì nó vẽ markdown, bấm vào mới hiện chữ thô.
 * Nên tới được chỗ gõ là hai bước, và mọi lần dán dưới đây đều bắt đầu bằng
 * bước này.
 */
async function enter(label: string | RegExp) {
  await userEvent.click(screen.getByRole('textbox', { name: label }))
}

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
    await enter('một dòng')
    await userEvent.paste(SIX.map((l) => `- ${l}`).join('\n'))

    expect(lines(written(onChange))).toEqual(SIX)
  })

  it('dán vào dòng trống thì thay chỗ nó, không để lại một mục rỗng ở trên', async () => {
    const onChange = draw([{ runs: [{ t: '' }] }])
    await enter('một dòng')
    await userEvent.paste('- một\n- hai')

    expect(lines(written(onChange))).toEqual(['một', 'hai'])
  })

  it('dán vào dòng đã có chữ thì chữ ấy ở lại, cái dán vào nằm dưới', async () => {
    const onChange = draw([{ runs: [{ t: 'sẵn có' }] }])
    await enter(/đoạn văn|viết|một dòng/i)
    await userEvent.paste('- một\n- hai')

    expect(lines(written(onChange))).toEqual(['sẵn có', 'một', 'hai'])
  })

  it('dán danh sách đánh số vào khối trống thì khối chuyển sang đánh số', async () => {
    const onChange = draw([{ runs: [{ t: '' }] }])
    await enter('một dòng')
    await userEvent.paste('1. một\n2. hai')

    expect(written(onChange).ordered).toBe(true)
  })

  it('khối đã có chữ thì không bị đổi kiểu đánh số — đó là chọn lựa của người viết', async () => {
    const onChange = draw([{ runs: [{ t: 'sẵn có' }] }])
    await enter(/đoạn văn|viết|một dòng/i)
    await userEvent.paste('1. một\n2. hai')

    expect(written(onChange).ordered).toBeUndefined()
  })

  it('thụt lề trong cái dán vào thành mục con', async () => {
    const onChange = draw([{ runs: [{ t: '' }] }])
    await enter('một dòng')
    await userEvent.paste('- cha\n  - con')

    const list = written(onChange)
    expect(lines(list)).toEqual(['cha'])
    expect(runsToText(list.items[0].children?.[0].runs)).toBe('con')
  })

  it('link trong cái dán vào giữ được, và vẽ ra thành link', async () => {
    const onChange = draw([{ runs: [{ t: '' }] }])
    await enter('một dòng')
    await userEvent.paste('- xem [đây](https://a.com)\n- và https://b.com')

    const list = written(onChange)
    expect(list.items[0].runs).toContainEqual({ t: 'đây', href: 'https://a.com' })
    expect(list.items[1].runs).toContainEqual({ t: 'https://b.com', href: 'https://b.com' })
  })

  it('dán một cụm chữ vào giữa câu vẫn là dán như thường', async () => {
    // Chặn cả những lần dán bình thường là làm hỏng thao tác hay dùng nhất
    // trong một ô nhập, để đổi lấy một trường hợp hiếm hơn nhiều.
    const onChange = draw([{ runs: [{ t: 'sẵn có' }] }])
    await userEvent.click(screen.getByText('sẵn có'))
    await userEvent.paste(' thêm chữ')
    await userEvent.tab()

    expect(lines(written(onChange))).toEqual(['sẵn có thêm chữ'])
  })
})

describe('dán cả một trang vào canvas', () => {
  function drawBlocks(body: ReportBlock[]) {
    const onChange = vi.fn()
    render(<EditorCanvas template="report" post={reportPost(body)} onChange={onChange} onHeroDrop={vi.fn()} />)
    return onChange
  }

  /** Chuỗi khối vừa được ghi ra, bỏ phần ghi chú cạnh bài. */
  function writtenBlocks(onChange: ReturnType<typeof vi.fn>) {
    const body = onChange.mock.calls.at(-1)?.[0].body as { type?: string }[]
    return body.filter((b) => b.type !== 'notes')
  }

  const PAGE = ['# Mẻ rang #14', '', 'Đợt này hạ nhiệt sớm.', '', '- nhiệt vào 198°C', '- ra 11:20'].join('\n')

  it('một trang markdown thành ba khối, không phải một đoạn', async () => {
    const onChange = drawBlocks([{ type: 'paragraph', id: 'b1', text: '' } as unknown as ReportBlock])
    await enter(/đoạn văn|viết/i)
    await userEvent.paste(PAGE)

    expect(writtenBlocks(onChange).map((b) => b.type)).toEqual(['heading', 'paragraph', 'list'])
  })

  it('khối rỗng bị thay chỗ, không để lại một đoạn trống ở trên', async () => {
    const onChange = drawBlocks([{ type: 'paragraph', id: 'b1', text: '' } as unknown as ReportBlock])
    await enter(/đoạn văn|viết/i)
    await userEvent.paste('# một\n\n# hai')

    expect(writtenBlocks(onChange)).toHaveLength(2)
  })

  it('khối đã có chữ thì chữ ở lại, cái dán vào nằm dưới', async () => {
    const onChange = drawBlocks([{ type: 'paragraph', id: 'b1', text: 'sẵn có' } as unknown as ReportBlock])
    await enter(/đoạn văn|viết|một dòng/i)
    await userEvent.paste('# một\n\n# hai')

    const blocks = writtenBlocks(onChange)
    expect(blocks.map((b) => b.type)).toEqual(['paragraph', 'heading', 'heading'])
    expect((blocks[0] as { text?: string }).text).toBe('sẵn có')
  })

  it('mỗi khối dán vào được một id riêng — ghi chú cạnh bài neo vào id', async () => {
    const onChange = drawBlocks([{ type: 'paragraph', id: 'b1', text: 'sẵn có' } as unknown as ReportBlock])
    await enter(/đoạn văn|viết|một dòng/i)
    await userEvent.paste('# một\n\n# hai\n\n# ba')

    const ids = writtenBlocks(onChange).map((b) => (b as { id?: string }).id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every(Boolean)).toBe(true)
  })

  it('dán một câu vào giữa đoạn đang viết vẫn là dán như thường', async () => {
    const onChange = drawBlocks([{ type: 'paragraph', id: 'b1', text: 'sẵn có' } as unknown as ReportBlock])
    await enter(/đoạn văn|viết|một dòng/i)
    await userEvent.paste(' thêm chữ')
    await userEvent.tab()

    const blocks = writtenBlocks(onChange)
    expect(blocks).toHaveLength(1)
    expect((blocks[0] as { text?: string }).text).toBe('sẵn có thêm chữ')
  })
})

/**
 * Cùng một bộ máy thì phải cùng một hành vi.
 *
 * `ReportBlockFields` được ba màn dùng chung — report, memo, bitesize — và
 * lượt trước chỉ report được nối chỗ dán. Dán một trang markdown vào bitesize
 * ra nguyên dấu thăng với dấu sao trên màn. Prop `onPasteBlocks` nay là bắt
 * buộc, nên chỗ này giữ cho cả ba thật sự chạy chứ không chỉ biên dịch được.
 */
describe('dán vào bitesize và memo, không riêng report', () => {
  const PAGE = ['### Overall feedback', '', '* Chưa chốt test cases.', '* Chưa có exit criteria.'].join('\n')

  function drawTemplate(template: 'bitesize' | 'memo', body: unknown) {
    const onChange = vi.fn()
    render(
      <EditorCanvas
        template={template}
        post={{ ...reportPost(body), template } as PostDetail}
        onChange={onChange}
        onHeroDrop={vi.fn()}
      />,
    )
    return onChange
  }

  function pastedElements(onChange: ReturnType<typeof vi.fn>) {
    const body = onChange.mock.calls.at(-1)?.[0].body as { elements?: { type?: string }[] }
    return body.elements ?? []
  }

  it('bitesize — một trang markdown thành nhiều khối, không phải một đoạn thô', async () => {
    const onChange = drawTemplate('bitesize', {
      len: 'ngắn',
      elements: [{ type: 'paragraph', id: 'b1', text: '' }],
    })
    await enter(/đoạn văn|viết/i)
    await userEvent.paste(PAGE)

    expect(pastedElements(onChange).map((b) => b.type)).toEqual(['heading', 'list'])
  })

  it('memo — cũng vậy', async () => {
    const onChange = drawTemplate('memo', {
      subtitle: 'phụ đề',
      elements: [{ type: 'paragraph', id: 'b1', text: '' }],
    })
    await enter(/đoạn văn|viết/i)
    await userEvent.paste(PAGE)

    expect(pastedElements(onChange).map((b) => b.type)).toEqual(['heading', 'list'])
  })
})
