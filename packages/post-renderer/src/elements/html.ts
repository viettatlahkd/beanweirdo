/**
 * Cái Notion đặt lên clipboard, đọc về markdown.
 *
 * Clipboard mang hai bản của cùng một đoạn: `text/plain` và `text/html`. Bản
 * chữ thuần là bản an toàn nhưng **mất định dạng** — Notion, Lark và Docs đều
 * bỏ đậm và bỏ link khi viết bản ấy, nên dán một đoạn có ba chữ đậm và hai
 * link về chỉ còn chữ trơn. Bản HTML thì giữ đủ, nhưng dán thẳng vào một ô
 * `contentEditable` là mang cả thẻ lẫn style của trang nguồn sang.
 *
 * Nên đọc bản HTML, và dịch nó về **markdown** — đúng ký hiệu mà mọi chỗ khác
 * trong màn soạn đã dùng. Định dạng sống sót, style của trang nguồn thì không.
 * Cái gì kho element không có thì mất ký hiệu chứ không mất chữ.
 */

/** Thẻ khối: mỗi cái đứng riêng một dòng, không dính vào dòng trước. */
const BLOCK = new Set([
  'ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'DIV', 'DL', 'DT', 'DD', 'FIGCAPTION',
  'FIGURE', 'FOOTER', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HEADER', 'HR', 'LI',
  'MAIN', 'NAV', 'OL', 'P', 'PRE', 'SECTION', 'TABLE', 'TR', 'UL',
])

const HEADING_HASHES: Record<string, string> = {
  H1: '#', H2: '##', H3: '###', H4: '####', H5: '#####', H6: '######',
}

/*
 * Không thoát dấu markdown nằm sẵn trong chữ nguồn.
 *
 * Thoát bằng `\*` chỉ đúng nếu bên đọc hiểu dấu gạch chéo, mà `textToRuns`
 * thì không — nó sẽ vẽ ra đúng cái gạch chéo ấy cho người đọc thấy. Đổi lại,
 * dấu nhấn chỉ bám ở ranh giới từ và phải có đôi, nên `2 * 3` hay
 * `snake_case` đi qua nguyên vẹn.
 */

function isEmpty(el: Element): boolean {
  return (el.textContent ?? '').trim() === ''
}

/** Bảng thành bảng markdown, để `pastedToBlocks` đọc lại được thành element bảng. */
function tableToMarkdown(table: Element, inline: (el: Element) => string): string {
  const rows = Array.from(table.querySelectorAll('tr'))
  if (rows.length === 0) return ''
  const cellsOf = (tr: Element) => Array.from(tr.children).map((c) => inline(c).replace(/\|/g, '\\|').trim())

  const head = cellsOf(rows[0])
  // Không có `th` thì hàng đầu vẫn làm tiêu đề cột: bảng markdown bắt buộc có
  // một hàng tiêu đề, và bỏ hàng đầu đi là mất chữ.
  const body = rows.slice(1).map(cellsOf)
  const line = (cells: string[]) => `| ${cells.join(' | ')} |`
  return [line(head), `|${head.map(() => '---').join('|')}|`, ...body.map(line)].join('\n')
}

export function htmlToMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')

  /** Chữ trong một thẻ, kèm những dấu định dạng nằm bên trong nó. */
  function inline(node: Node): string {
    if (node.nodeType === 3) {
      // Xuống dòng trong HTML nguồn chỉ là cách họ xếp mã, không phải ngắt dòng.
      return (node.nodeValue ?? '').replace(/\s+/g, ' ')
    }
    if (node.nodeType !== 1) return ''
    const el = node as Element
    const inner = Array.from(el.childNodes).map(inline).join('')

    switch (el.tagName) {
      case 'BR':
        return '\n'
      case 'STRONG':
      case 'B':
      case 'EM':
      case 'I':
        // Design chỉ có **một** mức nhấn, nên đậm và nghiêng về cùng một dấu.
        // Vẽ hai mức khác nhau ở đây là hứa một thứ template không có.
        return inner.trim() === '' ? inner : `**${inner}**`
      case 'U':
        return inner.trim() === '' ? inner : `_${inner}_`
      case 'A': {
        const href = el.getAttribute('href') ?? ''
        if (!href || inner.trim() === '') return inner
        return `[${inner}](${href})`
      }
      case 'IMG':
        return `![${el.getAttribute('alt') ?? ''}](${el.getAttribute('src') ?? ''})`
      case 'CODE':
      case 'KBD':
      case 'SAMP':
        // Không có element nào cho chữ mã trong dòng: bỏ dấu, giữ chữ.
        return inner
      default:
        return inner
    }
  }

  /** Các khối, mỗi khối một dòng markdown. */
  function block(el: Element, depth: number): string[] {
    switch (el.tagName) {
      case 'HR':
        return ['---']
      case 'H1':
      case 'H2':
      case 'H3':
      case 'H4':
      case 'H5':
      case 'H6':
        return isEmpty(el) ? [] : [`${HEADING_HASHES[el.tagName]} ${inline(el).trim()}`]
      case 'BLOCKQUOTE':
        return inline(el)
          .split('\n')
          .filter((l) => l.trim() !== '')
          .map((l) => `> ${l.trim()}`)
      case 'TABLE': {
        const drawn = tableToMarkdown(el, inline)
        return drawn ? [drawn] : []
      }
      case 'UL':
      case 'OL': {
        const out: string[] = []
        let n = 0
        for (const li of Array.from(el.children).filter((c) => c.tagName === 'LI')) {
          n += 1
          const marker = el.tagName === 'OL' ? `${n}.` : '-'
          const pad = '  '.repeat(depth)
          // Chữ của mục, không kể danh sách con lồng trong nó.
          const own = Array.from(li.childNodes)
            .filter((c) => !(c.nodeType === 1 && ((c as Element).tagName === 'UL' || (c as Element).tagName === 'OL')))
            .map(inline)
            .join('')
            .trim()
          if (own !== '') out.push(`${pad}${marker} ${own}`)
          for (const nested of Array.from(li.children).filter((c) => c.tagName === 'UL' || c.tagName === 'OL')) {
            out.push(...block(nested, depth + 1))
          }
        }
        return out
      }
      case 'PRE':
        return isEmpty(el) ? [] : ['```', ...(el.textContent ?? '').split('\n'), '```']
      default: {
        /*
         * Notion bọc mọi thứ trong `div`. Một `div` chỉ chứa các khối khác thì
         * không phải một đoạn văn — coi nó là đoạn văn sẽ nối cả trang thành
         * một dòng.
         */
        const kids = Array.from(el.children)
        if (kids.length > 0 && kids.every((c) => BLOCK.has(c.tagName))) {
          return kids.flatMap((c) => block(c, depth))
        }
        const drawn = inline(el).trim()
        return drawn === '' ? [] : drawn.split('\n').filter((l) => l.trim() !== '')
      }
    }
  }

  const body = doc.body
  const top = Array.from(body.children)
  const lines =
    top.length > 0 && top.every((c) => BLOCK.has(c.tagName))
      ? top.flatMap((c) => block(c, 0))
      : block(body, 0)

  // Dòng trống giữa các khối, để `pastedToBlocks` ngắt đoạn đúng chỗ. Mục của
  // cùng một danh sách thì không — dòng trống giữa chúng là cắt danh sách ra.
  const out: string[] = []
  let prevList = false
  for (const line of lines) {
    const list = /^\s*([-*+]|\d+[.)])\s/.test(line)
    if (out.length > 0 && !(list && prevList)) out.push('')
    out.push(line)
    prevList = list
  }
  return out.join('\n')
}
