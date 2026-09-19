// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { ReportBlock } from 'post-renderer'
import { describe, expect, it, vi } from 'vitest'
import type { PostDetail } from '../lib/apiClient'
import { EditorCanvas } from './Editor'

/*
 * Kéo một khối đi đâu được.
 *
 * Chủ site: *"tất cả các khối tạo bằng [+] đều đang không kéo di lên xuống
 * được... nó phải di được lên xuống khắp cả template edit"*. Tay nắm thì có
 * từ lâu; cái thiếu là **chỗ hạ cánh**. Chỉ khối mới nhận thả, mà một bài
 * bình thường là chữ xen một hai cái ảnh — nên nhấc cái ảnh lên là không có
 * điểm rơi nào và nó về đúng chỗ cũ.
 *
 * jsdom không dựng dàn trang nên mọi hình chữ nhật đo ra bằng 0; thả ở
 * `clientY: 0` vì thế rơi vào dòng đầu của dải, đúng đường mà mã chạy thật.
 */

function post(body: unknown, template = 'report'): PostDetail {
  return {
    id: 'p1',
    module_id: 'sensory',
    en: 'Rang thử',
    vi: 'mô tả',
    date_label: '2026.06',
    status: 'draft',
    template,
    hero_image_url: null,
    sort_order: 0,
    slug: 'rang-thu',
    body,
    lead: '',
  } as unknown as PostDetail
}

/** Chữ – ảnh – chữ: hình hay gặp nhất, và là hình không kéo được trước đây. */
const blocks: ReportBlock[] = [
  { id: 'b1', type: 'paragraph', text: 'Đoạn trên.' },
  { id: 'b2', type: 'image', caption: 'nhân sau khi drop' },
  { id: 'b3', type: 'paragraph', text: 'Đoạn dưới.' },
]

const draw = (body: unknown, template = 'report') => {
  const onChange = vi.fn()
  const { container } = render(
    <EditorCanvas template={template} post={post(body, template)} onChange={onChange} onHeroDrop={vi.fn()} />,
  )
  return { onChange, container }
}

/** Dải chữ nào — `.awc-rep-block` có ô soạn sống bên trong. */
const runs = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>('.awc-rep-block')).filter((b) =>
    b.querySelector('.awc-live-input'),
  )

const typesOf = (onChange: ReturnType<typeof vi.fn>) =>
  (onChange.mock.lastCall?.[0].body as { type: string }[]).map((b) => b.type)

describe('kéo một khối vào giữa dải chữ', () => {
  /* `dataTransfer` phải có thật: sự kiện nổi lên tới tầng ngoài, nơi thả tệp
     là đường đặt ảnh bìa và chỗ ấy đọc `dataTransfer.files`. */
  const dt = { files: [] as File[] }

  it('thả tấm ảnh lên dải chữ trên thì nó lên trên', () => {
    const { onChange, container } = draw(blocks)

    fireEvent.dragStart(screen.getByLabelText(/Kéo thả để đổi thứ tự/))
    const target = runs(container)[0]
    fireEvent.dragOver(target, { clientY: 0, dataTransfer: dt })
    fireEvent.drop(target, { clientY: 0, dataTransfer: dt })

    // Ảnh từ giữa lên đầu; hai đoạn chữ giữ nguyên thứ tự của chúng.
    expect(typesOf(onChange)).toEqual(['image', 'paragraph', 'paragraph'])
  })

  it('không ai đang kéo thì dải chữ không đổi gì cả', () => {
    // Không có bước `dragStart`, nên `drop.active` là false và cả hai móc
    // vắng mặt — dải chữ lúc ấy chỉ là chữ.
    const { onChange, container } = draw(blocks)
    const target = runs(container)[0]
    fireEvent.dragOver(target, { clientY: 0, dataTransfer: dt })
    fireEvent.drop(target, { clientY: 0, dataTransfer: dt })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('dải chữ vẫn không có tay nắm — chữ không phải khối', () => {
    /*
     * Chủ site: *"chữ không có khối, không tách paragraph, tất cả là long
     * form edit như lark/markdown/ghost"*. Ba khối ở trên có đúng **một**
     * tay nắm, của tấm ảnh; hai đoạn chữ không có cái nào.
     */
    draw(blocks)
    expect(screen.getAllByLabelText(/Kéo thả để đổi thứ tự/)).toHaveLength(1)
  })
})
