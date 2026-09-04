import '@testing-library/jest-dom/vitest'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditorCanvas } from './Editor'
import { FLAVOR_GROUP_NAMES } from 'post-renderer'
import { POST_TEMPLATES } from '../../../../backend/lib/posts'

/*
 * The canvas dispatched on `cards` and `report` and let everything else fall
 * through to the article editor. A long-form post therefore opened as an
 * article — the owner picked Long-form, saw Article, and editing it would have
 * written article-shaped sections over a parsed export.
 *
 * So: every template the database accepts must reach a canvas that draws that
 * template. Adding a sixth without a branch here fails the run.
 */
const post = (template: string) => ({
  id: 'p1',
  module_id: 'sensory',
  en: 'Tiêu đề',
  vi: 'Mô tả',
  kind: 'note',
  template,
  date_label: '2026.08',
  status: 'draft',
  body: template === 'memo' ? { sections: [] } : [],
  lead: null,
  hero_image_url: null,
  hero_caption: null,
  pull_quote: null,
  further_reading: [],
  sort_order: null,
  pinned: false,
  created_at: '',
  updated_at: '',
  published_at: null,
}) as never

describe('EditorCanvas', () => {
  it('draws every template the database accepts', () => {
    for (const template of POST_TEMPLATES) {
      const { container, unmount } = render(
        <EditorCanvas
          template={template as never}
          post={post(template)}
          onChange={vi.fn()}
          onHeroDrop={vi.fn()}
        />,
      )
      // Something reached the page — a template with no branch used to render
      // the article canvas, which is worse than rendering nothing.
      expect(container.textContent?.length ?? 0).toBeGreaterThan(0)
      unmount()
    }
  })

  it('lets a memo be edited in place, which it could not before', () => {
    render(
      <EditorCanvas template={'memo' as never} post={post('memo')} onChange={vi.fn()} onHeroDrop={vi.fn()} />,
    )
    // Its title is a field of the post, so the canvas offers it.
    expect(screen.getAllByDisplayValue('Tiêu đề').length).toBeGreaterThan(0)
  })

  it('does not edit a long-form post as an article', () => {
    render(
      <EditorCanvas template={'longform' as never} post={post('longform')} onChange={vi.fn()} onHeroDrop={vi.fn()} />,
    )
    // The article canvas offers a lead field; long-form has no such thing.
    expect(screen.queryByPlaceholderText(/sapo|lead/i)).toBeNull()
  })
})

/*
 * Long-form là 400 khối phẳng, và cho tới đây chúng chỉ vẽ ra để xem. Chủ site
 * chốt `cont` chỉ là đoạn văn lùi lề, và lùi bằng Tab — nên cử chỉ đó phải có
 * thật, cả chiều vào và chiều ra.
 */
describe('long-form: lùi lề bằng Tab', () => {
  const lf = (blocks: unknown[]) => ({ ...(post('longform') as object), body: blocks }) as never

  const fieldFor = (text: string) => screen.getByDisplayValue(text)

  it('Tab lùi vào, Shift+Tab lùi ra', async () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <EditorCanvas
        template={'longform' as never}
        post={lf([{ k: 'p', runs: [{ t: 'một dòng' }] }])}
        onChange={onChange}
        onHeroDrop={vi.fn()}
      />,
    )
    await userEvent.click(fieldFor('một dòng'))
    await userEvent.tab()
    expect(onChange).toHaveBeenLastCalledWith({
      body: [{ k: 'p', ind: 1, runs: [{ t: 'một dòng', w: '300', s: 'normal' }] }],
    })

    rerender(
      <EditorCanvas
        template={'longform' as never}
        post={lf([{ k: 'p', ind: 1, runs: [{ t: 'một dòng' }] }])}
        onChange={onChange}
        onHeroDrop={vi.fn()}
      />,
    )
    await userEvent.click(fieldFor('một dòng'))
    await userEvent.tab({ shift: true })
    // Lùi ra hết thì không còn `ind` trong dữ liệu — không lùi là mặc định.
    expect(onChange).toHaveBeenLastCalledWith({
      body: [{ k: 'p', runs: [{ t: 'một dòng', w: '300', s: 'normal' }] }],
    })
  })

  it('gạch đầu dòng lùi theo cấp lồng của nó, cùng một phím', async () => {
    const onChange = vi.fn()
    render(
      <EditorCanvas
        template={'longform' as never}
        post={lf([{ k: 'li', runs: [{ t: 'mục' }] }])}
        onChange={onChange}
        onHeroDrop={vi.fn()}
      />,
    )
    await userEvent.click(fieldFor('mục'))
    await userEvent.tab()
    expect(onChange).toHaveBeenLastCalledWith({
      body: [{ k: 'li', lvl: 2, runs: [{ t: 'mục', w: '300', s: 'normal' }] }],
    })
  })

  it('sửa một dòng thì chỗ đậm vẫn còn', async () => {
    const onChange = vi.fn()
    render(
      <EditorCanvas
        template={'longform' as never}
        post={lf([{ k: 'p', runs: [{ t: 'phần ' }, { t: 'đậm', w: '600', s: 'normal' }] }])}
        onChange={onChange}
        onHeroDrop={vi.fn()}
      />,
    )
    const field = fieldFor('phần *đậm*')
    await userEvent.type(field, ' thêm')
    // Tab nộp chữ và lùi lề trong cùng một lần ghi; ở đây chỉ cần biết chữ về
    // đúng runs, còn bậc lùi đã có test riêng.
    await userEvent.tab()
    expect(onChange.mock.lastCall?.[0].body[0].runs).toEqual([
      { t: 'phần ', w: '300', s: 'normal' },
      { t: 'đậm', w: '600', s: 'normal' },
      { t: ' thêm', w: '300', s: 'normal' },
    ])
  })

  it('bài còn khối cont cũ thì lần ghi đầu tiên đổi cả bài sang dạng mới', async () => {
    const onChange = vi.fn()
    render(
      <EditorCanvas
        template={'longform' as never}
        post={lf([
          { k: 'p', runs: [{ t: 'dẫn' }] },
          { k: 'cont', runs: [{ t: '— điểm phụ' }] },
        ])}
        onChange={onChange}
        onHeroDrop={vi.fn()}
      />,
    )
    await userEvent.click(fieldFor('dẫn'))
    await userEvent.tab()
    expect(onChange).toHaveBeenLastCalledWith({
      body: [
        { k: 'p', ind: 1, runs: [{ t: 'dẫn', w: '300', s: 'normal' }] },
        { k: 'p', ind: 1, runs: [{ t: '— điểm phụ' }] },
      ],
    })
  })
})

/*
 * Long-form: khối nào cũng phải sửa được.
 *
 * Đo trên 15 bài nháp thì long-form là template có nhiều chữ không sửa được
 * nhất: tiêu đề cấp ba, cấp bốn, dòng nhãn, ghi chú và công thức đều vẽ bằng
 * chuỗi trơn nên nằm ngoài chỗ nối ô nhập. Chủ site nhìn thấy chữ trên trang mà
 * không có chỗ nào sửa được nó.
 */
describe('long-form: mọi loại khối đều sửa được', () => {
  const lf = (blocks: unknown[]) => ({ ...(post('longform') as object), body: blocks }) as never

  const CASES: [string, Record<string, unknown>, string][] = [
    ['tiêu đề cấp ba', { k: 'h3', runs: [{ t: 'Đo bằng cách nào' }] }, 'Đo bằng cách nào'],
    ['tiêu đề cấp bốn', { k: 'h4', runs: [{ t: 'Giới hạn' }] }, 'Giới hạn'],
    ['dòng nhãn', { k: 'meta', runs: [{ t: 'Cầu Đất · 2026' }] }, 'Cầu Đất · 2026'],
    ['ghi chú', { k: 'note', runs: [{ t: 'Chưa đo lại được.' }] }, 'Chưa đo lại được.'],
    ['công thức', { k: 'formula', v: 'RH + O₂ → R• + •OOH' }, 'RH + O₂ → R• + •OOH'],
  ]

  for (const [ten, block, chu] of CASES) {
    it(`${ten} có ô nhập mang đúng chữ của nó`, () => {
      render(
        <EditorCanvas template={'longform' as never} post={lf([block])} onChange={vi.fn()} onHeroDrop={vi.fn()} />,
      )
      expect(screen.getByDisplayValue(chu)).toBeTruthy()
    })
  }

  it('công thức ghi vào `v`, không phải `runs`', async () => {
    // Ghi nhầm chỗ thì công thức biến mất khỏi trang mà dữ liệu vẫn còn.
    const onChange = vi.fn()
    render(
      <EditorCanvas
        template={'longform' as never}
        post={lf([{ k: 'formula', v: 'A → B' }])}
        onChange={onChange}
        onHeroDrop={vi.fn()}
      />,
    )
    await userEvent.type(screen.getByDisplayValue('A → B'), ' + C')
    await userEvent.tab()
    expect(onChange).toHaveBeenLastCalledWith({ body: [{ k: 'formula', v: 'A → B + C' }] })
  })
})

/*
 * Article: chú thích ảnh và ghi chú bên lề.
 *
 * Cả hai hiện trên trang mà không có ô nào gõ được. Article đã có sẵn móc
 * `renderFigure`, nhưng móc ấy thay *cả* cách vẽ khung ảnh — dùng nó nghĩa là
 * khung sửa phải vẽ lại toàn bộ bố cục, và một bản vẽ lại thì lệch bản thật chỉ
 * sau vài ngày (đúng chuyện đã xảy ra với ô xem trước của trang module). Nên
 * thêm hai móc hẹp, bố cục vẫn nằm nguyên một chỗ.
 */
describe('article: khung ảnh', () => {
  const withFig = (fig: Record<string, unknown>) =>
    ({
      ...(post('article') as object),
      body: [{ h: 'Mục', p: 'Đoạn', fig: { h: '190px', w: '300px', tint: '#EEE', label: 'nhãn', ...fig } }],
    }) as never

  it('chú thích ảnh và ghi chú bên lề đều có ô nhập', () => {
    render(
      <EditorCanvas
        template={'article' as never}
        post={withFig({ caption: 'chú thích ảnh', note: 'ghi chú bên lề' })}
        onChange={vi.fn()}
        onHeroDrop={vi.fn()}
      />,
    )
    expect(screen.getByDisplayValue('chú thích ảnh')).toBeTruthy()
    expect(screen.getByDisplayValue('ghi chú bên lề')).toBeTruthy()
  })

  it('sửa chú thích không xoá mất phần còn lại của khung ảnh', async () => {
    const onChange = vi.fn()
    render(
      <EditorCanvas
        template={'article' as never}
        post={withFig({ caption: 'cũ', note: 'giữ nguyên' })}
        onChange={onChange}
        onHeroDrop={vi.fn()}
      />,
    )
    await userEvent.type(screen.getByDisplayValue('cũ'), ' mới')
    await userEvent.tab()
    const fig = (onChange.mock.lastCall?.[0].body[0] as { fig: Record<string, unknown> }).fig
    expect(fig.caption).toBe('cũ mới')
    expect(fig.note).toBe('giữ nguyên')
    expect(fig.label).toBe('nhãn')
  })
})

/*
 * Info cards: nhóm hương của một thẻ.
 *
 * Nhóm không hiện trên mặt thẻ — chúng chỉ nuôi thanh lọc ở đầu trang. Nghĩa là
 * một thẻ không nhóm thì viết xong rồi *không tìm thấy được*, và cho tới nay
 * không có chỗ nào đặt nhóm cho nó. `blankCard` chép nhóm của thẻ đứng trước
 * chính vì lý do ấy — một cách vá, không phải một cách chọn.
 */
describe('info cards: chọn nhóm cho thẻ', () => {
  const deck = (groups: string[]) =>
    ({
      ...(post('cards') as object),
      body: [{ n: '01', title: 'Thẻ', hue: '#7FB87E', sub: 'phụ', tag: 'tag', groups, parts: [] }],
    }) as never

  it('bày đủ mười bốn nhóm, đánh dấu nhóm thẻ đang thuộc về', () => {
    render(
      <EditorCanvas template={'cards' as never} post={deck(['Sweet'])} onChange={vi.fn()} onHeroDrop={vi.fn()} />,
    )
    expect(screen.getByRole('button', { name: 'Sweet' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Berry' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('bấm một nhóm thì thêm vào, bấm lại thì bỏ ra', async () => {
    const onChange = vi.fn()
    render(
      <EditorCanvas template={'cards' as never} post={deck(['Sweet'])} onChange={onChange} onHeroDrop={vi.fn()} />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Berry' }))
    expect(onChange.mock.lastCall?.[0].body[0].groups).toEqual(['Sweet', 'Berry'])

    await userEvent.click(screen.getByRole('button', { name: 'Sweet' }))
    expect(onChange.mock.lastCall?.[0].body[0].groups).toEqual([])
  })

  it('dùng chung từ vựng với trang, không phải bản chép thứ hai', () => {
    // Hai bản sao của một danh sách là cách chắc chắn nhất để chúng lệch nhau.
    expect(FLAVOR_GROUP_NAMES).toContain('Citrus Fruit')
    expect(FLAVOR_GROUP_NAMES).toHaveLength(14)
  })
})

/*
 * Long-form: thêm · xoá · đổi thứ tự khối.
 *
 * Rà 15 bài nháp thì long-form là template duy nhất **không có** thao tác cấu
 * trúc nào: 0 nút thêm, 0 nút xoá, 0 tay nắm — trên cả bài 400 khối. Chủ site
 * sửa được chữ nhưng không thêm nổi một đoạn, không xoá nổi một khối, không đổi
 * nổi thứ tự. Bốn template kia đều đã có.
 */
describe('long-form: thao tác cấu trúc', () => {
  const lf = (blocks: unknown[]) => ({ ...(post('longform') as object), body: blocks }) as never
  const two = [
    { k: 'p', runs: [{ t: 'Đoạn một' }] },
    { k: 'p', runs: [{ t: 'Đoạn hai' }] },
  ]

  it('mỗi khối có tay nắm và nút xoá', () => {
    const { container } = render(
      <EditorCanvas template={'longform' as never} post={lf(two)} onChange={vi.fn()} onHeroDrop={vi.fn()} />,
    )
    expect([...container.querySelectorAll('button')].filter((b) => (b.textContent ?? '').startsWith('⠿'))).toHaveLength(2)
    expect([...container.querySelectorAll('button')].filter((b) => (b.textContent ?? '').trim() === '×')).toHaveLength(2)
  })

  it('thêm một đoạn thì nó vào cuối bài', async () => {
    const onChange = vi.fn()
    render(<EditorCanvas template={'longform' as never} post={lf(two)} onChange={onChange} onHeroDrop={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: '+ đoạn văn' }))
    const body = onChange.mock.lastCall?.[0].body as { k: string }[]
    expect(body).toHaveLength(3)
    expect(body[2].k).toBe('p')
  })

  it('có khối công thức và ghi chú — hai thứ long-form có mà nơi khác không', async () => {
    const onChange = vi.fn()
    render(<EditorCanvas template={'longform' as never} post={lf(two)} onChange={onChange} onHeroDrop={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: '+ công thức' }))
    expect((onChange.mock.lastCall?.[0].body as { k: string }[])[2].k).toBe('formula')
  })

  it('xoá một khối thì khối kia còn nguyên', async () => {
    const onChange = vi.fn()
    const { container } = render(
      <EditorCanvas template={'longform' as never} post={lf(two)} onChange={onChange} onHeroDrop={vi.fn()} />,
    )
    await userEvent.click([...container.querySelectorAll('button')].filter((b) => (b.textContent ?? '').trim() === '×')[0])
    const body = onChange.mock.lastCall?.[0].body as { runs: { t: string }[] }[]
    expect(body).toHaveLength(1)
    expect(body[0].runs[0].t).toBe('Đoạn hai')
  })
})
