/**
 * The words the addresses are spelled with.
 *
 * The shape of an address is code; the words in it are the owner's. `/ad-post`
 * can become `/admin-post` and `ghi-p260824` can become `ghi-bd240826` without
 * a deploy, because those are choices about naming — but nothing here can add
 * a piece to an address or change what a piece means. There is no slot for a
 * position, a counter or a query, so "thêm sort order vào slug" is not a thing
 * the form can express rather than a thing it refuses.
 */
export type DateOrder = 'yymmdd' | 'mmddyy' | 'ddmmyy'

export type RouteWords = {
  /** Tiền tố mọi trang quản trị: `/ad`, `/ad-post`… */
  admin: string
  post: string
  module: string
  index: string
  notes: string
  practice: string
  /** Bảy trang con của khu quản trị — phần đứng sau `ad-`. */
  adPost: string
  adSitemap: string
  adPageContent: string
  adDesignSystem: string
  adConvention: string
  adTemplate: string
  adArchive: string
  /** Ba động từ soạn bài: `/ad-post/edit=<slug>`. */
  create: string
  edit: string
  view: string
  /** Chữ đứng trước ngày trong slug: `ghi-p260824`. */
  postMark: string
  dateOrder: DateOrder
  /** Hậu tố bài nháp: `ghi-p260824.draft`. */
  draftMark: string
  /** Tên module hiện trong địa chỉ, thay cho mã trong cơ sở dữ liệu. */
  modules: Record<string, string>
}

export const DEFAULT_WORDS: RouteWords = {
  admin: 'ad',
  post: 'post',
  module: 'module',
  index: 'muc-luc',
  notes: 'ghi',
  practice: 'practice',
  adPost: 'post',
  adSitemap: 'sitemap',
  adPageContent: 'page-content',
  adDesignSystem: 'design-system',
  adConvention: 'convention',
  adTemplate: 'template',
  adArchive: 'archive',
  create: 'create',
  edit: 'edit',
  view: 'view',
  postMark: 'p',
  dateOrder: 'yymmdd',
  draftMark: 'draft',
  modules: { biochem: 'biochemistry', ghi01: 'ghi' },
}

export const DATE_ORDERS: DateOrder[] = ['yymmdd', 'mmddyy', 'ddmmyy']

/** Ô nào là chữ, và tên tiếng Việt của nó trong màn Sơ đồ trang. */
export const WORD_LABELS: Record<Exclude<keyof RouteWords, 'dateOrder' | 'modules'>, string> = {
  admin: 'Tên khu',
  post: 'Bài viết',
  module: 'Module',
  index: 'Mục lục',
  notes: 'Ghi 01',
  practice: 'Nhật ký',
  adPost: 'Tạo bài đăng',
  adSitemap: 'Sơ đồ trang',
  adPageContent: 'Sửa nội dung',
  adDesignSystem: 'Design system',
  adConvention: 'System conventions',
  adTemplate: 'Templates',
  adArchive: 'Archive',
  create: 'Tạo bài',
  edit: 'Sửa bài',
  view: 'Xem trước',
  postMark: 'Chữ trước ngày',
  draftMark: 'Dấu bài nháp',
}

const WORD_KEYS = Object.keys(WORD_LABELS) as (keyof typeof WORD_LABELS)[]

/**
 * Một từ hợp lệ.
 *
 * Chỉ chữ thường, số và gạch ngang. Cấm `/` `=` `.` và khoảng trắng vì chúng là
 * dấu ngăn của chính địa chỉ — cho một từ mang dấu ngăn thì cái từ ấy tự cắt
 * địa chỉ làm đôi.
 */
const SHAPE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * Những từ không đứng chung được với nhau.
 *
 * Hai trang cùng tên thì một trong hai không tới được — và cái không tới được
 * là cái người đọc đã có link. Nhóm nào phải khác nhau là do chỗ đứng của
 * chúng trong địa chỉ quyết định, không phải do sở thích.
 */
const MUST_DIFFER: (keyof RouteWords)[][] = [
  // Đoạn đầu địa chỉ: mọi trang công khai và khu quản trị nằm cùng một chỗ.
  ['admin', 'post', 'module', 'index', 'notes', 'practice'],
  // Bảy trang con đứng cùng một chỗ, ngay sau `ad-`.
  ['adPost', 'adSitemap', 'adPageContent', 'adDesignSystem', 'adConvention', 'adTemplate', 'adArchive'],
  // Ba động từ đứng cùng một chỗ, ngay sau `/ad-post/`.
  ['create', 'edit', 'view'],
]

export type WordErrors = Partial<Record<keyof RouteWords, string>>

/** Chỗ nào sai, và sai vì gì. Rỗng nghĩa là lưu được. */
export function checkWords(words: RouteWords): WordErrors {
  const out: WordErrors = {}

  for (const key of WORD_KEYS) {
    const v = (words[key] ?? '').trim()
    if (!v) out[key] = 'Không được để trống — một đoạn địa chỉ không thể là chuỗi rỗng.'
    else if (v.length > 24) out[key] = 'Dài quá 24 ký tự.'
    else if (!SHAPE.test(v)) out[key] = 'Chỉ chữ thường, số và gạch ngang. Không dấu, không khoảng trắng, không / = hay dấu chấm.'
  }

  for (const group of MUST_DIFFER) {
    const seen = new Map<string, keyof RouteWords>()
    for (const key of group) {
      const v = String(words[key] ?? '').trim()
      if (!v || out[key]) continue
      const first = seen.get(v)
      if (!first) {
        seen.set(v, key)
        continue
      }
      // Đánh dấu cả hai ô. Không biết chủ site vừa gõ ô nào, và nói "ô này
      // trùng ô kia" trong khi ô kia không hề sáng lên thì họ phải tự đi tìm.
      const label = (k: keyof RouteWords) => WORD_LABELS[k as keyof typeof WORD_LABELS]
      out[key] = `Trùng với "${label(first)}" — hai trang cùng tên thì một trong hai không mở được.`
      out[first] = `Trùng với "${label(key)}" — hai trang cùng tên thì một trong hai không mở được.`
    }
  }

  if (!DATE_ORDERS.includes(words.dateOrder)) out.dateOrder = 'Không phải một thứ tự ngày có thật.'

  const names = new Map<string, string>()
  for (const [id, name] of Object.entries(words.modules ?? {})) {
    const v = (name ?? '').trim()
    if (!v || !SHAPE.test(v)) { out.modules = `Tên module "${id}" không hợp lệ.`; break }
    if (names.has(v)) { out.modules = `Hai module cùng mang tên "${v}".`; break }
    names.set(v, id)
  }

  return out
}

/**
 * Hình dạng được lưu xuống: bộ từ đang dùng, kèm những bộ đã từng dùng.
 *
 * `past` không phải một ô trên biểu mẫu — nó do lúc lưu tự ghi thêm. Nó có mặt
 * để đổi tên không làm gãy link: một địa chỉ viết bằng bộ từ cũ vẫn đọc ra đúng
 * chỗ, rồi được viết lại bằng bộ từ mới.
 */
export type StoredRoutes = Partial<RouteWords> & { past?: Partial<RouteWords>[] }

/** Bản đã kiểm, hoà với bản mặc định — thiếu ô nào thì lấy ô mặc định. */
export function resolveWords(stored: Partial<RouteWords> | null | undefined): RouteWords {
  const merged: RouteWords = { ...DEFAULT_WORDS, ...(stored ?? {}) }
  merged.modules = { ...DEFAULT_WORDS.modules, ...(stored?.modules ?? {}) }
  // Một bản lưu hỏng không được làm sập cả trang: nó chỉ bị bỏ qua, và trang
  // chạy bằng bản mặc định như trước khi ai đó đổi tên.
  return Object.keys(checkWords(merged)).length === 0 ? merged : DEFAULT_WORDS
}

/*
 * Bộ từ đang dùng.
 *
 * Địa chỉ phải đọc được **trước** khi React chạy — `areaFromPath` chọn cổng vào
 * ngay lúc dựng app — mà bộ từ thì nằm dưới cơ sở dữ liệu, về sau một nhịp
 * mạng. Nên bản vừa dùng được cất trong `localStorage`: người đã ghé một lần
 * đọc đúng địa chỉ ngay từ nhịp đầu, và khi bản thật về mà khác thì địa chỉ
 * hiện tại được đọc lại một lần nữa.
 */
const CACHE_KEY = 'route_words'

function fromCache(): StoredRoutes | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as StoredRoutes) : null
  } catch {
    return null
  }
}

let stored: StoredRoutes | null = fromCache()
let active: RouteWords = resolveWords(stored)
let past: RouteWords[] = (stored?.past ?? []).map(resolveWords)

export const activeWords = (): RouteWords => active

/** Những bộ từ đã từng dùng — địa chỉ viết bằng chúng vẫn phải đọc được. */
export const pastWords = (): RouteWords[] => past

/** Đặt bộ từ đang dùng và nhớ lại cho lần tải sau. Trả về true nếu có đổi. */
export function adoptWords(next: StoredRoutes | null | undefined): boolean {
  const words = resolveWords(next)
  const changed = JSON.stringify(words) !== JSON.stringify(active)
  stored = next ?? null
  active = words
  past = (next?.past ?? []).map(resolveWords)
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(next ?? {}))
  } catch {
    // Trình duyệt chặn lưu thì thôi — lần tải sau đọc bằng bản mặc định rồi
    // được sửa lại khi bản thật về, chậm một nhịp chứ không sai.
  }
  return changed
}

/**
 * Bản sẽ lưu khi chủ site đổi từ: bộ mới, và bộ đang dùng đẩy vào `past`.
 *
 * Giữ tối đa năm bộ cũ. Đổi tên năm lần rồi thì cái tên đầu tiên coi như đã
 * chết, nhưng năm lần đổi tên đủ xa để nói rằng địa chỉ ấy không còn là địa chỉ
 * của trang này nữa.
 */
export function withHistory(next: RouteWords, current: RouteWords = active): StoredRoutes {
  const same = JSON.stringify(next) === JSON.stringify(current)
  const older = (stored?.past ?? []).filter((p) => JSON.stringify(resolveWords(p)) !== JSON.stringify(next))
  return same ? { ...next, past: stored?.past ?? [] } : { ...next, past: [current, ...older].slice(0, 5) }
}

/** Chỉ dùng trong test. */
export const resetWords = () => {
  stored = null
  active = DEFAULT_WORDS
  past = []
}
