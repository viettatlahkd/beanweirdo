import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { PostDetail, PostTemplate } from '../lib/apiClient'
import { EditorCanvas } from './Editor'
import { GRIP_LABEL } from '../components/RowShell'

function post(template: PostTemplate, body: unknown): PostDetail {
  return {
    id: 'p1',
    module_id: 'sensory',
    en: 'Tiêu đề',
    vi: 'mô tả',
    kind: 'note',
    date_label: '2026.09',
    status: 'draft',
    template,
    hero_image_url: null,
    theme_color: null,
    sort_order: 0,
    slug: 'bai',
    body,
    lead: 'dẫn',
    further_reading: [],
  } as unknown as PostDetail
}

const draw = (template: PostTemplate, body: unknown, onChange = vi.fn()) => {
  render(<EditorCanvas template={template} post={post(template, body)} onChange={onChange} onHeroDrop={vi.fn()} />)
  return onChange
}

/*
 * Before this, these three editors let you write over the words already there
 * and nothing else — a post had exactly as many parts as the template it was
 * copied from, forever. Each test below is one of the four things that were
 * missing.
 */
describe('article — cấu trúc sửa được', () => {
  const sections = [
    { h: 'Mở', p: 'đoạn một' },
    { h: 'Giữa', p: 'đoạn hai' },
  ]

  it('thêm được một phần', async () => {
    const onChange = draw('article', sections)
    await userEvent.click(screen.getByRole('button', { name: '+ phần' }))
    expect(onChange).toHaveBeenLastCalledWith({ body: [...sections, { h: '', p: '' }] })
  })

  it('xoá được một phần', async () => {
    const onChange = draw('article', sections)
    await userEvent.click(screen.getAllByLabelText('xoá phần')[0])
    expect(onChange).toHaveBeenLastCalledWith({ body: [sections[1]] })
  })

  it('giữ lại phần cuối cùng, để bài không thành trang trắng', async () => {
    const onChange = draw('article', [sections[0]])
    await userEvent.click(screen.getByLabelText('xoá phần'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('đổi chỗ được bằng bàn phím', async () => {
    const onChange = draw('article', sections)
    screen.getAllByLabelText(GRIP_LABEL)[0].focus()
    await userEvent.keyboard('{ArrowDown}')
    expect(onChange).toHaveBeenLastCalledWith({ body: [sections[1], sections[0]] })
  })

  it('nhân bản được', async () => {
    const onChange = draw('article', sections)
    await userEvent.click(screen.getAllByLabelText('nhân bản phần')[0])
    expect(onChange).toHaveBeenLastCalledWith({ body: [sections[0], sections[0], sections[1]] })
  })
})

describe('memo — cấu trúc sửa được', () => {
  const body = {
    subtitle: 'ba lần rót',
    sections: [
      { h: 'Mở', items: [{ runs: [{ t: 'một' }] }] },
      { h: 'Giữa', items: [{ runs: [{ t: 'hai' }] }] },
    ],
  }

  it('thêm được một mục', async () => {
    const onChange = draw('memo', body)
    await userEvent.click(screen.getByRole('button', { name: '+ mục' }))
    const next = onChange.mock.lastCall?.[0].body as typeof body
    expect(next.sections).toHaveLength(3)
    // Phần còn lại của body đi cùng, không bị ghi đè mất.
    expect(next.subtitle).toBe('ba lần rót')
  })

  it('xoá được một mục, và giữ lại mục cuối', async () => {
    const onChange = draw('memo', body)
    await userEvent.click(screen.getAllByLabelText('xoá mục')[0])
    expect((onChange.mock.lastCall?.[0].body as typeof body).sections).toHaveLength(1)

    const single = draw('memo', { ...body, sections: [body.sections[0]] }, vi.fn())
    await userEvent.click(screen.getAllByLabelText('xoá mục').at(-1)!)
    expect(single).not.toHaveBeenCalled()
  })

  it('đổi chỗ được', async () => {
    const onChange = draw('memo', body)
    screen.getAllByLabelText(GRIP_LABEL)[0].focus()
    await userEvent.keyboard('{ArrowDown}')
    expect((onChange.mock.lastCall?.[0].body as typeof body).sections.map((s) => s.h)).toEqual(['Giữa', 'Mở'])
  })

  it('nhân bản mà bản sao không dùng chung danh sách với bản gốc', async () => {
    const onChange = draw('memo', body)
    await userEvent.click(screen.getAllByLabelText('nhân bản mục')[0])
    const next = (onChange.mock.lastCall?.[0].body as typeof body).sections
    expect(next).toHaveLength(3)
    expect(next[1].items).not.toBe(next[0].items)
  })
})

describe('cards — cấu trúc sửa được', () => {
  const cards = [
    { n: '01', hue: '#8E1E42', groups: ['Chua'], title: 'Táo', sub: 'quả', tag: 'chua', parts: [] },
    { n: '02', hue: '#4C3A8E', groups: ['Hoa'], title: 'Nhài', sub: 'hoa', tag: 'hương', parts: [] },
  ]

  it('thêm được một thẻ, và thẻ mới thừa hưởng nhóm để bộ lọc còn thấy nó', async () => {
    const onChange = draw('cards', cards)
    await userEvent.click(screen.getByRole('button', { name: '+ thẻ' }))
    const next = onChange.mock.lastCall?.[0].body as typeof cards
    expect(next).toHaveLength(3)
    expect(next[2].groups).toEqual(['Hoa'])
    expect(next[2].n).toBe('03')
  })

  it('xoá và đổi chỗ được', async () => {
    const onChange = draw('cards', cards)
    screen.getAllByLabelText(GRIP_LABEL)[0].focus()
    await userEvent.keyboard('{ArrowDown}')
    expect((onChange.mock.lastCall?.[0].body as typeof cards).map((c) => c.title)).toEqual(['Nhài', 'Táo'])

    await userEvent.click(screen.getAllByLabelText('xoá thẻ')[0])
    expect((onChange.mock.lastCall?.[0].body as typeof cards)).toHaveLength(1)
  })

  it('nhân bản mà bản sao không dùng chung nhóm với bản gốc', async () => {
    const onChange = draw('cards', cards)
    await userEvent.click(screen.getAllByLabelText('nhân bản thẻ')[0])
    const next = onChange.mock.lastCall?.[0].body as typeof cards
    expect(next[1].groups).not.toBe(next[0].groups)
  })

  it('sửa đúng thẻ khi đang lọc theo nhóm', async () => {
    // Vị trí trong danh sách đã lọc từng là chỉ số duy nhất, và nó được trao
    // cho ô sửa — nên lọc rồi đổi tên thẻ đầu màn hình là đổi tên thẻ khác.
    const onChange = draw('cards', cards)
    await userEvent.click(screen.getByRole('button', { name: /Hoa/ }))
    // Bộ lọc phải thật sự lọc, không thì test này xanh mà chẳng chứng minh gì.
    expect(screen.queryByDisplayValue('Táo')).not.toBeInTheDocument()
    const field = screen.getByDisplayValue('Nhài')
    await userEvent.clear(field)
    await userEvent.type(field, 'Nhài trắng')
    await userEvent.tab()

    const next = onChange.mock.lastCall?.[0].body as typeof cards
    expect(next.map((c) => c.title)).toEqual(['Táo', 'Nhài trắng'])
  })
})

/*
 * Trước lượt này màn soạn memo có đúng năm ô: tiêu đề, dòng dẫn, và ba tên
 * mục. Mọi thứ *làm nên* một bài memo — gạch đầu dòng, mốc pha, bảng nếm, khối
 * kết luận — hiện ra trên màn nhưng không gõ được, và "+ mục" tạo ra một mục
 * không viết được gì vào.
 */
describe('memo — nội dung trong mục viết được', () => {
  const body = {
    subtitle: 'ba lần rót',
    sections: [
      {
        h: 'Bean character',
        items: [{ runs: [{ t: 'Ngọt mía, ' }, { t: 'hậu vị ngắn', em: true }], cont: ['đo lúc drop'] }],
      },
      { h: 'Pour test', phases: [{ n: '01', label: 'blooming', lines: ['40g'] }] },
    ],
  }

  it('mọi dòng trong mục đều là một ô gõ được', () => {
    draw('memo', body)
    // Chữ nhấn hiện ra dưới dạng gõ được, không mất khi sửa dòng.
    expect(screen.getByDisplayValue('Ngọt mía, *hậu vị ngắn*')).toBeInTheDocument()
    expect(screen.getByDisplayValue('đo lúc drop')).toBeInTheDocument()
    expect(screen.getByDisplayValue('blooming')).toBeInTheDocument()
    expect(screen.getByDisplayValue('40g')).toBeInTheDocument()
  })

  it('sửa một dòng thì chữ nhấn ở nguyên chỗ cũ', async () => {
    const onChange = draw('memo', body)
    const line = screen.getByDisplayValue('Ngọt mía, *hậu vị ngắn*')
    await userEvent.clear(line)
    await userEvent.type(line, 'Ngọt mía, *hậu vị dài*')
    await userEvent.tab()

    const sections = (onChange.mock.lastCall?.[0].body as { sections: { elements: { items: { runs: unknown[] }[] }[] }[] })
      .sections
    expect(sections[0].elements[0].items[0].runs).toEqual([{ t: 'Ngọt mía, ' }, { t: 'hậu vị dài', em: true }])
  })

  it('thêm được element vào một mục', async () => {
    const onChange = draw('memo', body)
    await userEvent.click(screen.getAllByText('+ thêm khối')[0])
    await userEvent.click(screen.getAllByRole('button', { name: 'Bảng' })[0])

    const sections = (onChange.mock.lastCall?.[0].body as { sections: { elements: { type: string }[] }[] }).sections
    expect(sections[0].elements.map((e) => e.type)).toEqual(['list', 'table'])
  })

  it('viết xong thì mục chỉ còn một cách lưu, không còn hai cái cãi nhau', async () => {
    const onChange = draw('memo', body)
    await userEvent.click(screen.getAllByText('+ dòng')[0])

    const section = (onChange.mock.lastCall?.[0].body as { sections: Record<string, unknown>[] }).sections[0]
    expect(section.elements).toBeDefined()
    expect(section.items).toBeUndefined()
  })

  it('mục mới tạo ra là mục trống chèn được element vào', async () => {
    const onChange = draw('memo', body)
    await userEvent.click(screen.getByRole('button', { name: '+ mục' }))
    const sections = (onChange.mock.lastCall?.[0].body as { sections: { elements: unknown[] }[] }).sections
    expect(sections[2].elements).toEqual([])
  })
})

describe('màn soạn vẽ đúng thứ trang sẽ vẽ', () => {
  const body = {
    sections: [
      {
        h: 'Pour test',
        phases: [
          { n: '01', label: 'blooming', lines: ['40g'] },
          { n: '02', label: '#2', lines: [] },
        ],
      },
    ],
  }

  it('danh sách đánh số hiện số ngay lúc đang soạn', () => {
    // Bản đầu của ô soạn này tự vẽ một chồng ô trống: số, bullet và thụt lề
    // đều biến mất, nên một mốc ghi "#2" — thứ chỉ có nghĩa khi đứng cạnh "02"
    // — đọc thành vô nghĩa trong lúc viết.
    draw('memo', body)
    expect(screen.getByText('01')).toBeInTheDocument()
    expect(screen.getByText('02')).toBeInTheDocument()
    expect(screen.getByDisplayValue('#2')).toBeInTheDocument()
  })

  it('dòng phụ vẫn là dòng phụ, không thành một mục ngang hàng', async () => {
    const onChange = draw('memo', body)
    const sub = screen.getByDisplayValue('40g')
    await userEvent.clear(sub)
    await userEvent.type(sub, '45g')
    await userEvent.tab()

    const items = (onChange.mock.lastCall?.[0].body as { sections: { elements: { items: { sub?: string[] }[] }[] }[] })
      .sections[0].elements[0].items
    expect(items[0].sub).toEqual(['45g'])
    expect(items).toHaveLength(2)
  })

  it('xoá hết chữ một dòng phụ thì dòng ấy đi, không để lại dòng trống', async () => {
    const onChange = draw('memo', body)
    await userEvent.clear(screen.getByDisplayValue('40g'))
    await userEvent.tab()

    const items = (onChange.mock.lastCall?.[0].body as { sections: { elements: { items: { sub?: string[] }[] }[] }[] })
      .sections[0].elements[0].items
    expect(items[0].sub).toEqual([])
  })
})
