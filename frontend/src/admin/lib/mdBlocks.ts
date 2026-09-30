/**
 * Markdown của một dải, cắt ra đúng những khối mặt soạn **vẽ ra**.
 *
 * Nút `+` chèn vào chỗ con trỏ đang đứng, mà chỗ ấy chỉ biết được bằng một
 * con số: khối thứ mấy trong mặt soạn. Trước 2026-09-21 con số ấy đem cộng
 * thẳng vào chỉ số khối trong kho — và hai thứ đó không khớp nhau:
 *
 * - article: một `section` vẽ ra **hai** khối (`## tiêu đề` rồi đoạn văn), nên
 *   con trỏ ở khối thứ ba của một dải hai phần cho ra chỉ số 4, tức rơi ra
 *   ngoài dải, xuống tận cuối bài. Đúng cái chủ site thấy.
 * - longform: cả dải nối bằng **một** dấu xuống dòng, nên năm đoạn văn vẽ ra
 *   *một* khối; con số luôn là 0 và khối chèn vào luôn nằm sau đoạn đầu.
 *
 * Nên chỗ này không đếm khối trong kho nữa. Nó cắt chính chuỗi markdown của
 * dải, theo đúng luật Lexical gom dòng thành khối, rồi hai nửa ấy đi qua
 * `markdownToRun` của từng màn để dựng lại. Không còn phép cộng chỉ số nào.
 */

const HEADING = /^ {0,3}#{1,6}\s/
const QUOTE = /^ {0,3}>/
const BULLET = /^\s*[-*+]\s/
const NUMBER = /^\s*\d+[.)]\s/
const FENCE = /^ {0,3}```/

/** Loại của một dòng, đủ để biết nó có gom được với dòng trước không. */
type Kind = 'heading' | 'quote' | 'ul' | 'ol' | 'para' | 'code'

function kindOf(line: string): Kind {
  if (FENCE.test(line)) return 'code'
  if (HEADING.test(line)) return 'heading'
  if (QUOTE.test(line)) return 'quote'
  if (NUMBER.test(line)) return 'ol'
  if (BULLET.test(line)) return 'ul'
  return 'para'
}

/**
 * Dòng này có nối vào khối đang mở không — đo từ chính Lexical, xem
 * `mdBlocks.test.ts`, chứ không suy từ CommonMark.
 *
 * Ba luật đáng nhớ, vì cả ba đều trái với cảm giác thường:
 * 1. Danh sách **nuốt** dòng chữ thường ngay sau nó (`- a\n- b\np3` ra một
 *    khối, không phải hai); trích dẫn cũng vậy.
 * 2. Một dòng trống **không** cắt hai danh sách cùng kiểu — chúng vẫn gộp làm
 *    một. Nhưng dòng trống rồi đến chữ thường thì cắt.
 * 3. Tiêu đề luôn đứng một mình, không nuốt gì và không bị nuốt.
 */
function joins(open: Kind, next: Kind, afterBlank: boolean): boolean {
  if (afterBlank) return (open === 'ul' || open === 'ol') && next === open
  if (open === 'heading' || next === 'heading') return false
  if (open === 'code' || next === 'code') return false
  if (open === 'para') return next === 'para'
  return next === open || next === 'para'
}

/**
 * Một dải markdown thành đúng những khối mặt soạn vẽ ra, theo thứ tự.
 *
 * Dải rỗng vẫn cho **một** khối: mặt soạn rỗng vẫn vẽ một đoạn văn trống, và
 * chỗ gọi cần một chỗ để chèn vào.
 */
export function mdBlocks(text: string): string[] {
  const out: string[] = []
  let open: Kind | null = null
  let blank = false
  let fenced = false
  for (const line of text.split('\n')) {
    if (fenced) {
      out[out.length - 1] += `\n${line}`
      if (FENCE.test(line)) {
        fenced = false
        open = null
      }
      continue
    }
    if (line.trim() === '') {
      blank = true
      continue
    }
    const next = kindOf(line)
    if (open !== null && joins(open, next, blank)) {
      out[out.length - 1] += `\n${line}`
      // Khối vẫn là khối cũ: chữ thường nối vào danh sách thì nó vẫn là danh
      // sách, và dòng kế tiếp phải đo theo danh sách chứ không theo chữ.
    } else {
      out.push(line)
      open = next
    }
    blank = false
    if (next === 'code' && open === 'code') fenced = true
  }
  return out.length === 0 ? [''] : out
}

/** Dòng có chữ của một chuỗi markdown — dòng trống chỉ là chỗ ngăn khối. */
const filled = (text: string) => text.split('\n').filter((line) => line.trim() !== '')

/**
 * Chỗ con trỏ trên mặt soạn, đổi ra **số dòng có chữ đứng trước chỗ cắt**.
 *
 * Chủ site: *"nó là quản lý theo line text"*. Cắt theo khối thì năm đoạn văn
 * liền nhau của long-form — Lexical gộp chúng làm một đoạn có ngắt dòng — chỉ
 * có một chỗ chèn: sau cả năm. Đếm theo dòng thì chèn được giữa bất cứ hai
 * dòng nào.
 *
 * `block` là khối thứ mấy trên mặt soạn, `line` là dòng thứ mấy trong khối ấy
 * (mỗi `<br>` và mỗi mục danh sách là một dòng — đúng cách `mdBlocks` gom dòng
 * nguồn thành khối). Trả về số dòng phía trên chỗ cắt, **tính cả dòng ấy**.
 */
export function linesThrough(text: string, block: number, line: number): number {
  const parts = mdBlocks(text)
  if (block < 0) return 0
  const k = Math.min(block, parts.length - 1)
  const before = parts.slice(0, k).reduce((n, part) => n + filled(part).length, 0)
  const own = filled(parts[k] ?? '').length
  return before + Math.min(Math.max(line + 1, 0), own)
}

/**
 * Cắt dải làm đôi sau `count` dòng có chữ.
 *
 * Cắt ở dòng chứ không ở khối, nên một đoạn gộp từ nhiều dòng nguồn tách
 * được ở giữa. Cắt trúng giữa một khối mã thì lùi ra sau dấu đóng: nửa khối
 * mã ở mỗi bên là hai khối hỏng.
 */
export function splitAtLine(text: string, count: number): [string, string] {
  const lines = text.split('\n')
  let seen = 0
  let cut = count <= 0 ? 0 : lines.length
  let fenced = false
  for (let i = 0; i < lines.length; i++) {
    if (FENCE.test(lines[i])) fenced = !fenced
    if (lines[i].trim() === '') continue
    seen += 1
    if (seen >= count && !fenced && count > 0) {
      cut = i + 1
      break
    }
  }
  const trim = (s: string[]) => s.join('\n').replace(/^\n+|\n+$/g, '')
  return [trim(lines.slice(0, cut)), trim(lines.slice(cut))]
}
