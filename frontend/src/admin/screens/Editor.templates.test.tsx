import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditorCanvas } from './Editor'
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
