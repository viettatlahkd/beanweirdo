/**
 * Bàn phím trong danh sách, kiểm trên màn soạn thật.
 *
 * Chủ site: *"tôi thêm bullet con thì tôi thêm được mà tôi không xoá bằng
 * keyboard là sao?"*. Phần biến đổi cây đã có test riêng ở `listKeys.test.ts`;
 * chỗ này kiểm cái nối — phím có tới được hàm không, chữ đang gõ dở có được
 * giữ không, và con trỏ có rơi đúng chỗ không.
 */
import { render, screen } from '@testing-library/react'
import { useState } from 'react'
import userEvent from '@testing-library/user-event'
import { runsToText, textToRuns, type ListItem, type ReportBlock } from 'post-renderer'
import { describe, expect, it, vi } from 'vitest'
import type { PostDetail } from '../lib/apiClient'
import { EditorCanvas } from './Editor'

const item = (t: string, children?: ListItem[]): ListItem => ({
  runs: textToRuns(t),
  ...(children ? { children } : null),
})

/**
 * Màn soạn có nuôi lại chính nó.
 *
 * `EditorCanvas` nhận `post` từ ngoài, nên một `vi.fn()` trơ sẽ giữ nguyên
 * bài sau mỗi phím — và mọi bài kiểm gõ hai phím liên tiếp sẽ đo phím thứ hai
 * trên trạng thái trước phím thứ nhất. Bọc lại cho nó giống thật.
 */
function draw(items: ListItem[]) {
  const onChange = vi.fn()
  const start = [{ type: 'list', id: 'b1', items } as unknown as ReportBlock]

  function Harness() {
    const [body, setBody] = useState<unknown>(start)
    return (
      <EditorCanvas
        template="report"
        post={{ id: 'p1', module_id: 'sensory', en: 'T', template: 'report', body, lead: '' } as unknown as PostDetail}
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

/** Chuỗi khối vừa ghi ra, bỏ phần ghi chú cạnh bài. */
const blocksOf = (onChange: ReturnType<typeof vi.fn>) =>
  (onChange.mock.calls.at(-1)?.[0].body as { type?: string }[]).filter((b) => b.type !== 'notes')

const listOf = (onChange: ReturnType<typeof vi.fn>) =>
  blocksOf(onChange).find((b) => b.type === 'list') as unknown as { items: ListItem[] } | undefined

const lines = (items: ListItem[] | undefined, depth = 0): string[] =>
  (items ?? []).flatMap((it) => [`${'  '.repeat(depth)}${runsToText(it.runs)}`, ...lines(it.children, depth + 1)])

/** Bấm vào mặt vẽ của một dòng để lật sang mặt gõ. */
async function into(text: string) {
  await userEvent.click(screen.getByText(text))
  return screen.getByDisplayValue(text)
}

describe('Enter', () => {
  it('mở một mục mới ngay dưới', async () => {
    const onChange = draw([item('một'), item('hai')])
    const field = await into('một')
    await userEvent.type(field, '{Enter}')

    expect(lines(listOf(onChange)?.items)).toEqual(['một', '', 'hai'])
  })

  it('tách mục ở đúng chỗ con trỏ đang đứng', async () => {
    const onChange = draw([item('mộthai')])
    const field = await into('mộthai')
    field.setSelectionRange(3, 3)
    await userEvent.type(field, '{Enter}', { initialSelectionStart: 3, initialSelectionEnd: 3 })

    expect(lines(listOf(onChange)?.items)).toEqual(['một', 'hai'])
  })

  it('mục rỗng ngoài cùng thì rời hẳn danh sách, và mở một đoạn văn', async () => {
    // Không có đường này thì danh sách là cái hố: vào được bằng bàn phím,
    // ra thì phải với tay lấy chuột.
    const onChange = draw([item('một'), item('')])
    // Cả hai dòng cùng mang nhãn 'một dòng'; ô rỗng là ô thứ hai.
    await userEvent.click(screen.getAllByRole('textbox', { name: 'một dòng' })[1])
    await userEvent.keyboard('{Enter}')

    expect(blocksOf(onChange).map((b) => b.type)).toEqual(['list', 'paragraph'])
    expect(lines(listOf(onChange)?.items)).toEqual(['một'])
  })
})

describe('Backspace — cái được báo là thiếu', () => {
  it('xoá được một mục bằng bàn phím, không phải đi tìm nút', async () => {
    const onChange = draw([item('một'), item('hai')])
    const field = await into('hai')
    await userEvent.type(field, '{Backspace}', { initialSelectionStart: 0, initialSelectionEnd: 0 })

    expect(lines(listOf(onChange)?.items)).toEqual(['mộthai'])
  })

  it('xoá được một mục con bằng bàn phím — đúng thao tác chủ site kể', async () => {
    const onChange = draw([item('cha', [item('con')])])
    const field = await into('con')
    // Mục lồng thì lùi ra một tầng trước; bấm nữa mới nhập lên.
    await userEvent.type(field, '{Backspace}', { initialSelectionStart: 0, initialSelectionEnd: 0 })
    expect(lines(listOf(onChange)?.items)).toEqual(['cha', 'con'])

    await userEvent.type(screen.getByDisplayValue('con'), '{Backspace}', {
      initialSelectionStart: 0,
      initialSelectionEnd: 0,
    })
    expect(lines(listOf(onChange)?.items)).toEqual(['chacon'])
  })

  it('giữa chữ thì vẫn là xoá một ký tự, không phải xoá mục', async () => {
    const onChange = draw([item('một'), item('hai')])
    const field = await into('hai')
    await userEvent.type(field, '{Backspace}')
    await userEvent.tab()

    expect(lines(listOf(onChange)?.items)).toEqual(['một', 'ha'])
  })
})

describe('Tab và Shift+Tab', () => {
  it('Tab thụt mục vào thành mục con', async () => {
    const onChange = draw([item('một'), item('hai')])
    const field = await into('hai')
    await userEvent.type(field, '{Tab}', { initialSelectionStart: 0, initialSelectionEnd: 0 })

    expect(lines(listOf(onChange)?.items)).toEqual(['một', '  hai'])
  })

  it('Shift+Tab lùi mục con ra', async () => {
    const onChange = draw([item('cha', [item('con')])])
    const field = await into('con')
    await userEvent.type(field, '{Shift>}{Tab}{/Shift}', { initialSelectionStart: 0, initialSelectionEnd: 0 })

    expect(lines(listOf(onChange)?.items)).toEqual(['cha', 'con'])
  })

  it('chữ đang gõ dở không bị nuốt khi thụt lề', async () => {
    // `Tab` dựng lại danh sách; nếu dựng từ bản đã lưu thì chữ vừa gõ mà chưa
    // rời ô sẽ biến mất.
    const onChange = draw([item('một'), item('hai')])
    const field = await into('hai')
    await userEvent.type(field, ' thêm')
    // Về đầu dòng rồi mới Tab — Tab giữa chữ là chuyển ô, không phải thụt lề.
    await userEvent.type(field, '{Tab}', { initialSelectionStart: 0, initialSelectionEnd: 0 })

    expect(lines(listOf(onChange)?.items)).toEqual(['một', '  hai thêm'])
  })
})

describe('Shift+Enter', () => {
  it('mở một dòng chìm dưới mục, không phải mục mới', async () => {
    const onChange = draw([item('một')])
    const field = await into('một')
    await userEvent.type(field, '{Shift>}{Enter}{/Shift}')

    expect(listOf(onChange)?.items[0].sub).toEqual([''])
    expect(lines(listOf(onChange)?.items)).toEqual(['một'])
  })
})
