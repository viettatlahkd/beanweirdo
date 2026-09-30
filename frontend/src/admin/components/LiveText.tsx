/**
 * Mặt soạn sống: chữ hiện ra đúng hình dạng của nó **ngay lúc gõ**.
 *
 * Chủ site: *"cứ click vào là bị thành dạng markdown thuần luôn, cả khối bị
 * thành markdown trông thô lắm — render by character được không? character
 * nào trước đó xong thì render tới đó luôn"*.
 *
 * Muốn thế thì mặt soạn phải **là** mặt vẽ, tức `contenteditable`, không phải
 * `textarea`. Và tự viết `contenteditable` là tự nhận lấy bốn việc khó: giữ
 * con trỏ khi DOM đổi, hoàn tác, dán, và **bộ gõ tiếng Việt**. Cái cuối là chỗ
 * nguy nhất — Telex gõ trong một `contenteditable` mà React vẽ lại giữa chừng
 * là kinh điển chuyện nuốt chữ và mất dấu.
 *
 * Nên phần ấy giao cho Lexical, thứ sinh ra để lo đúng chúng. Cách lưu không
 * đổi: vào là markdown, ra là markdown, y như `flow.ts` vẫn đưa.
 */
import { CodeHighlightNode, CodeNode } from '@lexical/code'
import { LinkNode } from '@lexical/link'
import { ListItemNode, ListNode } from '@lexical/list'
import { $convertFromMarkdownString, $convertToMarkdownString } from '@lexical/markdown'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import {
  $getRoot,
  BLUR_COMMAND,
  CLEAR_HISTORY_COMMAND,
  COMMAND_PRIORITY_LOW,
  type LexicalEditor,
} from 'lexical'
import { useEffect, useRef } from 'react'
import { SITE_TRANSFORMERS, unescapeSite } from '../lib/liveMarkdown'
import { registerLiveKeys, type LiveEdges } from './liveKeys'

/**
 * Tên lớp cho từng loại, để CSS của trang vẽ chúng.
 *
 * Không đặt kiểu chữ ở đây: kiểu chữ là của design, và nó đã nằm trong
 * `admin.css` cạnh mọi thứ khác. Chỗ này chỉ nối tên.
 */
const THEME = {
  paragraph: 'awc-live-p',
  heading: { h1: 'awc-live-h1', h2: 'awc-live-h2', h3: 'awc-live-h3' },
  quote: 'awc-live-quote',
  list: {
    ul: 'awc-live-ul',
    ol: 'awc-live-ol',
    listitem: 'awc-live-li',
    nested: { listitem: 'awc-live-li-nested' },
  },
  link: 'awc-live-link',
  text: { bold: 'awc-live-bold', italic: 'awc-live-em', underline: 'awc-live-u' },
}

const NODES = [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode, CodeNode, CodeHighlightNode]

/**
 * Ghi lại khi rời ô, không ghi sau mỗi phím.
 *
 * Ghi mỗi phím là mỗi phím một lần gọi máy chủ và một bước hoàn tác — cả hai
 * đều sai. Rời ô là lúc người viết đã xong một ý.
 */
function CommitOnBlur({ onCommit }: { onCommit: (markdown: string) => void }) {
  const [editor] = useLexicalComposerContext()
  useEffect(
    () =>
      editor.registerCommand(
        BLUR_COMMAND,
        () => {
          editor
            .getEditorState()
            .read(() => onCommit(unescapeSite($convertToMarkdownString(SITE_TRANSFORMERS))))
          return false
        },
        COMMAND_PRIORITY_LOW,
      ),
    [editor, onCommit],
  )
  return null
}

/**
 * Chữ đổi từ **bên ngoài** thì dựng lại mặt soạn.
 *
 * Lexical đọc `text` đúng **một lần**, lúc dựng (`initialConfig.editorState`).
 * Chừng nào chữ chỉ đổi do người viết gõ thì thế là đủ — và đến 2026-09-21
 * thì đúng là thế thật.
 *
 * Nhưng nút `+` nay cắt dải chữ làm đôi: chèn một cái bảng vào giữa thì dải
 * trên còn lại một nửa. React giữ nguyên component (cùng `key`), nên Lexical
 * không đọc lại và **mặt soạn vẫn bày nguyên cả dải cũ** — trên màn hình là
 * hai bản của cùng đoạn văn, một ở trên bảng một ở dưới. Đo trong Chrome, xem
 * `docs/inbox/template/`.
 *
 * So bằng chính markdown chứ không bằng một cờ: dựng lại một mặt soạn đang có
 * con trỏ là làm mất chỗ đang gõ, nên chỉ dựng lại khi chữ thật sự khác.
 */
function SyncOutside({ text }: { text: string }) {
  const [editor] = useLexicalComposerContext()
  useEffect(() => {
    let current = ''
    editor.getEditorState().read(() => {
      current = unescapeSite($convertToMarkdownString(SITE_TRANSFORMERS))
    })
    if (current === text) return
    editor.update(() => $convertFromMarkdownString(text, SITE_TRANSFORMERS))
    /*
     * Chữ đổi từ bên ngoài thì bộ hoàn tác của Lexical phải quên hết.
     *
     * Chèn một khối vào giữa dải là cắt dải làm đôi: nửa sau sang một mặt soạn
     * mới, mặt này chỉ còn nửa trước. Bộ hoàn tác của mặt này vẫn nhớ cả dải
     * cũ, nên Ctrl+Z ở đây dựng lại nguyên dải — rồi rời ô là ghi nó đè vào
     * chỗ chỉ còn nửa trước, và nửa sau có hai bản. Đó là bài AI Twin lặp phần
     * 4–7 (2026-09-24).
     */
    editor.dispatchCommand(CLEAR_HISTORY_COMMAND, undefined)
  }, [editor, text])
  return null
}

/**
 * `Tab` trong danh sách, `Cmd+K`, `Cmd+\`, và hai mép — xem `liveKeys.ts`.
 *
 * Hai hàm ở mép đi qua một `ref` chứ không vào mảng phụ thuộc: chỗ gọi dựng
 * chúng lại mỗi lần vẽ, và đăng ký lại lệnh sau mỗi phím thì con trỏ nhảy.
 */
function LiveKeys({ edges }: { edges: LiveEdges }) {
  const [editor] = useLexicalComposerContext()
  const latest = useRef(edges)
  latest.current = edges
  useEffect(
    () =>
      registerLiveKeys(editor, {
        onBackspaceAtStart: () => latest.current.onBackspaceAtStart?.() ?? false,
        onDeleteAtEnd: () => latest.current.onDeleteAtEnd?.() ?? false,
      }),
    [editor],
  )
  return null
}

export function LiveText({
  text,
  placeholder = 'Viết ở đây, hoặc gõ / để chèn',
  onCommit,
  onBackspaceAtStart,
  onDeleteAtEnd,
}: {
  text: string
  placeholder?: string
  onCommit: (markdown: string) => void
} & LiveEdges) {
  return (
    <LexicalComposer
      initialConfig={{
        namespace: 'beanweirdo',
        theme: THEME,
        nodes: NODES,
        // Lỗi trong lúc soạn thì ném ra, đừng nuốt: một trình soạn im lặng
        // hỏng là một trình soạn đang ăn mất chữ của người ta.
        onError: (e: Error) => {
          throw e
        },
        editorState: () => $convertFromMarkdownString(text, SITE_TRANSFORMERS),
      }}
    >
      <div className="awc-live">
        <RichTextPlugin
          contentEditable={<ContentEditable className="awc-live-input" aria-label={placeholder} />}
          placeholder={<div className="awc-live-ghost">{placeholder}</div>}
          ErrorBoundary={LexicalErrorBoundary}
        />
        {/* Gõ `# `, `- `, `> `, `**đậm**` là đổi ngay tại chỗ, không đợi rời ô. */}
        <MarkdownShortcutPlugin transformers={SITE_TRANSFORMERS} />
        {/* Gõ `- ` ra danh sách thì `Enter`, `Tab` trong danh sách phải chạy theo. */}
        <ListPlugin />
        <HistoryPlugin />
        <SyncOutside text={text} />
        <LiveKeys edges={{ onBackspaceAtStart, onDeleteAtEnd }} />
        <CommitOnBlur onCommit={onCommit} />
      </div>
    </LexicalComposer>
  )
}

function editorOf(input: HTMLElement | null | undefined): LexicalEditor | null {
  return (input as (HTMLElement & { __lexicalEditor?: LexicalEditor }) | null)?.__lexicalEditor ?? null
}

/** Markdown **đang** nằm trên mặt soạn — kể cả phần chưa ghi vì chưa rời ô. */
export function liveMarkdown(input: HTMLElement | null | undefined): string | null {
  const editor = editorOf(input)
  if (!editor) return null
  let out = ''
  editor.getEditorState().read(() => {
    out = unescapeSite($convertToMarkdownString(SITE_TRANSFORMERS))
  })
  return out
}

/**
 * Bỏ khối thứ `block` khỏi mặt soạn rồi trả markdown còn lại.
 *
 * Dùng cho `/`: dòng `/bảng` người viết vừa gõ là lời gọi menu, không phải
 * chữ của bài — chèn xong mà nó còn nằm đó là phải xoá tay thêm một lần.
 */
export function takeBlock(input: HTMLElement | null | undefined, block: number): string | null {
  const editor = editorOf(input)
  if (!editor) return null
  editor.update(() => $getRoot().getChildAtIndex(block)?.remove(), { discrete: true })
  return liveMarkdown(input)
}
