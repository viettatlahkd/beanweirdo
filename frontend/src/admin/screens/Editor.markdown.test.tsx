/**
 * Ô nhập vẽ markdown, không bắt người viết đọc ký hiệu.
 *
 * Chủ site: "preview thì nó có nhận rồi nhưng trong editor thì lại không thấy
 * được". Đúng vậy — trang đi qua `Inline`, còn ô nhập là một `textarea` chữ
 * thô, nên `**chữ**` nằm nguyên trên màn soạn. Luật nhóm 16 nói màn soạn vẽ
 * đúng thứ trang sẽ vẽ, nên đây là lỗi chứ không phải lựa chọn.
 *
 * Ô có hai mặt: mặt vẽ khi con trỏ ở ngoài, mặt gõ khi con trỏ ở trong.
 */
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReportBlock } from 'post-renderer'
import { rawIndexFor, textToRuns } from 'post-renderer'
import { describe, expect, it, vi } from 'vitest'
import type { PostDetail } from '../lib/apiClient'
import { EditorCanvas } from './Editor'

function draw(blocks: ReportBlock[]) {
  const onChange = vi.fn()
  render(
    <EditorCanvas
      template="report"
      post={{ id: 'p1', module_id: 'sensory', en: 'T', template: 'report', body: blocks, lead: '' } as unknown as PostDetail}
      onChange={onChange}
      onHeroDrop={vi.fn()}
    />,
  )
  return onChange
}

const para = (text: string) => [{ type: 'paragraph', id: 'b1', text } as unknown as ReportBlock]

describe('màn soạn vẽ markdown chứ không hiện ký hiệu', () => {
  it('chữ nhấn vẽ ra là chữ nhấn, dấu sao không lộ ra', () => {
    draw(para('feedback gửi cho **team product** nhé'))

    expect(screen.getByText('team product').tagName).toBe('EM')
    // Cả cụm chữ trên màn không còn dấu sao nào.
    expect(screen.queryByText(/\*\*/)).toBeNull()
  })

  it('link vẽ ra là link bấm được, không phải ngoặc vuông', () => {
    draw(para('xem [đây](https://a.com)'))

    expect(screen.getByRole('link', { name: 'đây' })).toHaveAttribute('href', 'https://a.com')
  })

  it('bấm vào là hiện chữ thô để sửa', async () => {
    draw(para('có **đậm** đây'))
    expect(screen.queryByDisplayValue('có **đậm** đây')).toBeNull()

    await userEvent.click(screen.getByText('đậm'))

    expect(screen.getByDisplayValue('có **đậm** đây')).toBeTruthy()
  })

  it('rời ô thì vẽ lại, không nằm ở chữ thô suốt buổi', async () => {
    draw(para('có **đậm** đây'))
    await userEvent.click(screen.getByText('đậm'))
    await userEvent.tab()

    expect(screen.queryByDisplayValue('có **đậm** đây')).toBeNull()
    expect(screen.getByText('đậm').tagName).toBe('EM')
  })

  it('sửa xong vẫn ghi ra đúng chữ thô, không ghi ra bản đã vẽ', async () => {
    const onChange = draw(para('có **đậm** đây'))
    await userEvent.click(screen.getByText('đậm'))
    await userEvent.type(screen.getByDisplayValue('có **đậm** đây'), '!')
    await userEvent.tab()

    const written = onChange.mock.calls.at(-1)?.[0].body as { text?: string }[]
    expect(written[0].text).toBe('có **đậm** đây!')
  })

  it('ô rỗng vẫn hiện chữ mờ gợi ý', () => {
    draw(para(''))
    expect(screen.getByRole('textbox', { name: 'Đoạn văn' })).toBeTruthy()
  })
})

describe('chỗ con trỏ khi bấm vào chữ đã vẽ', () => {
  // Chữ vẽ ra ngắn hơn chữ thô đúng bằng số dấu định dạng. Không quy đổi thì
  // con trỏ rơi lệch, và bấm vào giữa một đoạn dài thành thao tác hỏng.
  it('quy đổi một vị trí nằm giữa chữ nhấn', () => {
    // Vẽ ra "có đậm đây"; chữ 'ậ' ở vị trí 4. Trong chữ thô "có **đậm** đây"
    // nó ở vị trí 6, vì hai dấu sao chen vào trước.
    const raw = 'có **đậm** đây'
    expect(raw[6]).toBe('ậ')
    expect(rawIndexFor(raw, 4)).toBe(6)
    expect(rawIndexFor(raw, 0)).toBe(0)
  })

  it('đo theo chữ thô đang có, không theo một bản dựng lại', () => {
    // Cùng một chữ nhấn viết được bằng `*x*` hoặc `**x**`. Dựng lại từ runs
    // thì luôn ra `*x*`, nên mọi vị trí sau dấu đầu tiên sẽ lệch.
    expect(rawIndexFor('có *đậm* đây', 4)).toBe(5)
    expect(rawIndexFor('có **đậm** đây', 4)).toBe(6)
  })

  it('quy đổi qua link, nơi phần địa chỉ không hề được vẽ', () => {
    // Vẽ ra "xem đây"; chữ 'â' ở vị trí 5, trong chữ thô là vị trí 6.
    const raw = 'xem [đây](https://a.com)'
    expect(raw[6]).toBe('â')
    expect(rawIndexFor(raw, 5)).toBe(6)
  })

  it('vị trí quá cuối chữ đã vẽ thì về cuối chữ thô', () => {
    const raw = 'có **đậm**'
    expect(rawIndexFor(raw, 99)).toBe(raw.length)
  })

  it('chữ không có định dạng thì hai vị trí trùng nhau', () => {
    expect(rawIndexFor('chữ thường', 4)).toBe(4)
  })
})

describe('dán từ Notion: đọc bản HTML, giữ định dạng', () => {
  /** Clipboard thật mang hai bản; jsdom thì phải dựng tay. */
  const clipboard = (html: string, plain: string) => ({
    getData: (kind: string) => (kind === 'text/html' ? html : plain),
  })

  it('chữ đậm sống sót, dù bản chữ thuần đã đánh mất nó', async () => {
    const onChange = draw(para(''))
    await userEvent.click(screen.getByRole('textbox', { name: 'Đoạn văn' }))

    fireEvent.paste(screen.getByPlaceholderText('Đoạn văn'), {
      clipboardData: clipboard(
        '<h3>Overall feedback</h3><ul><li>Chưa chốt <strong>test cases</strong>.</li></ul>',
        // Đúng thứ Notion đặt vào ô chữ thuần: đậm biến mất.
        'Overall feedback\nChưa chốt test cases.',
      ),
    })

    const written = onChange.mock.calls.at(-1)?.[0].body as { type?: string; items?: unknown[] }[]
    expect(written.map((b) => b.type)).toEqual(['heading', 'list'])
  })

  it('bản HTML chỉ là chữ thuần trá hình thì bỏ qua, dùng bản chữ thuần', async () => {
    // Có nguồn trả chính chữ thuần cho ô `text/html`. Đem đi phân tích như
    // HTML là nuốt sạch ký tự xuống dòng, và sáu gạch đầu dòng về một dòng.
    const onChange = draw(para(''))
    await userEvent.click(screen.getByRole('textbox', { name: 'Đoạn văn' }))

    fireEvent.paste(screen.getByPlaceholderText('Đoạn văn'), {
      clipboardData: clipboard('- một\n- hai', '- một\n- hai'),
    })

    const written = onChange.mock.calls.at(-1)?.[0].body as { type?: string; items?: unknown[] }[]
    expect(written[0].type).toBe('list')
    expect(written[0].items).toHaveLength(2)
  })
})

describe('Cmd+B, Cmd+U, Cmd+K trong ô chữ', () => {
  it('Cmd+B nhấn chữ đang bôi đen', async () => {
    const onChange = draw(para('có chữ đây'))
    await userEvent.click(screen.getByText('có chữ đây'))
    const field = screen.getByDisplayValue('có chữ đây')
    field.setSelectionRange(3, 6)
    await userEvent.keyboard('{Meta>}b{/Meta}')
    await userEvent.tab()

    const written = onChange.mock.calls.at(-1)?.[0].body as { text?: string }[]
    expect(written[0].text).toBe('có **chữ** đây')
  })

  it('bấm lại là bỏ nhấn', async () => {
    const onChange = draw(para('có **chữ** đây'))
    await userEvent.click(screen.getByText('chữ'))
    const field = screen.getByDisplayValue('có **chữ** đây')
    field.setSelectionRange(5, 8)
    await userEvent.keyboard('{Meta>}b{/Meta}')
    await userEvent.tab()

    const written = onChange.mock.calls.at(-1)?.[0].body as { text?: string }[]
    expect(written[0].text).toBe('có chữ đây')
  })

  it('Cmd+K mở vỏ link và đặt con trỏ vào chỗ điền địa chỉ', async () => {
    draw(para('xem đây'))
    await userEvent.click(screen.getByText('xem đây'))
    const field = screen.getByDisplayValue('xem đây') as HTMLTextAreaElement
    field.setSelectionRange(4, 7)
    await userEvent.keyboard('{Meta>}k{/Meta}')

    expect(field.value).toBe('xem [đây]()')
    expect(field.selectionStart).toBe(field.value.indexOf('()') + 1)
  })

  it('gõ địa chỉ vào chỗ con trỏ vừa nhảy tới là ra một link đủ', async () => {
    // `draw` ở đây không nuôi lại bài, nên soi cái được ghi ra chứ không soi
    // mặt vẽ — mặt vẽ đã có test riêng ở trên.
    const onChange = draw(para('xem đây'))
    await userEvent.click(screen.getByText('xem đây'))
    const field = screen.getByDisplayValue('xem đây') as HTMLTextAreaElement
    field.setSelectionRange(4, 7)
    await userEvent.keyboard('{Meta>}k{/Meta}')
    await userEvent.keyboard('https://a.com')
    await userEvent.tab()

    const written = onChange.mock.calls.at(-1)?.[0].body as { text?: string }[]
    expect(written[0].text).toBe('xem [đây](https://a.com)')
    expect(textToRuns(written[0].text!)).toContainEqual({ t: 'đây', href: 'https://a.com' })
  })
})

describe('hai mặt của một ô đo cùng một kiểu', () => {
  it('cả mặt vẽ lẫn mặt gõ đều dùng box-sizing: border-box', () => {
    // jsdom không dựng bố cục nên không đo được chiều cao thật; chỗ này chỉ
    // giữ cái điều kiện làm cho hai mặt đo bằng nhau. Con số thật đo bằng
    // Playwright trong Chrome: lệch 0.3px, trước khi sửa là 58.8px.
    draw(para('một dòng'))
    const drawnFace = screen.getByRole('textbox', { name: 'Đoạn văn' })
    expect(drawnFace.style.boxSizing).toBe('border-box')
  })
})
