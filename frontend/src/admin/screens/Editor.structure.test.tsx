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

/*
 * Một mục memo từng là cái bọc, với tên mục là thuộc tính của nó — nên nắm vào
 * tiêu đề là nắm luôn mọi thứ bên dưới, không có cách nào tách. Nay thân bài là
 * một chuỗi phẳng: tiêu đề là element như mọi element khác.
 */
describe('memo — chuỗi phẳng, mỗi element một tay nắm', () => {
  const body = {
    subtitle: 'ba lần rót',
    sections: [
      { h: 'Bean character', items: [{ runs: [{ t: 'Ngọt mía, ' }, { t: 'hậu vị ngắn', em: true }], cont: ['đo lúc drop'] }] },
      { h: 'Pour test', phases: [{ n: '01', label: 'blooming', lines: ['40g'] }] },
    ],
  }
  const bodyOf = (onChange: ReturnType<typeof vi.fn>) =>
    onChange.mock.lastCall?.[0].body as { elements: { type: string; text?: string }[]; sections?: unknown }

  it('tiêu đề là element, không phải nắp của một cái bọc', async () => {
    const onChange = draw('memo', body)
    // Bốn element: hai tiêu đề, hai danh sách — không còn tầng "mục" nào. Nhân
    // bản tiêu đề đầu ra element thứ năm, ngay dưới nó.
    await userEvent.click(screen.getAllByLabelText('nhân bản khối')[0])
    expect(bodyOf(onChange).elements.map((e) => e.type)).toEqual(['heading', 'heading', 'list', 'heading', 'list'])
  })

  it('kéo tiêu đề thì chỉ tiêu đề đi, không kéo theo danh sách dưới nó', async () => {
    const onChange = draw('memo', body)
    screen.getAllByLabelText(GRIP_LABEL)[0].focus()
    await userEvent.keyboard('{ArrowDown}')
    expect(bodyOf(onChange).elements.map((e) => e.type)).toEqual(['list', 'heading', 'heading', 'list'])
  })

  it('xoá và chèn từng element một', async () => {
    const onChange = draw('memo', body)
    await userEvent.click(screen.getAllByLabelText('xoá khối')[0])
    expect(bodyOf(onChange).elements).toHaveLength(3)
  })

  it('viết xong thì bài chỉ còn một cách lưu, không còn hai cái cãi nhau', async () => {
    const onChange = draw('memo', body)
    await userEvent.click(screen.getAllByLabelText('xoá khối')[0])
    const next = bodyOf(onChange)
    expect(next.elements).toBeDefined()
    expect(next.sections).toBeUndefined()
  })

  it('chèn element mới ngay dưới element đang đứng', async () => {
    const onChange = draw('memo', body)
    await userEvent.click(screen.getAllByText('+ thêm khối')[0])
    await userEvent.click(screen.getAllByRole('button', { name: 'Bảng' })[0])
    expect(bodyOf(onChange).elements.map((e) => e.type)).toEqual(['heading', 'table', 'list', 'heading', 'list'])
  })

  it('mọi dòng trong danh sách đều là ô gõ được, chữ nhấn hiện dạng sửa được', () => {
    draw('memo', body)
    expect(screen.getByDisplayValue('Ngọt mía, *hậu vị ngắn*')).toBeInTheDocument()
    expect(screen.getByDisplayValue('đo lúc drop')).toBeInTheDocument()
    expect(screen.getByDisplayValue('blooming')).toBeInTheDocument()
  })

  it('danh sách đánh số hiện số ngay lúc đang soạn', () => {
    // Bản đầu của ô soạn này tự vẽ một chồng ô trống: số, bullet và thụt lề đều
    // biến mất, nên một mốc ghi "#2" — thứ chỉ có nghĩa khi đứng cạnh "02" —
    // đọc thành vô nghĩa trong lúc viết.
    draw('memo', body)
    expect(screen.getByText('01')).toBeInTheDocument()
  })

  it('xoá hết chữ một dòng phụ thì dòng ấy đi, không để lại dòng trống', async () => {
    const onChange = draw('memo', body)
    await userEvent.clear(screen.getByDisplayValue('40g'))
    await userEvent.tab()
    // '40g' thuộc danh sách thứ hai — danh sách các mốc pha.
    const lists = bodyOf(onChange).elements.filter((e) => e.type === 'list') as unknown as {
      items: { sub?: string[] }[]
    }[]
    expect(lists[1].items[0].sub).toEqual([])
  })
})
