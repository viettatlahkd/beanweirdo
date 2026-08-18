import { PostRenderer } from 'post-renderer'
import type { MemoPostData, MemoSection } from 'post-renderer'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { useNotes } from '../data/useNotes'
import { ink, sans } from '../design/tokens'
import { useNav } from '../lib/nav'

const status = { fontFamily: sans, fontSize: 13, color: ink.muted, padding: '140px 56px' }

type MemoBody = { specs?: { k: string; v: string }[]; sections?: MemoSection[] }

/**
 * A memo note, read on its own template.
 *
 * Unlike the four post templates this one belongs to Ghi 01, so it is a note
 * that opens here — the id comes from the note the reader clicked, and the
 * blank sample under Admin › Templates comes through with none.
 */
export function MemoScreen() {
  const nav = useNav()
  const { notes, loading, error } = useNotes()

  if (loading) return <div style={status}>Đang tải…</div>
  if (error) return <div style={status}>Không tải được ghi chú.</div>

  // With no id this is the sample: show the pinned memo if there is one, so
  // the template is never demonstrated on an empty page.
  const memo = nav.memoId
    ? notes.find((n) => n.id === nav.memoId)
    : notes.find((n) => n.template === 'memo')

  if (!memo) return <div style={status}>Chưa có ghi chú nào dùng khung này.</div>

  const body = (memo.body ?? {}) as MemoBody
  const post: MemoPostData = {
    title: memo.t,
    subtitle: memo.b,
    specs: body.specs,
    img: memo.img,
    imgCaption: memo.mediaHint ?? undefined,
    sections: body.sections ?? [],
  }

  return (
    <div>
      <div style={{ padding: '40px 56px 0' }}>
        <Breadcrumbs color="#7C7C70" />
      </div>
      <PostRenderer template="memo" post={post} />
    </div>
  )
}
