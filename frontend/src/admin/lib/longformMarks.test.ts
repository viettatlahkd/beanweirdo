import { CodeHighlightNode, CodeNode } from '@lexical/code'
import { LinkNode } from '@lexical/link'
import { ListItemNode, ListNode } from '@lexical/list'
import { $convertFromMarkdownString, $convertToMarkdownString } from '@lexical/markdown'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { $createParagraphNode, $createTextNode, $getRoot, $isTextNode, createEditor, type LexicalNode } from 'lexical'
import { EMPTY_LINE, runsToText, textToRuns, type LongformBlock } from 'post-renderer'
import { describe, expect, it } from 'vitest'
import { $exportSite, $importSite, SITE_TRANSFORMERS, unescapeSite } from './liveMarkdown'
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

  it('Shift+Enter trong một mục danh sách vẫn ở trong mục đó, đoạn tách riêng vẫn là đoạn', () => {
    const li: LongformBlock = { k: 'li', lvl: 1, runs: [{ t: 'GĐ 1+2:\nTiên phong công nghệ', w: '300', s: 'normal' }] }
    const after = P([{ t: 'Đoạn sau danh sách', w: '300', s: 'normal' }])
    const { out } = throughLexical(runToMarkdown([li, after]))
    expect(markdownToRun(out)).toEqual([li, after])
  })
})

describe('dòng để trống', () => {
  const editor = () =>
    createEditor({
      nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode, CodeNode, CodeHighlightNode],
      onError: (e) => {
        throw e
      },
    })
  const paragraphs = (ed: ReturnType<typeof editor>) =>
    ed.getEditorState().read(() => $getRoot().getChildren().map((n) => `${n.getType()}:${n.getTextContent()}`))

  it('Enter rồi không gõ gì thì dòng trống vẫn còn sau khi lưu và mở lại (chủ site, 2026-10-17)', () => {
    const ed = editor()
    ed.update(
      () => {
        for (const t of ['a', '', '', 'b', '']) {
          const p = $createParagraphNode()
          if (t) p.append($createTextNode(t))
          $getRoot().append(p)
        }
      },
      { discrete: true },
    )
    let md = ''
    ed.getEditorState().read(() => {
      md = $exportSite()
    })
    const blocks = markdownToRun(md)
    expect(blocks.map((b) => runsToText(b.runs as never))).toEqual(['a', '', '', 'b', ''])

    const back = editor()
    back.update(() => $importSite(runToMarkdown(blocks)), { discrete: true })
    expect(paragraphs(back)).toEqual(['paragraph:a', 'paragraph:', 'paragraph:', 'paragraph:b', 'paragraph:'])
  })

  it('dòng trống ngay sau danh sách không nhập vào mục cuối', () => {
    const back = editor()
    back.update(() => $importSite(runToMarkdown(markdownToRun(`- x\n\n${EMPTY_LINE}\n\nb`))), { discrete: true })
    expect(paragraphs(back)).toEqual(['list:x', 'paragraph:', 'paragraph:b'])
  })
})

describe('đoạn lùi lề', () => {
  it('đi qua mặt soạn mà vẫn giữ bậc lùi', () => {
    const blocks: LongformBlock[] = [
      { k: 'p', runs: textToRuns('gốc') as never },
      { k: 'p', ind: 2, runs: textToRuns('lùi hai bậc') as never },
    ]
    const ed = createEditor({
      nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode, CodeNode, CodeHighlightNode],
      onError: (e) => {
        throw e
      },
    })
    ed.update(() => $importSite(runToMarkdown(blocks)), { discrete: true })
    let md = ''
    let indents: number[] = []
    ed.getEditorState().read(() => {
      indents = $getRoot().getChildren().map((n) => (n as unknown as { getIndent: () => number }).getIndent())
      md = $exportSite()
    })
    expect(indents).toEqual([0, 2])
    expect(markdownToRun(md).map((b) => [b.ind ?? 0, runsToText(b.runs as never)])).toEqual([
      [0, 'gốc'],
      [2, 'lùi hai bậc'],
    ])
  })
})

describe('tầng của mục danh sách', () => {
  it('mở rồi rời ô không đổi tầng (Lexical lồng bằng bốn dấu cách)', () => {
    const blocks: LongformBlock[] = [
      { k: 'li', lvl: 1, runs: textToRuns('một') as never },
      { k: 'li', lvl: 2, runs: textToRuns('hai') as never },
      { k: 'li', lvl: 3, runs: textToRuns('ba') as never },
    ]
    const ed = createEditor({
      nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode, CodeNode, CodeHighlightNode],
      onError: (e) => {
        throw e
      },
    })
    ed.update(() => $importSite(runToMarkdown(blocks)), { discrete: true })
    let md = ''
    ed.getEditorState().read(() => {
      md = $exportSite()
    })
    expect(markdownToRun(md).map((b) => b.lvl)).toEqual([1, 2, 3])
  })
})
