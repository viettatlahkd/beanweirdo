/**
 * Thân bài thành một dải markdown liền mạch.
 *
 * Chủ site: *"cho nó thành liền mạch đi, không quan trọng khối hay không đâu,
 * cứ edit text văn bản rồi preview bạn xếp nó vào khối nếu cần sau"*. Muốn
 * thế thì phải có chiều ngược lại của `pastedToBlocks`: khối → chữ.
 *
 * Đây cũng là chỗ nói thật về **cái gì markdown không đựng được**. Một cái
 * bảng ra được markdown, nhưng bề rộng cột thì không; một biểu đồ thì không
 * có ký hiệu nào cả. Hàm này không giả vờ: thứ nào không viết ra được thì nó
 * báo tên ra ở `lost`, để chỗ gọi quyết định thay vì âm thầm nuốt mất.
 */
import { runsToText, type Run } from './runs'
import type { StoredElement } from './read'

export type Written = {
  /** Cả thân bài, một dải markdown. */
  text: string
  /** Tên những element không viết ra markdown được mà không mất gì. */
  lost: string[]
}

const HASHES = ['#', '##', '###']

type ListLike = { ordered?: boolean; items?: Item[] }
type Item = { runs?: Run[]; sub?: string[]; children?: Item[] }

function listLines(list: ListLike, depth = 0): string[] {
  return (list.items ?? []).flatMap((item, i) => {
    const pad = '  '.repeat(depth)
    const marker = list.ordered && depth === 0 ? `${i + 1}.` : '-'
    return [
      `${pad}${marker} ${runsToText(item.runs)}`,
      // Dòng chìm không có ký hiệu markdown riêng; thụt thêm một tầng là cách
      // gần nhất, và đọc ngược lại nó thành mục con chứ không thành dòng chìm.
      ...(item.sub ?? []).map((line) => `${pad}  ${line}`),
      ...listLines({ items: item.children }, depth + 1),
    ]
  })
}

function tableLines(table: { columns?: string[]; rows?: { cells?: string[] }[] }): string[] {
  const head = table.columns ?? []
  if (head.length === 0) return []
  const row = (cells: string[]) => `| ${cells.join(' | ')} |`
  return [row(head), `|${head.map(() => '---').join('|')}|`, ...(table.rows ?? []).map((r) => row(r.cells ?? []))]
}

/**
 * Một element thành mấy dòng markdown, hoặc `null` khi markdown không đựng nổi.
 */
function lines(block: StoredElement): string[] | null {
  const text = String((block as { text?: string }).text ?? '')
  switch (block.type) {
    case 'paragraph':
      return [text]
    case 'heading':
      return [`${HASHES[Math.min(3, Number((block as { level?: number }).level ?? 1)) - 1]} ${text}`]
    case 'quote':
      return text.split('\n').map((l) => `> ${l}`)
    case 'list':
      return listLines(block as ListLike)
    case 'table':
      return tableLines((block as { table?: { columns?: string[]; rows?: { cells?: string[] }[] } }).table ?? {})
    case 'image': {
      const src = (block as { imageUrl?: string | null }).imageUrl ?? ''
      const caption = String((block as { caption?: string }).caption ?? '')
      return [`![${caption}](${src})`]
    }
    /*
     * Từ đây xuống là những thứ markdown **không** có ký hiệu.
     *
     * `meta` là một dòng nhãn in hoa — viết ra thành đoạn văn thì đọc ngược
     * lại nó thành đoạn văn, tức là mất kiểu. `callout` cũng vậy. `metrics`
     * và `chart` thì không có gì gần đúng để mà mất kiểu.
     */
    default:
      return null
  }
}

export function bodyToMarkdown(blocks: StoredElement[]): Written {
  const out: string[] = []
  const lost: string[] = []
  for (const block of blocks) {
    // Ghi chú cạnh bài không nằm trong dòng chảy nên không thuộc dải chữ này.
    if (block.type === 'notes') continue
    const drawn = lines(block)
    if (drawn === null) {
      lost.push(block.type)
      continue
    }
    if (out.length > 0) out.push('')
    out.push(...drawn)
  }
  return { text: out.join('\n'), lost }
}
