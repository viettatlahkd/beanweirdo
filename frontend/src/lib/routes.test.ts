import { describe, expect, it } from 'vitest'
import { moduleToUrl, parsePath, toPath, type Where } from './routes'

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
  { area: 'admin', screen: 'cms', tab: 'map' },
  { area: 'admin', screen: 'cms', tab: 'content' },
  { area: 'admin', screen: 'art' },
  { area: 'admin', screen: 'logic' },
  { area: 'admin', screen: 'archive' },
  { area: 'admin', screen: 'templates' },
  { area: 'admin', screen: 'templates', templateId: '81eac6fd' },
  { area: 'admin', screen: 'postNew' },
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
      if (where.templateId) expect(back.templateId).toBe(where.templateId)
      if (where.from) expect(back.from).toBe(where.from)
    })
  }
})

describe('routes — tên trong địa chỉ', () => {
  it('spells out the module ids that are abbreviated in the database', () => {
    // `biochem` là tên cột, `biochemistry` là tên người đọc thấy.
    expect(toPath({ area: 'public', screen: 'module', moduleId: 'biochem' })).toBe('/module/biochemistry')
    expect(toPath({ area: 'public', screen: 'module', moduleId: 'ghi01' })).toBe('/module/ghi')
    expect(moduleToUrl('sensory')).toBe('sensory')
  })

  it('reads an abbreviated name back to its database id', () => {
    expect(parsePath('/module/biochemistry').moduleId).toBe('biochem')
    expect(parsePath('/module/ghi').moduleId).toBe('ghi01')
    expect(parsePath('/module/roasting').moduleId).toBe('roasting')
  })

  it('puts the verb and its object in one step', () => {
    // `edit=<slug>`, không phải `edit/<slug>`: cắt nửa địa chỉ thì không còn
    // ra một nghĩa nào khác.
    expect(toPath({ area: 'admin', screen: 'postEdit', slug: 'ghi-p260818' })).toBe('/ad-post/edit=ghi-p260818')
    expect(parsePath('/ad-post/view=ghi-p260818')).toMatchObject({ screen: 'postPreview', slug: 'ghi-p260818' })
  })

  it('lets a new post have no slug yet', () => {
    // Lúc chọn khung và đặt tên thì bài chưa tồn tại, nên chưa có ngày tạo.
    expect(toPath({ area: 'admin', screen: 'postNew' })).toBe('/ad-post/create')
    expect(parsePath('/ad-post/create')).toMatchObject({ screen: 'postNew', slug: undefined })
  })

  it('opens each Content management tab at its own address', () => {
    for (const p of ['/ad-post', '/ad-sitemap', '/ad-page-content', '/ad']) {
      expect(parsePath(p).screen, p).toBe('cms')
    }
    expect(parsePath('/ad-sitemap').tab).toBe('map')
    expect(parsePath('/ad-page-content').tab).toBe('content')
    // `/ad` names the screen and not a tab, so it opens on the first one
    // without rewriting itself to another address on arrival.
    expect(parsePath('/ad').tab).toBeUndefined()
  })
})

describe('routes — địa chỉ lạ', () => {
  it('lands a wrong turn on the front page rather than an error', () => {
    // Gõ sai địa chỉ là người đọc rẽ nhầm, không phải sự cố để báo.
    expect(parsePath('/khong-co-trang-nay')).toMatchObject({ area: 'public', screen: 'landing' })
    expect(parsePath('/module')).toMatchObject({ screen: 'landing' })
    expect(parsePath('/post')).toMatchObject({ screen: 'landing' })
  })

  it('keeps an unknown admin address inside admin', () => {
    // Sai đường trong khu riêng thì vẫn ở khu riêng — rơi ra trang công khai
    // là đổi cả khu vực, xa hơn nhiều so với một lần gõ nhầm.
    expect(parsePath('/ad-khong-co')).toMatchObject({ area: 'admin', screen: 'cms' })
    expect(parsePath('/ad-post/xoa=abc')).toMatchObject({ area: 'admin', screen: 'cms' })
  })

  it('carries the door only when it is not the usual one', () => {
    expect(toPath({ area: 'public', screen: 'article', slug: 's-p260817', from: 'module' })).toBe('/post/s-p260817')
    expect(toPath({ area: 'public', screen: 'article', slug: 's-p260817', from: 'archive' }))
      .toBe('/post/s-p260817?from=archive')
    // Không nói gì thì mặc định là cửa module.
    expect(parsePath('/post/s-p260817').from).toBe('module')
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
