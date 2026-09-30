import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { PostRenderer, type PostRendererProps } from './PostRenderer'
import type { PlateAction } from './plates'
import type { BitesizePostData } from './Bitesize'
import type { ArticlePostData, LongformPostData } from './types'
import { POST_TEMPLATES } from '../../../backend/lib/posts'

/**
 * Rules that hold for every template, including ones nobody has written yet.
 *
 * A template is free to look like nothing else in the system — that is the
 * point of having five. But a reader must always be able to see where a post
 * is filed and get back there, so two things are not a template's own business:
 * the trail back, and the colours of the module it belongs to.
 *
 * Adding a template means adding it to `CASES`. If you do not, the first test
 * fails and says which one is missing, rather than the rule quietly not
 * applying to the new one.
 */

const BAND = { bg: 'rgb(1, 2, 3)', fg: 'rgb(4, 5, 6)' }
const CRUMB = <div>đường-quay-lại</div>

const CASES: Record<string, PostRendererProps> = {
  article: {
    template: 'article',
    post: {
      band: BAND, eyebrow: '01 — essay — 2026.02', moduleTitle: 'biochem', title: 'Bài',
      lead: 'dẫn', sections: [], pull: '', relatedHeading: '', related: [],
      furtherReadingHeading: '', furtherReading: [],
      platePrimary: { caption: '', tint: '#EEE', imageUrl: null }, plateSecondary: { caption: '', tint: '#EEE', imageUrl: null },
      heroPlate: { caption: '', tint: '#EEE', imageUrl: null }, detailPlate: { caption: '', tint: '#EEE', imageUrl: null },
    },
  },
  cards: { template: 'cards', post: { band: BAND, title: 'Bài', intro: [''], cards: [] } },
  report: { template: 'report', post: { band: BAND, title: 'Bài', blocks: [] } },
  /*
   * Long-form cần một khối `h1`: tiêu đề bài được vẽ *thay cho* tiêu đề đầu
   * tiên của bản export, nên bài không có khối nào thì trang không có tiêu đề
   * để mà vẽ. (Đó cũng là một chỗ hở của template lúc bài còn trắng.)
   */
  longform: {
    template: 'longform',
    post: { band: BAND, title: 'Bài', blocks: [{ k: 'h1', runs: [{ t: 'Tiêu đề gốc' }] }] },
  },
  memo: { template: 'memo', post: { band: BAND, title: 'Bài', specs: [], sections: [] } },
  bitesize: {
    template: 'bitesize',
    post: {
      band: BAND, title: 'Bài', tag: 'quan sát', date: '2026.02', num: '', pinned: false,
      image: null, ink: '#B65A3C', wash: '#E9B79C', len: 'ngắn', portrait: false,
      mediaHint: 'ảnh — cận cảnh chủ thể', sub: '', subImage: null, media: 'img', text: 'thân bài',
    },
  },
}

describe('rules every template obeys', () => {
  it('covers every template the system accepts', () => {
    expect(Object.keys(CASES).sort()).toEqual([...POST_TEMPLATES].sort())
  })

  for (const name of Object.keys(CASES)) {
    it(`${name}: shows the trail back`, () => {
      render(<PostRenderer {...CASES[name]} breadcrumb={CRUMB} />)
      expect(screen.getByText('đường-quay-lại')).toBeInTheDocument()
    })

    it(`${name}: wears its module's colours`, () => {
      const { container } = render(<PostRenderer {...CASES[name]} breadcrumb={CRUMB} />)
      const painted = Array.from(container.querySelectorAll<HTMLElement>('div')).some(
        (d) => d.style.background === BAND.bg || d.style.backgroundColor === BAND.bg,
      )
      expect(painted).toBe(true)
    })
  }
})

/**
 * Tiêu đề bài dài phải tự xuống dòng, và gãy đúng chỗ tiếng Anh cho phép gãy.
 *
 * "biochemistry 101" ở cỡ 92px không vừa mảng màu chứa nó, và HTML mặc định
 * không cắt một từ dài — nó tràn ra rồi bị ô bên cạnh che mất đuôi.
 *
 * `lang="en"` là phần dễ rơi nhất: đo trong trình duyệt thật thì bỏ nó đi,
 * cùng một chữ tràn ra 45px thay vì nằm gọn — vì trang khai `lang="vi"` và
 * tiếng Việt không ngắt âm tiết giữa từ. Không thẻ nào nói mình là tiếng Anh
 * thì luật ngắt không chạy, mà nhìn CSS vẫn thấy đủ.
 */
describe('tiêu đề dài', () => {
  it('mọi template đều khai tiếng Anh và bật luật ngắt âm tiết', () => {
    for (const [name, props] of Object.entries(CASES)) {
      const { container, unmount } = render(<PostRenderer {...props} />)
      const h1 = container.querySelector('h1')
      expect(h1, name).not.toBeNull()
      expect(h1?.getAttribute('lang'), name).toBe('en')
      expect(h1?.style.hyphens || h1?.style.getPropertyValue('-webkit-hyphens'), name).toBe('auto')
      unmount()
    }
  })
})

/**
 * Nút tải ảnh ở góc **mọi** ô ảnh cố định, không phải ô của một template.
 *
 * Chủ site đếm trên màn hình: trang bài có mấy mảng màu mang chữ "chưa có
 * ảnh", và không mảng nào bấm vào được. Ba trong số đó — cặp ô mở đầu và ô
 * vuông ở cột phải của article — thậm chí không có chỗ nào để lưu ảnh cả, nên
 * dù đặt bằng đường nào thì trang vẫn vẽ mảng màu.
 *
 * Bảng dưới là **bản kiểm kê**: mỗi template, những ô ảnh mà dàn trang dựng
 * sẵn. Thêm một template hay thêm một ô ảnh cố định vào template đã có thì
 * thêm vào đây; không thêm thì bài kiểm đầu tiên đỏ và nói thiếu template nào,
 * chứ không phải cái mới âm thầm không có nút nào.
 *
 * `cards` và `report` khai `slots: []` **và không nhận `renderPlateAction`**:
 * hai khuôn ấy không dựng sẵn ô ảnh nào, nên móc ấy không có trong kiểu của
 * chúng và truyền vào là lỗi biên dịch, không phải một danh sách rỗng lặng
 * lẽ. Ảnh trong chúng là khối `image` của kho dùng chung — nằm trong thân bài,
 * chèn và xoá được như mọi khối khác, và đã có đường tải ảnh riêng ở màn sửa.
 */
const FIGURE = {
  label: 'fig-1', note: 'ghi chú', caption: 'chú thích',
  w: '200px', h: '140px', tint: '#EEE', margin: '0',
}

const ARTICLE_POST: ArticlePostData = {
  band: BAND, eyebrow: '01 — essay — 2026.02', moduleTitle: 'biochem', title: 'Bài',
  lead: 'dẫn', sections: [{ h: 'Phần', p: 'chữ', fig: FIGURE }], pull: '',
  relatedHeading: '', related: [], furtherReadingHeading: '', furtherReading: [],
  platePrimary: { caption: '', tint: '#EEE', imageUrl: null },
  plateSecondary: { caption: '', tint: '#EEE', imageUrl: null },
  heroPlate: { caption: '', tint: '#EEE', imageUrl: null },
  detailPlate: { caption: '', tint: '#EEE', imageUrl: null },
}

const LONGFORM_POST: LongformPostData = {
  band: BAND,
  title: 'Bài',
  blocks: [
    { k: 'h1', runs: [{ t: 'Tiêu đề gốc' }] },
    { k: 'fig' },
    { k: 'aside', items: [{ k: 'fig' }] },
  ],
}

const BITESIZE_POST: BitesizePostData = {
  band: BAND, title: 'Bài', tag: 'quan sát', date: '2026.02', num: '', pinned: false,
  image: null, ink: '#B65A3C', wash: '#E9B79C', len: 'ngắn', portrait: false,
  mediaHint: 'ảnh — cận cảnh chủ thể', sub: 'chữ ô phụ', subImage: null, media: 'img',
  text: 'thân bài',
}

/*
 * Mỗi mục vẽ lấy `<PostRenderer>` của mình chứ không trải một union props ra:
 * chỉ khuôn nào có ô ảnh cố định mới nhận `renderPlateAction`, nên cách duy
 * nhất để bảng này vừa chạy vừa biên dịch được là gọi thẳng từng cái.
 */
const PLATE_CASES: Record<string, { draw: (action?: PlateAction) => ReactNode; slots: string[] }> = {
  article: {
    draw: (action) => <PostRenderer template="article" post={ARTICLE_POST} renderPlateAction={action} />,
    slots: ['hero', 'primary', 'secondary', 'detail', 'fig-0'],
  },
  cards: { draw: () => <PostRenderer {...(CASES.cards as PostRendererProps)} />, slots: [] },
  report: { draw: () => <PostRenderer {...(CASES.report as PostRendererProps)} />, slots: [] },
  longform: {
    draw: (action) => <PostRenderer template="longform" post={LONGFORM_POST} renderPlateAction={action} />,
    slots: ['fig-1', 'fig-2-0'],
  },
  memo: {
    draw: (action) => (
      <PostRenderer
        template="memo"
        post={{ band: BAND, title: 'Bài', specs: [], sections: [] }}
        renderPlateAction={action}
      />
    ),
    slots: ['hero'],
  },
  bitesize: {
    draw: (action) => <PostRenderer template="bitesize" post={BITESIZE_POST} renderPlateAction={action} />,
    slots: ['hero', 'sub'],
  },
}

const cornerKeys = (root: HTMLElement) =>
  Array.from(root.querySelectorAll('[data-plate-corner]')).map((el) => el.getAttribute('data-plate-corner'))

describe('nút tải ảnh ở góc ô ảnh cố định', () => {
  it('kiểm kê đủ mọi template hệ thống nhận', () => {
    expect(Object.keys(PLATE_CASES).sort()).toEqual([...POST_TEMPLATES].sort())
  })

  for (const [name, { draw, slots }] of Object.entries(PLATE_CASES)) {
    it(`${name}: mỗi ô ảnh cố định có một nút`, () => {
      const { container } = render(<>{draw((slot) => <button>tải {slot.key}</button>)}</>)
      expect(cornerKeys(container).sort()).toEqual([...slots].sort())
    })

    /*
     * Trang công khai không truyền móc nào, nên nó phải vẽ ra đúng cái nó vẫn
     * vẽ. Chủ site đã chốt: bố cục bài đã xuất bản không đổi.
     */
    it(`${name}: trang công khai không có nút nào`, () => {
      const { container } = render(<>{draw()}</>)
      expect(cornerKeys(container)).toEqual([])
    })
  }
})
