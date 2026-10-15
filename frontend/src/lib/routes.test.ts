import { describe, expect, it } from 'vitest'
import { moduleToUrl, parsePath, portPagePath, toPath, type Where } from './routes'

/*
 * Đọc và ghi là cùng một bảng đọc theo hai chiều. Nếu một địa chỉ tạo ra được
 * mà đọc lại không ra chỗ cũ thì nút back sẽ đưa người dùng tới một nơi khác
 * với nơi họ vừa rời — lỗi khó thấy nhất trong cả bộ này.
 */
const ROUNDTRIP: Where[] = [
  { area: 'public', screen: 'landing' },
  { area: 'public', screen: 'home' },
  { area: 'public', screen: 'notes' },
  { area: 'public', screen: 'module', moduleId: 'sensory' },
  { area: 'public', screen: 'module', moduleId: 'biochem' },
  { area: 'public', screen: 'module', moduleId: 'ghi01' },
  { area: 'public', screen: 'article', slug: 'sensory-p260817', from: 'module' },
  { area: 'public', screen: 'article', slug: 'ghi-p260824.draft', from: 'archive' },
  { area: 'practice', screen: 'hours' },
  { area: 'admin', screen: 'cms' },
  { area: 'admin', screen: 'cms', tab: 'posts' },
  { area: 'admin', screen: 'cms', tab: 'pages' },
  { area: 'admin', screen: 'cms', tab: 'display' },
  { area: 'admin', screen: 'cms', tab: 'authors' },
  { area: 'public', screen: 'module', moduleId: 'tag-heat' },
  { area: 'admin', screen: 'archive' },
  { area: 'admin', screen: 'postEdit', slug: 'biochemistry-p260817' },
  { area: 'admin', screen: 'postPreview', slug: 'biochemistry-p260817' },
]

describe('routes — đi một vòng rồi về đúng chỗ cũ', () => {
  for (const where of ROUNDTRIP) {
    const path = toPath(where)
    it(`${path}`, () => {
      const [p, q = ''] = path.split('?')
      const back = parsePath(p, q)

      expect(back.area).toBe(where.area)
      expect(back.screen).toBe(where.screen)
      if (where.moduleId) expect(back.moduleId).toBe(where.moduleId)
      if (where.slug) expect(back.slug).toBe(where.slug)
      if (where.from) expect(back.from).toBe(where.from)
    })
  }
})

describe('routes — tên trong địa chỉ', () => {
  it('spells out the module ids that are abbreviated in the database', () => {
    // `biochem` là tên cột, `biochemistry` là tên người đọc thấy.
    expect(toPath({ area: 'public', screen: 'module', moduleId: 'biochem' })).toBe('/journal/module/biochemistry')
    expect(toPath({ area: 'public', screen: 'module', moduleId: 'ghi01' })).toBe('/journal/module/ghi')
    expect(moduleToUrl('sensory')).toBe('sensory')
  })

  it('reads an abbreviated name back to its database id', () => {
    expect(parsePath('/bean/module/biochemistry').moduleId).toBe('biochem')
    expect(parsePath('/bean/module/ghi').moduleId).toBe('ghi01')
    expect(parsePath('/bean/module/roasting').moduleId).toBe('roasting')
  })

  it('puts the verb and its object in one step', () => {
    // `edit=<slug>`, không phải `edit/<slug>`: cắt nửa địa chỉ thì không còn
    // ra một nghĩa nào khác.
    expect(toPath({ area: 'admin', screen: 'postEdit', slug: 'ghi-p260818' })).toBe('/ad-post/edit=ghi-p260818')
    expect(parsePath('/ad-post/view=ghi-p260818')).toMatchObject({ screen: 'postPreview', slug: 'ghi-p260818' })
  })

  it('đưa địa chỉ tạo bài cũ về danh sách bài', () => {
    /*
     * `/ad-post/create` từng là một trang riêng. Nay việc ấy là một hộp thoại
     * mở ngay trên danh sách, nên địa chỉ đó không còn trỏ vào đâu — và một
     * bookmark cũ phải rơi vào danh sách bài, chỗ gần nhất với thứ nó từng mở,
     * chứ không rơi ra trang công khai.
     */
    expect(parsePath('/ad-post/create')).toMatchObject({ area: 'admin', screen: 'cms', tab: 'posts' })
  })

  it('opens each Content management tab at its own address', () => {
    for (const p of ['/ad-post', '/ad-config', '/ad-sitemap', '/ad-page-content', '/ad-taxonomy', '/ad-display', '/ad-authors', '/ad']) {
      expect(parsePath(p).screen, p).toBe('cms')
    }
    expect(parsePath('/ad-sitemap').tab).toBe('pages')
    // Cấu hình and Nội dung trang folded into Quản lý trang; their old addresses still land there.
    expect(parsePath('/ad-config').tab).toBe('pages')
    expect(parsePath('/ad-page-content').tab).toBe('pages')
    // Phân loại folded into Nội dung; its old address still lands there.
    expect(parsePath('/ad-taxonomy').tab).toBe('posts')
    expect(parsePath('/ad-display').tab).toBe('display')
    expect(parsePath('/ad-authors').tab).toBe('authors')
    // Quản lý trang and Cấu hình are one tab, written at /ad-cau-hinh; the old address still reads.
    expect(parsePath('/ad-cau-hinh')).toMatchObject({ area: 'admin', screen: 'cms', tab: 'pages' })
    expect(toPath({ area: 'admin', screen: 'cms', tab: 'pages' })).toBe('/ad-cau-hinh')
    expect(toPath({ area: 'public', screen: 'module', moduleId: 'tag-heat' })).toBe('/journal/tag/heat')
    // `/ad` names the screen and not a tab, so it opens on the first one
    // without rewriting itself to another address on arrival.
    expect(parsePath('/ad').tab).toBeUndefined()
  })
})

describe('routes — địa chỉ lạ', () => {
  it('reads a one-word address as a port page, which says so when it does not exist', () => {
    // Trang port nằm ngay ở gốc, nên một chữ lạ là slug của một trang port —
    // không có trang ấy thì màn port nói "không có trang này".
    expect(parsePath('/khong-co-trang-nay')).toMatchObject({ area: 'public', screen: 'portfolioPage', slug: 'khong-co-trang-nay' })
    expect(parsePath('/module')).toMatchObject({ screen: 'portfolioPage' })
    expect(parsePath('/bean/khong-co')).toMatchObject({ screen: 'portfolioPage', slug: 'khong-co', site: 'bean' })
  })

  it('keeps an unknown admin address inside admin', () => {
    // Sai đường trong khu riêng thì vẫn ở khu riêng — rơi ra trang công khai
    // là đổi cả khu vực, xa hơn nhiều so với một lần gõ nhầm.
    expect(parsePath('/ad-khong-co')).toMatchObject({ area: 'admin', screen: 'cms' })
    expect(parsePath('/ad-post/xoa=abc')).toMatchObject({ area: 'admin', screen: 'cms' })
  })

  it('carries the door only when it is not the usual one', () => {
    expect(toPath({ area: 'public', screen: 'article', slug: 's-p260817', from: 'module' })).toBe('/p/s-p260817')
    expect(toPath({ area: 'public', screen: 'article', slug: 's-p260817', from: 'archive' }))
      .toBe('/p/s-p260817?from=archive')
    expect(parsePath('/p/s-p260817', '?from=biz')).toMatchObject({ screen: 'article', slug: 's-p260817', from: 'biz' })
    // Không nói gì, hay nói một cửa lạ, thì mặc định là cửa module.
    expect(parsePath('/bean/post/s-p260817').from).toBe('module')
    expect(parsePath('/p/s-p260817', '?from=xyz').from).toBe('module')
  })
})

describe('routes — địa chỉ cũ', () => {
  it('still reads the address the back office used to live at', () => {
    // Dấu trang cũ phải mở ra đúng chỗ nó vẫn mở; chỉ có điều không ai tạo ra
    // địa chỉ ấy nữa nên nó tự viết lại thành /ad khi tới nơi.
    expect(parsePath('/admin')).toMatchObject({ area: 'admin', screen: 'cms' })
    expect(toPath({ area: 'admin', screen: 'cms' })).toBe('/ad')
  })

  it('still opens a post from the editor\u2019s old preview link', () => {
    expect(parsePath('/admin', '?preview=abc')).toMatchObject({ screen: 'postPreview', slug: 'abc' })
  })
})

describe('routes — cây site: beanweirdo ở gốc, biz dưới /biz, bean dưới /bean, journal dưới /journal', () => {
  it('đặt từng trang vào chỗ mới của nó', () => {
    expect(toPath({ area: 'public', screen: 'portfolioHome' })).toBe('/')
    expect(toPath({ area: 'public', screen: 'portfolioAbout' })).toBe('/about')
    expect(toPath({ area: 'public', screen: 'portfolioPage', site: 'biz' })).toBe('/biz')
    expect(toPath({ area: 'public', screen: 'portfolioPage', site: 'bean' })).toBe('/bean')
    expect(toPath({ area: 'public', screen: 'portfolioPage', slug: 'business' })).toBe('/biz/business')
    expect(toPath({ area: 'public', screen: 'landing' })).toBe('/journal')
    expect(toPath({ area: 'public', screen: 'home' })).toBe('/journal/muc-luc')
    expect(toPath({ area: 'public', screen: 'notes' })).toBe('/journal/ghi')
  })

  it('đọc lại đúng các địa chỉ mới', () => {
    expect(parsePath('/')).toMatchObject({ area: 'public', screen: 'portfolioHome' })
    expect(parsePath('/about')).toMatchObject({ screen: 'portfolioAbout' })
    expect(parsePath('/biz')).toMatchObject({ screen: 'portfolioPage', site: 'biz' })
    expect(parsePath('/biz/business')).toMatchObject({ screen: 'portfolioPage', slug: 'business' })
    expect(parsePath('/bean')).toMatchObject({ screen: 'portfolioPage', site: 'bean' })
    expect(parsePath('/journal')).toMatchObject({ screen: 'landing' })
    // The owner keeps no alias for a renamed address: the old prefix is just an unknown page.
    expect(parsePath('/personal-blog')).toMatchObject({ screen: 'portfolioPage', slug: 'personal-blog' })
    expect(parsePath('/p/x-p260817')).toMatchObject({ screen: 'article', slug: 'x-p260817' })
    expect(parsePath('/bean/roasting')).toMatchObject({ screen: 'portfolioPage', slug: 'roasting', site: 'bean' })
    expect(toPath(parsePath('/bean/roasting'))).toBe('/bean/roasting')
  })

  it('đặt trang của bean dưới /bean, trang của biz dưới /biz, theo trang chủ nó nằm dưới', () => {
    const pages = [
      { id: 'b', slug: 'been-hkd', home_of: 'bean' as const, parent_id: null },
      { id: 'r', slug: 'roasting', parent_id: 'b' },
      { id: 'r2', slug: 'light', parent_id: 'r' },
      { id: 'x', slug: 'business', parent_id: null },
    ]
    expect(portPagePath(pages[0], pages)).toBe('/bean')
    expect(portPagePath(pages[1], pages)).toBe('/bean/roasting')
    expect(portPagePath(pages[2], pages)).toBe('/bean/light')
    expect(portPagePath(pages[3], pages)).toBe('/biz/business')
  })

  it('link cũ vẫn mở ra đúng trang, rồi được viết lại bằng địa chỉ mới', () => {
    // Bài đã chia sẻ, bookmark cũ: đổi chỗ không được làm chết link nào.
    const old: [string, string][] = [
      ['/portfolio', '/'],
      ['/portfolio/about', '/about'],
      ['/portfolio/business', '/biz/business'],
      // biz's pages sat at the root until 2026-10-14.
      ['/business', '/biz/business'],
      ['/muc-luc', '/journal/muc-luc'],
      ['/ghi', '/journal/ghi'],
      ['/module/biochemistry', '/journal/module/biochemistry'],
      ['/tag/heat', '/journal/tag/heat'],
      ['/post/sensory-p260817', '/p/sensory-p260817'],
      // A post's page left the blog on 2026-10-15: it is shown on biz and bean too.
      ['/journal/post/sensory-p260817', '/p/sensory-p260817'],
      // The blog sat under bean until 2026-10-15.
      ['/bean/details', '/journal'],
      ['/bean/muc-luc', '/journal/muc-luc'],
      ['/bean/post/sensory-p260817', '/p/sensory-p260817'],
    ]
    for (const [from, to] of old) expect(toPath(parsePath(from)), from).toBe(to)
  })

  it('details chỉ có nghĩa dưới /bean', () => {
    // Ở gốc nó chưa từng là một địa chỉ, nên nó là slug như mọi chữ khác.
    expect(parsePath('/details')).toMatchObject({ screen: 'portfolioPage', slug: 'details' })
  })
})
