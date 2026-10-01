/**
 * Blocks of a port page — each block is one design-system component (06.x).
 *
 * A block holds no posts. It holds *how to fetch posts* (`Source`), so a new
 * post published to the right module or tag shows up on the port page without
 * anyone editing it. The topbar (06.1) and footer (06.17) are not blocks:
 * every page has them.
 */

export type Source =
  | { mode: 'latest'; limit: number }
  | { mode: 'module'; moduleId: string; limit: number }
  | { mode: 'tag'; tag: string; limit: number }
  | { mode: 'pinned'; limit: number }
  | { mode: 'pick'; ids: string[] }

export type SourceMode = Source['mode']

export type Block =
  /** 06.2 branch page header. When empty, falls back to the page's title and intro. */
  | { id: string; type: 'head'; title: string; intro: string }
  /** 06.3 opener — A, B (three images) or C (two symmetric images). */
  | { id: string; type: 'opening'; variant: 'A' | 'B' | 'C'; text: string; source: Source }
  /** 06.4 post cards, in a 3- or 2-column grid. */
  | { id: string; type: 'cards'; label: string; cols: 2 | 3; source: Source }
  /** 06.5 slider — with arrows, or auto-scrolling left / right. */
  | { id: string; type: 'slider'; label: string; motion: 'arrow' | 'left' | 'right'; source: Source }
  /** 06.6 series block: a numbered list + two images in fibonacci cells. */
  | { id: string; type: 'series'; label: string; source: Source }
  /** 06.7 story block: an opening line, a narrative paragraph, two images along the horizontal axis. */
  | { id: string; type: 'story'; label: string; head: string; text: string; side: 'right' | 'left'; source: Source }
  /** 06.10 about block. */
  | { id: string; type: 'about'; head: string; text: string; image: string; links: { label: string; url: string }[] }

export type BlockType = Block['type']

export const BLOCK_NAMES: Record<BlockType, string> = {
  head: '06.2 đầu trang',
  opening: '06.3 mở đầu',
  cards: '06.4 thẻ bài',
  slider: '06.5 slider',
  series: '06.6 khối series',
  story: '06.7 kể chuyện',
  about: '06.10 khối about',
}

export const BLOCK_ORDER: BlockType[] = ['head', 'opening', 'cards', 'slider', 'series', 'story', 'about']

/** A real post — the columns Portfolio needs from `posts`. */
export type PortPost = {
  id: string
  module_id: string
  en: string
  vi: string
  lead: string | null
  kind: string
  date_label: string
  slug: string | null
  pinned: boolean
  hero_image_url: string | null
  published_at: string | null
}

const newestFirst = (a: PortPost, b: PortPost) =>
  (b.published_at ?? b.date_label).localeCompare(a.published_at ?? a.date_label)

/** The posts a block shows, in display order. Published posts only. */
export function resolvePosts(source: Source, posts: PortPost[]): PortPost[] {
  switch (source.mode) {
    case 'pick': {
      const byId = new Map(posts.map((p) => [p.id, p]))
      return source.ids.map((id) => byId.get(id)).filter((p): p is PortPost => !!p)
    }
    case 'module':
      return posts.filter((p) => p.module_id === source.moduleId).sort(newestFirst).slice(0, source.limit)
    case 'tag':
      return posts.filter((p) => p.kind === source.tag).sort(newestFirst).slice(0, source.limit)
    case 'pinned':
      return posts.filter((p) => p.pinned).sort(newestFirst).slice(0, source.limit)
    default:
      return [...posts].sort(newestFirst).slice(0, source.limit)
  }
}

let seq = 0
export const blockId = () => `b${Date.now().toString(36)}${(seq++).toString(36)}`

/** A new block with sensible starting values. */
export function newBlock(type: BlockType, firstModule = ''): Block {
  const id = blockId()
  const mod: Source = firstModule ? { mode: 'module', moduleId: firstModule, limit: 3 } : { mode: 'latest', limit: 3 }
  switch (type) {
    case 'head':
      return { id, type, title: '', intro: '' }
    case 'opening':
      return { id, type, variant: 'A', text: '', source: { mode: 'latest', limit: 3 } }
    case 'cards':
      return { id, type, label: '', cols: 3, source: { mode: 'latest', limit: 6 } }
    case 'slider':
      return { id, type, label: '', motion: 'arrow', source: { mode: 'latest', limit: 8 } }
    case 'series':
      return { id, type, label: '', source: mod }
    case 'story':
      return { id, type, label: '', head: '', text: '', side: 'right', source: mod }
    case 'about':
      return { id, type, head: '', text: '', image: '', links: [{ label: 'email', url: '' }, { label: 'linkedin', url: '' }, { label: 'cv', url: '' }] }
  }
}

export type PresetKey = 'bibi' | 'bibe' | 'blank'

/**
 * Two base presets, built from exactly the two approved orders, plus a blank
 * page. Modules are taken in database order, so the presets work with any set
 * of modules.
 */
export function preset(key: PresetKey, moduleIds: string[]): Block[] {
  const m = (i: number) => moduleIds[i % Math.max(moduleIds.length, 1)] ?? ''
  const series = (i: number, label = ''): Block => ({ id: blockId(), type: 'series', label, source: { mode: 'module', moduleId: m(i), limit: 3 } })
  const story = (i: number): Block => ({ id: blockId(), type: 'story', label: '', head: '', text: '', side: 'right', source: { mode: 'module', moduleId: m(i), limit: 3 } })
  const about = newBlock('about')
  if (key === 'bibi') {
    return [
      newBlock('head'),
      { id: blockId(), type: 'slider', label: 'featuring', motion: 'left', source: { mode: 'latest', limit: 8 } },
      { id: blockId(), type: 'slider', label: '', motion: 'right', source: { mode: 'pinned', limit: 8 } },
      series(0),
      story(1),
      { id: blockId(), type: 'slider', label: '', motion: 'arrow', source: { mode: 'latest', limit: 8 } },
      about,
    ]
  }
  if (key === 'bibe') {
    return [
      newBlock('head'),
      { id: blockId(), type: 'opening', variant: 'C', text: '', source: { mode: 'latest', limit: 2 } },
      story(0),
      { id: blockId(), type: 'slider', label: '', motion: 'arrow', source: { mode: 'latest', limit: 8 } },
      series(1),
      series(2),
      about,
    ]
  }
  return [newBlock('head')]
}

/** Read the block array from the database; skip anything unrecognised instead of breaking the page. */
export function parseBlocks(raw: unknown): Block[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (b): b is Block => !!b && typeof b === 'object' && typeof (b as Block).id === 'string' && BLOCK_ORDER.includes((b as Block).type),
  )
}
