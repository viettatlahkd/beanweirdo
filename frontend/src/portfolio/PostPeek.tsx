import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabaseClient'
import type { PostRow } from '../data/usePublishedPosts'
import { proseOf } from '../lib/postText'
import { TagBadges } from '../components/TagBadges'
import type { PortPost } from './blocks'

/**
 * A post's preview card on a port page: its picture, meta and title as the
 * card always had, then the opening of its text, the rest faded out under a
 * "Đọc tiếp" button, Medium-paywall style.
 *
 * A mouse resting on a post for HOVER_MS opens it; a click (and every tap,
 * since touch has no hover) opens it at once and keeps it open until closed.
 */
const HOVER_MS = 3000
/** Grace to cross the gap between the title and the card without it closing. */
const LEAVE_MS = 250
/** Share of the post the card lets a reader see before the fade. */
const SHOWN = 0.3
const CARD_W = 720
const CARD_H = 520
/** Below this the card is centred over a dimmed page instead of beside the post. */
const NARROW = 640

type Peek = { post: PortPost; at: DOMRect; pinned: boolean }

// Bodies are the heaviest column, so they are fetched only when a card is about
// to open, and kept for the visit so a second hover is instant.
const bodies = new Map<string, Promise<PostRow | null>>()
function loadPost(id: string): Promise<PostRow | null> {
  let p = bodies.get(id)
  if (!p) {
    p = Promise.resolve(supabase.from('posts').select('*').eq('id', id).maybeSingle()).then(({ data, error }) => {
      if (error) {
        bodies.delete(id)
        throw error
      }
      return data as PostRow | null
    })
    bodies.set(id, p)
  }
  return p
}

export function usePeek() {
  const [peek, setPeek] = useState<Peek | null>(null)
  const current = useRef<Peek | null>(null)
  current.current = peek
  const opening = useRef<number | undefined>(undefined)
  const closing = useRef<number | undefined>(undefined)

  useEffect(() => () => (clearTimeout(opening.current), clearTimeout(closing.current)), [])

  const leave = () => {
    clearTimeout(opening.current)
    clearTimeout(closing.current)
    closing.current = window.setTimeout(() => setPeek((p) => (p?.pinned ? p : null)), LEAVE_MS)
  }
  const close = () => {
    clearTimeout(opening.current)
    clearTimeout(closing.current)
    setPeek(null)
  }

  const trigger = (post: PortPost) => ({
    onClick: (e: MouseEvent<HTMLElement>) => {
      close()
      setPeek({ post, at: e.currentTarget.getBoundingClientRect(), pinned: true })
    },
    onPointerEnter: (e: PointerEvent<HTMLElement>) => {
      if (e.pointerType !== 'mouse') return
      if (current.current?.post.id === post.id) clearTimeout(closing.current)
      void loadPost(post.id).catch(() => {})
      const el = e.currentTarget
      clearTimeout(opening.current)
      opening.current = window.setTimeout(() => {
        clearTimeout(closing.current)
        setPeek((p) => (p?.pinned ? p : { post, at: el.getBoundingClientRect(), pinned: false }))
      }, HOVER_MS)
    },
    onPointerLeave: (e: PointerEvent<HTMLElement>) => {
      if (e.pointerType === 'mouse') leave()
    },
  })

  const card = {
    onPointerEnter: () => clearTimeout(closing.current),
    onPointerLeave: (e: PointerEvent<HTMLElement>) => {
      if (e.pointerType === 'mouse') leave()
    },
  }
  return { peek, trigger, card, close }
}

export type PeekTrigger = ReturnType<typeof usePeek>['trigger']

/** Beside the post when there is room, otherwise over it; always inside the window. */
function place(at: DOMRect): CSSProperties {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const h = Math.min(CARD_H, vh - 32)
  if (vw < NARROW) return { left: 16, right: 16, top: (vh - h) / 2, height: h }
  const gap = 12
  const left =
    at.right + gap + CARD_W <= vw - 16 ? at.right + gap : at.left - gap - CARD_W >= 16 ? at.left - gap - CARD_W : (vw - CARD_W) / 2
  const top = Math.min(Math.max(at.top - 16, 16), vh - h - 16)
  return { left, top, width: CARD_W, height: h }
}

export function PostPeek({
  peek,
  vars,
  meta,
  cover,
  href,
  card,
  onClose,
}: {
  peek: Peek
  vars: CSSProperties
  meta: string
  /** The post's picture, drawn by the page so it crops like every other one there. */
  cover: ReactNode
  href: string
  card: ReturnType<typeof usePeek>['card']
  onClose: () => void
}) {
  const box = useRef<HTMLDivElement>(null)
  const narrow = window.innerWidth < NARROW
  const { post } = peek

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    // A pinned card closes on a click anywhere else, as the old dialog did on its backdrop.
    const onDown = (e: Event) => box.current && !box.current.contains(e.target as Node) && onClose()
    window.addEventListener('keydown', onKey)
    if (peek.pinned) window.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onDown)
    }
  }, [onClose, peek.pinned])

  return createPortal(
    <>
      {narrow && <div className="pf-peek-dim" />}
      <div ref={box} className="pf-peek pf" style={{ ...vars, ...place(peek.at) }} role="dialog" aria-label={post.en} {...card}>
        <button className="close" onClick={onClose} aria-label="đóng">
          ×
        </button>
        {cover}
        <PeekText id={post.id} href={href}>
          <span className="meta">{meta}</span>
          <TagBadges tags={post.tags ?? []} style={{ margin: '6px 0 2px' }} />
          <h3 className="head">{post.en}</h3>
          {(post.lead || post.vi) && <p className="lead">{post.lead || post.vi}</p>}
        </PeekText>
      </div>
    </>,
    document.body,
  )
}

/** The card's right column: its heading, then the text up to the cut. */
function PeekText({ id, href, children }: { id: string; href: string; children: ReactNode }) {
  const [post, setPost] = useState<PostRow | null | 'error'>(null)
  const view = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ full: 0, view: 0 })

  useEffect(() => {
    let live = true
    setPost(null)
    loadPost(id).then(
      (p) => live && setPost(p ?? 'error'),
      () => live && setPost('error'),
    )
    return () => {
      live = false
    }
  }, [id])

  // Late fonts reflow the text, so the cut follows its height rather than reading it once.
  useLayoutEffect(() => {
    if (!inner.current || !view.current) return
    const measure = () => setSize({ full: inner.current?.offsetHeight ?? 0, view: view.current?.clientHeight ?? 0 })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(inner.current)
    return () => ro.disconnect()
  }, [post])

  // A short post still fills the column; a long one never asks for more than a
  // few screens of scrolling before the fade.
  const cut = Math.min(Math.max(size.full * SHOWN, size.view), size.view * 2.5, size.full)

  return (
    <div className="txt" ref={view}>
      <div className="cut" style={{ height: cut || undefined }}>
        <div ref={inner}>
          {children}
          {post === null ? (
            <p className="note">Đang tải…</p>
          ) : post === 'error' ? (
            <p className="note">Không tải được bài.</p>
          ) : (
            <div className="prose">
              {proseOf(post.body).map((b, i) => (b.h ? <h4 key={i}>{b.text}</h4> : <p key={i}>{b.text}</p>))}
            </div>
          )}
        </div>
        <div className="fade">
          <a className="more" href={href}>
            Đọc tiếp
          </a>
        </div>
      </div>
    </div>
  )
}
