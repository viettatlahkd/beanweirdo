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
import { $convertFromMarkdownString, $convertToMarkdownString, TRANSFORMERS } from '@lexical/markdown'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { BLUR_COMMAND, COMMAND_PRIORITY_LOW } from 'lexical'
import { useEffect } from 'react'

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
  text: { bold: 'awc-live-bold', italic: 'awc-live-bold', underline: 'awc-live-u' },
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
          editor.getEditorState().read(() => onCommit($convertToMarkdownString(TRANSFORMERS)))
          return false
        },
        COMMAND_PRIORITY_LOW,
      ),
    [editor, onCommit],
  )
  return null
}

export function LiveText({
  text,
  placeholder = 'Viết ở đây, hoặc gõ / để chèn',
  onCommit,
}: {
  text: string
  placeholder?: string
  onCommit: (markdown: string) => void
}) {
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
        editorState: () => $convertFromMarkdownString(text, TRANSFORMERS),
      }}
    >
      <div className="awc-live">
        <RichTextPlugin
          contentEditable={<ContentEditable className="awc-live-input" aria-label={placeholder} />}
          placeholder={<div className="awc-live-ghost">{placeholder}</div>}
          ErrorBoundary={LexicalErrorBoundary}
        />
        {/* Gõ `# `, `- `, `> `, `**đậm**` là đổi ngay tại chỗ, không đợi rời ô. */}
        <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
        <HistoryPlugin />
        <CommitOnBlur onCommit={onCommit} />
      </div>
    </LexicalComposer>
  )
}
