import '@testing-library/jest-dom/vitest'
import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { EditorCanvas } from './Editor'

/*
 * Màn sửa có nối móc nút tải ảnh vào khuôn bài hay không.
 *
 * `everyTemplate.test.tsx` bên post-renderer chứng minh **khuôn bài** vẽ nút
 * khi được đưa móc. Nó không chứng minh **màn sửa** đưa móc ấy xuống — và đó
 * là hai chuyện khác nhau: một khuôn bài vẽ đúng mà màn sửa quên truyền thì
 * trên màn hình không có nút nào, đúng thứ nhìn thấy được nhưng không bài kiểm
 * nào đỏ.
 *
 * Nên chỗ này dựng đúng `EditorCanvas` thật cho từng khuôn và đếm góc ô ảnh.
 */
const post = (template: string, over: Record<string, unknown> = {}) =>
  ({
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
    plate_images: null,
    pull_quote: null,
    further_reading: [],
    sort_order: null,
    pinned: false,
    created_at: '',
    updated_at: '',
    published_at: null,
    ...over,
  }) as never

/*
 * Truyền cả `hero`: ảnh bìa cất ở cột riêng chứ không trong `plate_images`, nên
 * ba việc của nó đi từ màn sửa xuống. Dựng thiếu nó thì góc ô ảnh bìa chỉ còn
 * nút tải tệp, và bài kiểm sẽ khẳng định một màn hình không ai thấy.
 */
const heroActions = { link: vi.fn(), reframe: vi.fn(), clear: vi.fn() }

const draw = (template: string, over?: Record<string, unknown>) =>
  render(
    <EditorCanvas
      template={template as never}
      post={post(template, over)}
      onChange={vi.fn()}
      onHeroDrop={vi.fn()}
      hero={heroActions}
    />,
  )

const corners = (root: HTMLElement) =>
  Array.from(root.querySelectorAll('[data-plate-corner]'))
    .map((el) => el.getAttribute('data-plate-corner'))
    .sort()

describe('màn sửa nối nút tải ảnh vào từng ô ảnh cố định', () => {
  it('article: bốn ô của dàn trang, cộng một ô cho mỗi phần có hình', () => {
    const { container } = draw('article', {
      body: [
        {
          h: 'Phần',
          p: 'chữ',
          fig: { label: 'fig-1', note: '', caption: '', w: '200px', h: '140px', tint: '#EEE', margin: '0' },
        },
      ],
    })
    // `hero` là khung ảnh hồng: mặc định theo ảnh bìa, đặt được ảnh riêng.
    expect(corners(container)).toEqual(['detail', 'fig-0', 'hero', 'primary', 'secondary'])
  })

  /*
   * Đổi 2026-09-24: ô features của memo là ảnh bìa nhưng từng không có nút
   * nào, nên chưa có bìa thì nó chỉ là một mảng xám. Chủ site: *"rà tất cả
   * các chỗ ảnh"* — nay nó có nút ở góc như mọi ô khác.
   */
  it('memo: ô ảnh features có nút ở góc', () => {
    const { container } = draw('memo')
    expect(corners(container)).toEqual(['hero'])
  })

  /*
   * Ô phương tiện là ảnh bìa, và nay có nút riêng ở góc — chủ site: *"có khung
   * ảnh nhưng không có nút tải lên và gắn link"*.
   */
  it('bitesize: ô phương tiện và ô ảnh phụ', () => {
    const { container } = draw('bitesize', { body: { sub: 'chữ ô phụ' } })
    expect(corners(container)).toEqual(['hero', 'sub'])
  })

  it('bitesize có clip: ô phương tiện thêm nút tải ảnh thumbnail', () => {
    const { container } = draw('bitesize', {
      hero_image_url: 'https://kho/clip.mp4',
      body: { media: 'vid' },
    })
    const labels = Array.from(container.querySelectorAll('[data-plate-corner="hero"] button')).map((b) =>
      b.getAttribute('aria-label'),
    )
    expect(labels).toContain('tải ảnh thumbnail')
    expect(labels).toContain('đặt link')
  })

  it('longform: mỗi khung ảnh, kể cả khung trong hộp ghi chú', () => {
    const { container } = draw('longform', {
      body: [{ k: 'h1', runs: [{ t: 'Tiêu đề gốc' }] }, { k: 'fig' }, { k: 'aside', items: [{ k: 'fig' }] }],
    })
    expect(corners(container)).toEqual(['fig-1', 'fig-2-0'])
  })

  /*
   * Hai khuôn này không dựng sẵn ô ảnh nào — ảnh của chúng là khối `image` của
   * kho dùng chung, đã có đường tải ảnh riêng. Khẳng định ra đây để "không có
   * nút" đọc là cố ý chứ không phải một chỗ quên nối.
   */
  it('cards và report không có ô ảnh cố định nào', () => {
    for (const template of ['cards', 'report']) {
      const { container, unmount } = draw(template)
      expect(corners(container), template).toEqual([])
      unmount()
    }
  })

  /* Nút phải là nút thật, bấm được, có tên đọc lên được — không phải một ô màu. */
  it('mỗi góc có nút tải ảnh và nút đặt link, gọi tên được', () => {
    const { container } = draw('article')
    const labels = Array.from(container.querySelectorAll('[data-plate-corner] button')).map((b) =>
      b.getAttribute('aria-label'),
    )
    // Bốn ô: khung ảnh hồng, ảnh chính, ảnh phụ, chi tiết; bài này không có
    // phần nào có hình. Mỗi ô hai lối đưa ảnh vào; chưa ô nào có ảnh riêng
    // nên chưa có nút gỡ hay nút đặt khung.
    expect(labels).toEqual(Array(4).fill(['tải ảnh lên', 'đặt link']).flat())
  })

  /*
   * Thanh "ảnh bìa: tải ảnh lên – đặt link – đặt vào khung – xoá" đã bỏ, nên
   * "đặt link" phải có mặt ở **mọi** ô, không riêng ảnh bìa. Trước đây đúng một
   * ô trong cả sáu khuôn đặt link được.
   */
  it('mọi ô ảnh cố định của mọi khuôn đều đặt link được', () => {
    const cases: [string, Record<string, unknown> | undefined][] = [
      [
        'article',
        {
          body: [
            {
              h: 'Phần',
              p: 'chữ',
              fig: { label: 'fig-1', note: '', caption: '', w: '200px', h: '140px', tint: '#EEE', margin: '0' },
            },
          ],
        },
      ],
      ['bitesize', { body: { sub: 'chữ ô phụ' } }],
      ['longform', { body: [{ k: 'h1', runs: [{ t: 'Tiêu đề gốc' }] }, { k: 'fig' }] }],
    ]
    for (const [template, over] of cases) {
      const { container, unmount } = draw(template, over)
      const corners = container.querySelectorAll('[data-plate-corner]')
      expect(corners.length, template).toBeGreaterThan(0)
      for (const corner of corners) {
        const labels = Array.from(corner.querySelectorAll('button')).map((b) =>
          b.getAttribute('aria-label'),
        )
        expect(labels, `${template} · ${corner.getAttribute('data-plate-corner')}`).toContain(
          'đặt link',
        )
      }
      unmount()
    }
  })
})

/*
 * Ô ảnh trong màn sửa phải hiện ra đúng tấm ảnh.
 *
 * Chủ site: *"đẩy ảnh lên như nào phải hiển thị luôn ở trong edit chứ. trong
 * trang edit thì hiện 1 mảng màu xanh nhờ nhờ như kia. phải vào xem trước thì
 * mới xem được ảnh"*. Hai lỗi chồng nhau: ba ô giữa của article xưa nay không
 * có chỗ lưu ảnh, và những ô tự viết `background-image` bằng tay thì giữ
 * `cover` nhưng quên `background-position`, nên CSS neo ảnh vào góc trên-trái
 * chứ không vào điểm căn — cùng một tấm ảnh, màn sửa và trang xem trước cắt hai
 * kiểu vì khung của chúng rộng khác nhau.
 */
describe('ô ảnh trong màn sửa vẽ đúng tấm ảnh, đúng điểm căn', () => {
  const filled = (root: HTMLElement) =>
    Array.from(root.querySelectorAll<HTMLElement>('[data-plate-corner]'))
      .map((corner) => corner.offsetParent ?? corner.parentElement)
      .filter((el): el is HTMLElement => el instanceof HTMLElement)

  it('ba ô của article đọc ảnh từ plate_images, kèm điểm căn', () => {
    const { container } = draw('article', {
      plate_images: {
        primary: 'https://x/a.jpg#focus=0,100',
        secondary: 'https://x/b.jpg',
        detail: 'https://x/c.jpg#focus=100,0',
      },
    })
    const styles = filled(container).map((el) => el.style)
    const withImage = styles.filter((s) => s.backgroundImage.includes('https://x/'))
    expect(withImage).toHaveLength(3)

    // Địa chỉ tải về là địa chỉ trần: mảnh `#focus=` không phải một phần của tệp.
    for (const s of withImage) {
      expect(s.backgroundImage).not.toContain('#focus=')
      // Chính chỗ này là lỗi cũ: có `cover` mà không có `background-position`.
      expect(s.backgroundPosition).toMatch(/^\d+% \d+%$/)
      expect(s.backgroundSize).toBe('cover')
    }

    const at = (name: string) =>
      withImage.find((s) => s.backgroundImage.includes(name))?.backgroundPosition
    expect(at('a.jpg')).toBe('0% 100%')
    expect(at('c.jpg')).toBe('100% 0%')
    // Không ghi điểm căn thì vào giữa, không phải góc trên-trái.
    expect(at('b.jpg')).toBe('50% 50%')
  })

  it('ô nào chưa có ảnh thì vẫn là mảng màu, không phải ảnh rỗng', () => {
    const { container } = draw('article')
    for (const el of filled(container)) {
      expect(el.style.backgroundImage).toBe('')
      expect(el.style.backgroundColor).not.toBe('')
    }
  })
})
