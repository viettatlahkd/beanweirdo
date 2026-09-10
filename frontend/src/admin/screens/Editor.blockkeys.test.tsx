/**
 * Enter và Backspace giữa các khối, trên màn soạn thật.
 *
 * Phần biến đổi có test riêng ở `blockKeys.test.ts`; chỗ này kiểm cái nối —
 * và kiểm cả ba màn, vì `ReportBlockFields` được ba nơi dùng chung và lượt
 * trước đã một lần chỉ nối cho một nơi.
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import type { ReportBlock } from 'post-renderer'
import { describe, expect, it, vi } from 'vitest'
import type { PostDetail } from '../lib/apiClient'
import { EditorCanvas } from './Editor'

const para = (text: string, id: string) => ({ type: 'paragraph', id, text }) as unknown as ReportBlock
const head = (text: string, id: string) => ({ type: 'heading', id, level: 2, text }) as unknown as ReportBlock

/** Màn soạn nuôi lại chính nó, để gõ được hai phím liên tiếp. */
function draw(template: 'report' | 'bitesize' | 'memo', start: unknown) {
  const onChange = vi.fn()
  function Harness() {
    const [body, setBody] = useState<unknown>(start)
    return (
      <EditorCanvas
        template={template}
        post={
          {
            id: 'p1',
            module_id: 'sensory',
            en: 'T',
            vi: 'mô tả',
            kind: 'note',
            date_label: '2026.09',
            status: 'draft',
            hero_image_url: null,
            theme_color: null,
            sort_order: 0,
            slug: 'bai',
            further_reading: [],
            template,
            body,
            lead: '',
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

const shape = (onChange: ReturnType<typeof vi.fn>) => {
  const body = onChange.mock.calls.at(-1)?.[0].body
  const list = (Array.isArray(body) ? body : (body as { elements?: unknown[] }).elements) as {
    type?: string
    text?: string
  }[]
  return list.filter((b) => b.type !== 'notes').map((b) => `${b.type}:${b.text ?? ''}`)
}

async function into(text: string) {
  await userEvent.click(screen.getByText(text))
  return screen.getByDisplayValue(text)
}

describe('report', () => {
  it('Enter ở cuối đoạn mở một đoạn mới — không phải đi tìm nút', async () => {
    const onChange = draw('report', [para('xong', 'b1')])
    await userEvent.type(await into('xong'), '{Enter}')
    expect(shape(onChange)).toEqual(['paragraph:xong', 'paragraph:'])
  })

  it('Enter ở giữa chữ thì tách khối', async () => {
    const onChange = draw('report', [para('mộthai', 'b1')])
    const field = await into('mộthai')
    await userEvent.type(field, '{Enter}', { initialSelectionStart: 3, initialSelectionEnd: 3 })
    expect(shape(onChange)).toEqual(['paragraph:một', 'paragraph:hai'])
  })

  it('Enter ở cuối tiêu đề mở đoạn văn, không mở thêm tiêu đề', async () => {
    const onChange = draw('report', [head('Mẻ rang', 'h1')])
    await userEvent.type(await into('Mẻ rang'), '{Enter}')
    expect(shape(onChange)).toEqual(['heading:Mẻ rang', 'paragraph:'])
  })

  it('Backspace ở đầu đoạn nhập nó lên khối trên', async () => {
    const onChange = draw('report', [para('trên', 'b1'), para('dưới', 'b2')])
    const field = await into('dưới')
    await userEvent.type(field, '{Backspace}', { initialSelectionStart: 0, initialSelectionEnd: 0 })
    expect(shape(onChange)).toEqual(['paragraph:trêndưới'])
  })

  it('tiêu đề hạ cấp trước khi bị xoá — hai lần bấm, không phải một', async () => {
    const onChange = draw('report', [para('trên', 'b1'), head('Tiêu đề', 'h9')])
    const field = await into('Tiêu đề')
    await userEvent.type(field, '{Backspace}', { initialSelectionStart: 0, initialSelectionEnd: 0 })
    expect(shape(onChange)).toEqual(['paragraph:trên', 'paragraph:Tiêu đề'])

    await userEvent.type(screen.getByDisplayValue('Tiêu đề'), '{Backspace}', {
      initialSelectionStart: 0,
      initialSelectionEnd: 0,
    })
    expect(shape(onChange)).toEqual(['paragraph:trênTiêu đề'])
  })

  it('giữa chữ thì Backspace vẫn chỉ xoá một ký tự', async () => {
    const onChange = draw('report', [para('trên', 'b1'), para('dưới', 'b2')])
    await userEvent.type(await into('dưới'), '{Backspace}')
    await userEvent.tab()
    expect(shape(onChange)).toEqual(['paragraph:trên', 'paragraph:dướ'])
  })
})

describe('cả ba màn, không riêng report', () => {
  it('bitesize cũng mở khối bằng Enter', async () => {
    const onChange = draw('bitesize', { len: 'ngắn', elements: [para('xong', 'b1')] })
    await userEvent.type(await into('xong'), '{Enter}')
    expect(shape(onChange)).toEqual(['paragraph:xong', 'paragraph:'])
  })

  it('memo cũng vậy', async () => {
    const onChange = draw('memo', { subtitle: 'phụ', elements: [para('xong', 'b1')] })
    await userEvent.type(await into('xong'), '{Enter}')
    expect(shape(onChange)).toEqual(['paragraph:xong', 'paragraph:'])
  })
})

describe('gõ ký hiệu để đổi loại khối', () => {
  it('`# ` biến đoạn văn thành tiêu đề', async () => {
    const onChange = draw('report', [para('', 'b1')])
    await userEvent.click(screen.getByRole('textbox', { name: 'Đoạn văn' }))
    await userEvent.keyboard('# ')
    expect(shape(onChange)).toEqual(['heading:'])
  })

  it('`- ` biến thành danh sách, và con trỏ vào ngay mục đầu', async () => {
    const onChange = draw('report', [para('', 'b1')])
    await userEvent.click(screen.getByRole('textbox', { name: 'Đoạn văn' }))
    await userEvent.keyboard('- ')
    expect(shape(onChange)).toEqual(['list:'])
    // Không nhận lấy con trỏ thì vừa mở danh sách xong lại phải bấm chuột.
    expect(screen.getByPlaceholderText('một dòng')).toBeTruthy()
  })

  it('`#` giữa câu thì vẫn là một dấu thăng', async () => {
    const onChange = draw('report', [para('mẻ', 'b1')])
    const field = await into('mẻ')
    await userEvent.type(field, ' #14')
    await userEvent.tab()
    expect(shape(onChange)).toEqual(['paragraph:mẻ #14'])
  })
})

describe('gõ `/` mở menu chèn', () => {
  it('mở menu ngay tại khối đang gõ', async () => {
    draw('report', [para('', 'b1')])
    await userEvent.click(screen.getByRole('textbox', { name: 'Đoạn văn' }))
    await userEvent.keyboard('/')
    expect(screen.getByRole('button', { name: 'Bảng' })).toBeTruthy()
  })

  it('gõ tiếp thì lọc, đọc từ kho chứ không từ danh sách viết tay', async () => {
    draw('report', [para('', 'b1')])
    await userEvent.click(screen.getByRole('textbox', { name: 'Đoạn văn' }))
    await userEvent.keyboard('/bảng')
    expect(screen.getByRole('button', { name: 'Bảng' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Trích dẫn' })).toBeNull()
  })

  it('lọc được cả bằng từ khoá, không chỉ bằng tên hiện ra', async () => {
    draw('report', [para('', 'b1')])
    await userEvent.click(screen.getByRole('textbox', { name: 'Đoạn văn' }))
    await userEvent.keyboard('/gạch đầu dòng')
    expect(screen.getByRole('button', { name: 'Danh sách' })).toBeTruthy()
  })

  it('chọn một loại thì **thay** khối đang gõ, không để lại đoạn rỗng', async () => {
    const onChange = draw('report', [para('', 'b1')])
    await userEvent.click(screen.getByRole('textbox', { name: 'Đoạn văn' }))
    await userEvent.keyboard('/')
    await userEvent.click(screen.getByRole('button', { name: 'Trích dẫn' }))
    expect(shape(onChange)).toEqual(['quote:'])
  })

  it('không có khối nào khớp thì nói ra, không bày một menu trống', async () => {
    draw('report', [para('', 'b1')])
    await userEvent.click(screen.getByRole('textbox', { name: 'Đoạn văn' }))
    await userEvent.keyboard('/zzz')
    expect(screen.getByText(/Không có khối nào/)).toBeTruthy()
  })
})
