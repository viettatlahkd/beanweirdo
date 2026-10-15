import { useEffect, useRef, useState } from 'react'
import type { AuthorRef } from 'api-contract'
import { getPost, transitionStatus, updatePost, type Module, type Node, type PostDetail } from '../lib/apiClient'
import { listModulesCached } from '../lib/lists'
import { resolveTemplate } from '../lib/postData'
import { usePostAddresses } from '../../data/usePostAddresses'
import { PostSettings, type SettingsPatch } from './PostSettings'

type Loaded = Awaited<ReturnType<typeof getPost>>
const loads = new Map<string, { at: number; p: Promise<Loaded> }>()
/** A hover long before the click (or before a trip into the editor) would show an old copy. */
const FRESH_MS = 30_000

/**
 * Start reading a post before it is clicked, on hover or focus. Owner
 * (2026-10-15) found the panel slow to open: it waited for this request after
 * the click. A hover usually comes a few hundred ms before the click, which is
 * most of the wait.
 */
export function prefetchPost(id: string): Promise<Loaded> {
  const hit = loads.get(id)
  if (hit && Date.now() - hit.at < FRESH_MS) return hit.p
  const p = getPost(id)
  loads.set(id, { at: Date.now(), p })
  // A failed read must not stick: the next hover tries again.
  p.catch(() => loads.delete(id))
  return p
}

/**
 * The editor's "Thông tin bài" panel, opened on one post straight from the
 * post list.
 *
 * Owner (2026-10-15): clicking a post's info line should open "1 wizard chung"
 * to edit it without going into the post. It is the same panel as the
 * editor's, not a second form, so a field added there shows up here too.
 * Writes go through `updatePost` exactly as the editor's do, so a published
 * post gets the same draft rules either way.
 */
export function ListPostSettings({
  postId,
  topics,
  onClose,
  onError,
}: {
  postId: string | null
  topics: Node[]
  /** Called on close; the list reloads then, since authors write on their own. */
  onClose: () => void
  onError: (message: string) => void
}) {
  const addresses = usePostAddresses()
  const [post, setPost] = useState<PostDetail | null>(null)
  const [byline, setByline] = useState<AuthorRef[]>([])
  const [modules, setModules] = useState<Module[]>([])
  const writes = useRef(new Set<Promise<unknown>>())
  const [dirty, setDirty] = useState(false)
  // Mounted closed, opened a frame later, so the panel slides in as it does in the editor.
  const [shown, setShown] = useState(false)

  useEffect(() => {
    setPost(null)
    setDirty(false)
    setShown(false)
    if (!postId) return
    let alive = true
    // Edits made here would make a cached copy stale; read fresh next time.
    const load = prefetchPost(postId)
    loads.delete(postId)
    Promise.all([load, listModulesCached()])
      .then(([{ authors, ...p }, mods]) => {
        if (!alive) return
        setByline(authors)
        setModules(mods)
        setPost(p)
        requestAnimationFrame(() => alive && setShown(true))
      })
      .catch((e: Error) => alive && onError(e.message))
    return () => {
      alive = false
    }
  }, [postId, onError])

  useEffect(() => {
    if (!postId) return
    const escape = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', escape)
    return () => document.removeEventListener('keydown', escape)
  }, [postId, onClose])

  if (!postId || !post) return null

  const hasContent = Array.isArray(post.body)
    ? post.body.length > 0
    : Object.keys((post.body ?? {}) as Record<string, unknown>).length > 0

  const patch = (p: SettingsPatch) => {
    // The panel's template is a free string; the editor casts the same way.
    setPost((prev) => (prev ? { ...prev, ...(p as Partial<PostDetail>) } : prev))
    const w = updatePost(post.id, p as Parameters<typeof updatePost>[1])
    writes.current.add(w)
    void w.finally(() => writes.current.delete(w)).catch((e: Error) => onError(e.message))
    setDirty(true)
  }
  const live = post.status === 'published'

  return (
    <>
      <div aria-hidden onMouseDown={onClose} style={{ position: 'fixed', inset: 0, zIndex: 19, background: shown ? 'rgba(35, 33, 26, 0.18)' : 'transparent', transition: 'background .2s ease' }} />
      <PostSettings
        open={shown}
        onClose={onClose}
        post={post}
        byline={byline}
        modules={modules}
        topics={topics}
        template={resolveTemplate(post)}
        canChangeTemplate={!hasContent}
        derivedSlug={addresses.slugOf(post.id)}
        onPatch={patch}
        onSave={async () => void (await Promise.all([...writes.current]))}
        publishLabel={live ? (post.has_draft || dirty ? 'Đăng thay đổi' : null) : post.status === 'draft' ? 'Publish' : null}
        onPublish={async () => {
          await transitionStatus(post.id, 'publish')
          // The list reloads on close and shows the post where it now lives.
          onClose()
        }}
        onSlug={async (slug) => {
          try {
            const saved = await updatePost(post.id, { slug })
            setPost((prev) => (prev ? { ...prev, slug: saved.slug ?? null } : prev))
            return null
          } catch (e) {
            return (e as Error).message
          }
        }}
      />
    </>
  )
}
