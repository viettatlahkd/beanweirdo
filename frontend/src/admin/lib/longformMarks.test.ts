import { CodeHighlightNode, CodeNode } from '@lexical/code'
import { LinkNode } from '@lexical/link'
import { ListItemNode, ListNode } from '@lexical/list'
import { $convertFromMarkdownString, $convertToMarkdownString } from '@lexical/markdown'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { $getRoot, $isTextNode, createEditor, type LexicalNode } from 'lexical'
import { runsToText, textToRuns, type LongformBlock } from 'post-renderer'
import { describe, expect, it } from 'vitest'
import { SITE_TRANSFORMERS, unescapeSite } from './liveMarkdown'
import { markdownToRun, runToMarkdown } from './longformFlow'

/*
 * Long-form lưu đậm/nghiêng thành `w`/`s`, rồi bày ra cho mặt soạn Lexical bằng
 * markdown. Hai đầu phải nói cùng một thứ tiếng: nếu long-form viết đậm là
 * `*x*` mà Lexical đọc `*x*` là nghiêng, thì chữ đậm hiện ra nghiêng trên mặt
 * soạn, và ghi lại thì đổi hẳn sang nghiêng.
 *
 * Nên bài kiểm này đi qua **Lexical thật**, không qua ý mình về Lexical.
 */
function throughLexical(markdown: string) {
  const editor = createEditor({
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode, CodeNode, CodeHighlightNode],
    onError: (e) => {
      throw e
    },
  })
  editor.update(() => $convertFromMarkdownString(markdown, SITE_TRANSFORMERS), { discrete: true })
  const shown: { t: string; bold: boolean; italic: boolean }[] = []
  let out = ''
  editor.getEditorState().read(() => {
    const walk = (n: LexicalNode) => {
      if ($isTextNode(n)) shown.push({ t: n.getTextContent(), bold: n.hasFormat('bold'), italic: n.hasFormat('italic') })
      if ('getChildren' in n) (n as unknown as { getChildren: () => LexicalNode[] }).getChildren().forEach(walk)
    }
    walk($getRoot())
    out = unescapeSite($convertToMarkdownString(SITE_TRANSFORMERS))
  })
  return { shown, out }
}

const P = (runs: LongformBlock['runs']): LongformBlock => ({ k: 'p', runs })

describe('đậm và nghiêng của long-form qua mặt soạn', () => {
  const blocks = [
    P([
      { t: 'thường ', w: '300', s: 'normal' },
      { t: 'đậm', w: '600', s: 'normal' },
      { t: ' rồi ', w: '300', s: 'normal' },
      { t: 'nghiêng', w: '300', s: 'italic' },
      { t: ' rồi ', w: '300', s: 'normal' },
      { t: 'cả hai', w: '600', s: 'italic' },
    ]),
  ]

  it('đậm hiện ra đậm, không nghiêng theo', () => {
    const { shown } = throughLexical(runToMarkdown(blocks))
    expect(shown).toEqual([
      { t: 'thường ', bold: false, italic: false },
      { t: 'đậm', bold: true, italic: false },
      { t: ' rồi ', bold: false, italic: false },
      { t: 'nghiêng', bold: false, italic: true },
      { t: ' rồi ', bold: false, italic: false },
      { t: 'cả hai', bold: true, italic: true },
    ])
  })

  it('ghi lại không đổi gì và không để thừa dấu sao', () => {
    const { out } = throughLexical(runToMarkdown(blocks))
    expect(markdownToRun(out)).toEqual(blocks)
  })

  it('chữ gõ mới bằng Cmd+B, Cmd+I, cả hai', () => {
    // Đúng thứ Lexical ghi ra khi người viết đặt định dạng bằng phím.
    expect(markdownToRun('a **b** c *d* e ***f***')).toEqual([
      P([
        { t: 'a ', w: '300', s: 'normal' },
        { t: 'b', w: '600', s: 'normal' },
        { t: ' c ', w: '300', s: 'normal' },
        { t: 'd', w: '300', s: 'italic' },
        { t: ' e ', w: '300', s: 'normal' },
        { t: 'f', w: '600', s: 'italic' },
      ]),
    ])
  })
})

describe('đậm và nghiêng nằm sát nhau', () => {
  const cases: LongformBlock[][] = [
    [P([{ t: 'đậm ', w: '600', s: 'normal' }, { t: 'cả hai', w: '600', s: 'italic' }, { t: ' đậm', w: '600', s: 'normal' }])],
    [P([{ t: 'nghiêng ', w: '300', s: 'italic' }, { t: 'cả hai', w: '600', s: 'italic' }, { t: ' nghiêng', w: '300', s: 'italic' }])],
    [P([{ t: 'đậm', w: '600', s: 'normal' }, { t: 'nghiêng', w: '300', s: 'italic' }])],
  ]
  for (const blocks of cases) {
    it(runToMarkdown(blocks), () => {
      const { out } = throughLexical(runToMarkdown(blocks))
      expect({ out, back: markdownToRun(out) }).toEqual({ out, back: blocks })
    })
  }
})

/*
 * Report, memo, bitesize lưu chữ đúng như Lexical ghi ra, rồi trang đọc lại
 * bằng `textToRuns` của `runs.ts`. Chữ nghiêng giữa câu đậm là chỗ bộ đọc cũ
 * để lọt hai dấu sao lên trang.
 */
describe('trang đọc đúng thứ mặt soạn ghi ra', () => {
  it('nghiêng lồng trong đậm không để lại dấu sao', () => {
    const { out } = throughLexical('**đậm *cả hai* đậm**')
    expect(textToRuns(out)).toEqual([
      { t: 'đậm ', b: true },
      { t: 'cả hai', em: true, b: true },
      { t: ' đậm', b: true },
    ])
  })

  it('đậm lồng trong nghiêng không để lại dấu sao', () => {
    const { out } = throughLexical('*ng **cả hai** ng*')
    expect(runsToText(textToRuns(out))).toBe(out)
    expect(textToRuns(out).map((r) => r.t).join('')).toBe('ng cả hai ng')
  })
})

describe('trích dẫn trong long-form', () => {
  const Q = (t: string): LongformBlock => ({ k: 'p', quote: true, runs: [{ t, w: '300', s: 'normal' }] })
  const blocks = [Q('câu hỏi'), Q('mục đích'), P([{ t: 'đoạn sau', w: '300', s: 'normal' }])]

  it('đi qua mặt soạn mà đoạn sau không bị nuốt vào trích dẫn', () => {
    const { out } = throughLexical(runToMarkdown(blocks))
    expect(markdownToRun(out)).toEqual(blocks)
  })
})

describe('mỗi khối long-form là một khối trên mặt soạn', () => {
  it('hai đoạn liền nhau không gộp thành một đoạn có ngắt dòng', () => {
    // Gộp lại thì nút `+` và chỗ thả khối chỉ đặt được sau cả cụm.
    const md = runToMarkdown([P([{ t: 'một' }]), P([{ t: 'hai' }]), { k: 'li', runs: [{ t: 'mục' }] }, P([{ t: 'ba' }])])
    const editor = createEditor({
      nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode, CodeNode, CodeHighlightNode],
      onError: (e) => {
        throw e
      },
    })
    editor.update(() => $convertFromMarkdownString(md, SITE_TRANSFORMERS), { discrete: true })
    const kids = editor.getEditorState().read(() => $getRoot().getChildren().map((n) => n.getTextContent()))
    expect(kids).toEqual(['một', 'hai', 'mục', 'ba'])
    expect(markdownToRun(md).map((b) => b.k)).toEqual(['p', 'p', 'li', 'p'])
  })
})
