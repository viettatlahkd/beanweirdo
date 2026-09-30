/**
 * Dấu sao đậm và nghiêng, **lồng được vào nhau**.
 *
 * Mặt soạn Lexical ghi một câu đậm có một chữ vừa đậm vừa nghiêng ở giữa thành
 * `**đậm *cả hai* đậm**` — mở một lần, lồng bên trong, đóng một lần. Bộ đọc cũ
 * cắt dòng bằng regex `\*\*[^*]+\*\*`, thứ không cho một dấu sao nào nằm bên
 * trong, nên câu ấy vỡ thành hai dấu sao lẻ hiện nguyên trên trang. Nên chỗ này
 * đọc dấu sao như markdown đọc: một ngăn xếp các dấu đang mở.
 *
 * Chỉ lo dấu sao. Link, địa chỉ trần, gạch dưới vẫn do người gọi đọc, trên
 * phần chữ mà hàm này trả về.
 */

/** Một đoạn chữ và hai định dạng của nó. `t` còn nguyên mọi ký hiệu khác. */
export type Starred = { t: string; b: boolean; i: boolean }

type Mark = { kind: 'mark'; f: 'b' | 'i'; close: boolean; matched: boolean }
type Tok = { kind: 'text'; t: string } | Mark

const SPACE = /\s/

/**
 * Chữ thành các đoạn đậm/nghiêng.
 *
 * Luật mở/đóng là của markdown: một dãy sao **mở** được khi ngay sau nó là chữ
 * (không phải khoảng trắng, không phải hết dòng), **đóng** được khi ngay trước
 * nó là chữ. Nhờ vậy `FD* tăng` và `a * b` nằm yên làm chữ thường. Dấu mở mà
 * không gặp dấu đóng thì trả về làm dấu sao thường — gõ dở trông phải ra dở.
 */
export function parseStars(text: string): Starred[] {
  const toks: Tok[] = []
  const open: Mark[] = []
  const re = /\*+/g
  let last = 0
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) toks.push({ kind: 'text', t: text.slice(last, m.index) })
    last = m.index + m[0].length
    const before = text[m.index - 1]
    const after = text[last]
    const canClose = before !== undefined && !SPACE.test(before)
    const canOpen = after !== undefined && !SPACE.test(after)
    let n = m[0].length

    // Đóng từ trên xuống: `***` sau `**…*…` đóng nghiêng trước rồi đến đậm.
    if (canClose) {
      while (n > 0 && open.length > 0) {
        const top = open[open.length - 1]
        const need = top.f === 'b' ? 2 : 1
        if (n < need) break
        open.pop()
        top.matched = true
        toks.push({ kind: 'mark', f: top.f, close: true, matched: true })
        n -= need
      }
    }
    if (n > 0 && canOpen) {
      // Đậm ở ngoài, nghiêng ở trong: `***x***` đóng lại theo đúng thứ tự ấy.
      const marks: Mark[] = []
      while (n >= 2) {
        marks.push({ kind: 'mark', f: 'b', close: false, matched: false })
        n -= 2
      }
      if (n === 1) marks.push({ kind: 'mark', f: 'i', close: false, matched: false })
      n = 0
      for (const mk of marks) {
        toks.push(mk)
        open.push(mk)
      }
    }
    if (n > 0) toks.push({ kind: 'text', t: '*'.repeat(n) })
  }
  if (last < text.length) toks.push({ kind: 'text', t: text.slice(last) })

  const out: Starred[] = []
  let b = 0
  let i = 0
  const put = (t: string) => {
    const prev = out[out.length - 1]
    if (prev && prev.b === b > 0 && prev.i === i > 0) prev.t += t
    else out.push({ t, b: b > 0, i: i > 0 })
  }
  for (const tok of toks) {
    if (tok.kind === 'text') {
      put(tok.t)
      continue
    }
    if (!tok.matched) {
      put(tok.f === 'b' ? '**' : '*')
      continue
    }
    const inc = tok.close ? -1 : 1
    if (tok.f === 'b') b += inc
    else i += inc
  }
  return out.filter((s) => s.t !== '')
}

const TAG = { b: '**', i: '*' } as const

/**
 * Các đoạn đậm/nghiêng thành chữ, theo đúng cách `parseStars` đọc lại được.
 *
 * Viết mỗi đoạn một cặp dấu riêng thì hai đoạn đậm liền nhau ra
 * `**đậm *****cả hai*****`, một dãy năm sao không ai đọc nổi. Nên dấu được mở
 * một lần và giữ mở qua các đoạn còn cần nó, như Lexical vẫn viết.
 *
 * Dấu không được dính khoảng trắng ở phía chữ — `**đậm **` không phải là đậm
 * trong markdown — nên khoảng trắng ở mép đoạn được đẩy ra ngoài dấu. Đoạn chỉ
 * có khoảng trắng thì không mở không đóng gì: khoảng trắng đậm hay không trông
 * như nhau.
 */
export function writeStars(segs: Starred[]): string {
  let out = ''
  const stack: ('b' | 'i')[] = []
  const has = (s: Starred, f: 'b' | 'i') => (f === 'b' ? s.b : s.i)

  const close = (from: number) => {
    const tags = stack
      .splice(from)
      .reverse()
      .map((f) => TAG[f])
      .join('')
    const trail = /\s*$/.exec(out)![0]
    out = out.slice(0, out.length - trail.length) + tags + trail
  }

  /** Dấu nào còn cần lâu hơn thì mở trước, nằm ngoài, để khỏi phải đóng mở lại. */
  const lasting = (k: number, f: 'b' | 'i') => {
    let n = 0
    for (let j = k; j < segs.length; j++) {
      if (segs[j].t.trim() === '') continue
      if (!has(segs[j], f)) break
      n += 1
    }
    return n
  }

  segs.forEach((seg, k) => {
    if (seg.t.trim() === '') {
      out += seg.t
      return
    }
    const drop = stack.findIndex((f) => !has(seg, f))
    if (drop >= 0) close(drop)
    const lead = /^\s*/.exec(seg.t)![0]
    const want = (['b', 'i'] as const)
      .filter((f) => has(seg, f) && !stack.includes(f))
      .sort((x, y) => lasting(k, y) - lasting(k, x))
    stack.push(...want)
    out += lead + want.map((f) => TAG[f]).join('') + seg.t.slice(lead.length)
  })
  close(0)
  return out
}
