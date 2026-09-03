/**
 * Site copy — every string on the public screens that the Content-management
 * screen can rewrite.
 *
 * The prototype keeps this in one `site` object with a `SITE_DEF` fallback
 * (`design/prototype/Coffee Study Blog v4.dc.html`, `SITE_DEF` / `sv()`): a
 * blank field falls back to the default rather than rendering an empty page.
 * We keep that contract — `siteValue()` below is `sv()` — and persist the
 * overrides in the `site_settings` row (see `data/useSiteCopy`).
 */

export type NavGroup = 'Public' | 'Practice' | 'Admin'

export type SiteCopy = {
  /** Index screen — the two-line masthead. */
  t1: string
  t2: string
  blurb: string
  /** Index variant B runs a shorter blurb than variant A. */
  blurbShort: string

  /** Landing screen. */
  lEyebrow: string
  /** The `ӕ` inside is rendered oversized and blush — see `splitAesc()`. */
  lTitle1: string
  lTitle2: string
  lIntro1: string
  lIntro2: string
  /** Prefix only: the post count and arrow are appended at render time. */
  lCta: string

  /** Design-system screen. */
  artT1: string
  artT2: string
  artIntro: string

  /** System-conventions screen. */
  logicTitle: string
  logicIntro: string

  /** Content-management screen. */
  cmsTitle: string
  cmsIntro: string

  /** Archive screen. */
  archiveTitle: string
  archiveNote: string

  /**
   * Trang Ghi chép — trang riêng của module Ghi 01.
   *
   * Năm dòng chữ này từng nằm cứng trong mã: chủ site mở khung sửa Ghi 01 chỉ
   * thấy tên module, màu và ảnh, còn tiêu đề trang, câu giới thiệu, dòng hướng
   * dẫn và lời kết thì không sửa được ở đâu cả.
   */
  notesTitle: string
  notesSubtitle: string
  notesIntro: string
  notesHint: string
  notesEnd: string
  notesEndNote: string

  /** Index screen's three opening plates — caption plus optional photo. */
  plate1: string
  plate2: string
  plate3: string
  plateImg1: string
  plateImg2: string
  plateImg3: string

  /** Sidebar section headings, renameable from the CMS site map. */
  sections: Record<NavGroup, string>
}

export const SITE_DEFAULTS: SiteCopy = {
  t1: 'A coffee study',
  t2: 'journal',
  blurb:
    'Ghi chép quá trình học về cà phê — chia theo module, mỗi module là một tập bài ngắn. Đọc theo thứ tự hoặc nhặt bất kỳ đâu.',
  blurbShort:
    'Ghi chép quá trình học về cà phê — chia theo module, mỗi module là một tập bài ngắn.',

  lEyebrow: 'coffee study journal — 2024 / 2026',
  lTitle1: 'beӕn weirdo',
  lTitle2: '#viettatlahkd',
  lIntro1:
    'Mỗi thứ học được đều bị viết lại thành một ghi chú ngắn, xếp vào một module. Ba module đang mở: giác quan, hoá sinh, rang. Bài mới nhất luôn nằm trên cùng của module tương ứng.',
  lIntro2:
    'Không có bài nào ở đây là kết luận. Phần lớn là ghi chép giữa đường: đọc được gì, thử gì, sai ở đâu. Mục "còn chưa rõ" ở cuối mỗi bài thường là phần đáng đọc nhất.',
  lCta: 'xem mục lục',

  artT1: 'Garden colours,',
  artT2: 'quiet paper',
  artIntro:
    'Bảng màu lấy từ vườn hơn là từ màn hình: hồng cánh hoa, xanh lá non, mơ chín, xanh trời nhạt. Đủ tươi để thấy vui, đủ dịu để đọc lâu. Nền kem giữ nhịp; mỗi module sở hữu một mảng màu lớn của riêng nó.',

  logicTitle: 'System conventions',
  logicIntro:
    'Chia ba phần: quy tắc thị giác, quy tắc thao tác, và quy tắc riêng của từng template. Mỗi dòng có dấu cho biết phạm vi áp dụng.',

  cmsTitle: 'Content',
  cmsIntro: 'Sơ đồ toàn bộ trang và khu vực biên tập nội dung.',

  archiveTitle: 'Archive',
  archiveNote: 'sắp theo thời gian',

  notesTitle: 'Notes',
  notesSubtitle: 'ghi chép rời — không thuộc module nào',
  notesIntro:
    'Một quan sát vật lý trong bếp, một đoạn video không tiếng, một ý nghĩ bắc cầu giữa hai lĩnh vực.',
  notesHint: 'Bấm vào bài để xổ toàn bộ nội dung · bấm ra ngoài để thu lại',
  notesEnd: 'Hết phần đã ghi.',
  notesEndNote: 'Ghi chép mới sẽ chèn lên đầu trang.',

  plate1: 'ảnh mở đầu — vật thể đơn',
  plate2: 'mặt cắt',
  plate3: 'dải rang',
  plateImg1: '',
  plateImg2: '',
  plateImg3: '',

  sections: { Public: 'Public', Practice: 'Practice', Admin: 'Admin' },
}

/** Stored overrides: any subset of `SiteCopy`, blank-as-unset. */
export type SiteOverrides = Partial<Omit<SiteCopy, 'sections'>> & {
  sections?: Partial<Record<NavGroup, string>>
}

/**
 * Chữ đang dùng cho một trường: bản chủ site đặt, hoặc bản mặc định khi **chưa
 * từng đặt**.
 *
 * `''` là một lựa chọn, không phải "chưa đặt". Coi rỗng là chưa đặt nghĩa là
 * xoá trắng một ô không làm được: xoá xong, trang lấy lại bản mặc định.
 *
 * Luật này từng nằm ở **ba nơi** — hàm này, phép hoà riêng trong màn CMS, và
 * cách máy chủ gộp bản vá — nên sửa một chỗ thì hai chỗ kia vẫn nói ngược lại.
 * Nay chỉ còn ở đây; màn CMS đọc qua hàm này, máy chủ chỉ xoá khoá khi nhận
 * `null`. Muốn lấy lại bản mặc định thì gửi `null`, không phải chuỗi rỗng.
 */
export function siteValue<K extends keyof SiteCopy>(
  overrides: SiteOverrides | null | undefined,
  key: K,
): SiteCopy[K] {
  if (key === 'sections') {
    const stored = overrides?.sections ?? {}
    const merged = { ...SITE_DEFAULTS.sections } as Record<NavGroup, string>
    for (const k of Object.keys(stored) as NavGroup[]) {
      const v = stored[k]
      if (v !== undefined && v !== null) merged[k] = v
    }
    return merged as SiteCopy[K]
  }
  const v = (overrides as Record<string, unknown> | null | undefined)?.[key as string]
  return (v === undefined || v === null ? SITE_DEFAULTS[key] : v) as SiteCopy[K]
}

/** Whole resolved object — what screens actually read. */
export function resolveSite(overrides: SiteOverrides | null | undefined): SiteCopy {
  const out = {} as SiteCopy
  for (const key of Object.keys(SITE_DEFAULTS) as (keyof SiteCopy)[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(out as any)[key] = siteValue(overrides, key)
  }
  return out
}

/**
 * Split a title around its first `ӕ` so the ligature can be rendered oversized
 * and blush while the rest stays in the heading's own colour. Titles without
 * one come back with an empty middle and render unchanged.
 */
export function splitAesc(title: string): { pre: string; ae: string; post: string } {
  const i = title.indexOf('ӕ')
  if (i < 0) return { pre: title, ae: '', post: '' }
  return { pre: title.slice(0, i), ae: 'ӕ', post: title.slice(i + 1) }
}
