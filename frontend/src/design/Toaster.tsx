/**
 * What the back office says back.
 *
 * It said nothing. Each component held its own `error` in state and drew it its
 * own way — a pink band across the top of Cms that pushed the whole page down,
 * a red line inside PostsPanel, a `<p role="alert">` in Login — and success was
 * silent everywhere. That last part is the expensive one: most fields on Sửa
 * nội dung save on `onBlur`, so the writer types, clicks away, and gets no sign
 * that anything was written.
 *
 * One card at the centre of the screen, the way the new-post dialog sits —
 * the owner (2026-09-24): "toast gì để góc trang thế … hiện lên như wizard ở
 * center trang". A corner receipt was easy to miss exactly when it mattered,
 * after Publish. Only one card shows at a time: a stack in the middle of the
 * page would cover the page. `aria-live="polite"` so a screen reader hears it
 * without being interrupted mid-sentence.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { garden, ink, paper, sans } from './tokens'
import { radius } from './controls'
import { IconAlert, IconCheck, IconInfo } from './icons'

type Tone = 'ok' | 'error' | 'info' | 'busy'
type Toast = { id: number; tone: Tone; text: string }

/** A card that says work is running, then turns into its outcome in place. */
type Pending = {
  ok: (text: string) => void
  fail: (e: unknown) => void
}

type Toaster = {
  ok: (text: string) => void
  error: (text: string) => void
  info: (text: string) => void
  /** Reports whatever a rejected promise carried, without each caller unwrapping it. */
  fromError: (e: unknown) => void
  /**
   * For work the owner waits on (Publish): the card appears the moment they
   * click, so a slow network reads as "working", not as a dead button.
   */
  busy: (text: string) => Pending
}

/*
 * The default is a working no-op rather than a thrown "missing provider".
 * Every component here is also rendered on its own by a test and by the
 * editor's preview, and a save that throws because nothing is listening for
 * the receipt would be a worse failure than a receipt nobody reads.
 */
const NOOP: Toaster = {
  ok: () => {},
  error: () => {},
  info: () => {},
  fromError: () => {},
  busy: () => ({ ok: () => {}, fail: () => {} }),
}

const ToastContext = createContext<Toaster>(NOOP)

export const useToast = () => useContext(ToastContext)

/** How long a receipt stays. Short: it sits over the page. Errors never clear themselves — see below. */
const DWELL_MS = { ok: 2200, info: 3600 } as const

const TONE: Record<Tone, { tint: string; mark: string; title: string | null }> = {
  ok: { tint: garden.leafTint, mark: garden.moss, title: null },
  info: { tint: garden.honeyTint, mark: ink.border, title: null },
  busy: { tint: paper.rule, mark: ink.border, title: null },
  // An error's text is often a server message; a plain headline goes above it.
  error: { tint: garden.petalTint, mark: ink.danger, title: 'Chưa làm được' },
}

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e))

export function ToastProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<Toast | null>(null)
  const next = useRef(1)
  const timer = useRef<number | undefined>(undefined)

  const dismiss = useCallback((id?: number) => {
    setCurrent((c) => (id === undefined || c?.id === id ? null : c))
  }, [])

  const show = useCallback(
    (tone: Tone, text: string, id = next.current++) => {
      window.clearTimeout(timer.current)
      setCurrent({ id, tone, text })
      /*
       * An error stays until it is dismissed, and so does a busy card until its
       * work answers. The other two are receipts for something the owner just
       * did; an error is news, and news that clears itself is news nobody read.
       */
      if (tone === 'ok' || tone === 'info') timer.current = window.setTimeout(() => dismiss(id), DWELL_MS[tone])
      return id
    },
    [dismiss],
  )

  const api = useMemo<Toaster>(
    () => ({
      ok: (t) => void show('ok', t),
      error: (t) => void show('error', t),
      info: (t) => void show('info', t),
      fromError: (e) => void show('error', errorText(e)),
      busy: (t) => {
        const id = show('busy', t)
        return {
          ok: (text) => void show('ok', text, id),
          fail: (e) => void show('error', errorText(e), id),
        }
      },
    }),
    [show],
  )

  // Esc closes an error, as it closes the dialogs.
  useEffect(() => {
    if (current?.tone !== 'error') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [current, dismiss])

  const paint = current ? TONE[current.tone] : null
  const blocking = current?.tone === 'error'

  return (
    <ToastContext.Provider value={api}>
      {children}
      <style>{TOAST_CSS}</style>
      <div
        aria-live="polite"
        // Close on pointerdown, not click: a click that started inside the card
        // (selecting its text) and ended outside would otherwise close it.
        onPointerDown={blocking ? (e) => e.target === e.currentTarget && dismiss() : undefined}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 120,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
          // Receipts let the page underneath keep working; an error asks to be read.
          pointerEvents: blocking ? 'auto' : 'none',
          background: blocking ? 'rgba(35, 33, 26, .28)' : 'transparent',
          transition: 'background .16s ease',
        }}
      >
        {current && paint && (
          <div
            key={current.id}
            className="bw-toast"
            role={current.tone === 'error' ? 'alert' : 'status'}
            style={{
              pointerEvents: 'auto',
              width: 'min(340px, 100%)',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              textAlign: 'center',
              fontFamily: sans,
              padding: '26px 24px 22px',
              borderRadius: radius,
              border: `1px solid ${ink.border}`,
              background: paper.white,
              color: ink.strong,
              boxShadow: '0 18px 48px rgba(35, 33, 26, .18), 0 2px 6px rgba(35, 33, 26, .08)',
            }}
          >
            <span
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: paint.tint,
                color: paint.mark,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {current.tone === 'ok' && <IconCheck size={20} />}
              {current.tone === 'error' && <IconAlert size={20} />}
              {current.tone === 'info' && <IconInfo size={20} />}
              {current.tone === 'busy' && <span className="bw-toast-spin" aria-hidden="true" />}
            </span>
            {paint.title && <span style={{ fontSize: 15, fontWeight: 500 }}>{paint.title}</span>}
            <span
              style={{
                fontSize: paint.title ? 13 : 14.5,
                lineHeight: 1.5,
                color: paint.title ? ink.soft : ink.strong,
                fontWeight: paint.title ? 400 : 500,
                overflowWrap: 'anywhere',
              }}
            >
              {current.text}
            </span>
            {current.tone === 'error' && (
              <button type="button" className="admin-btn-ghost" onClick={() => dismiss()} style={{ marginTop: 4 }}>
                Đóng
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  )
}

const TOAST_CSS = `
@keyframes bw-toast-in { from { opacity: 0; transform: translateY(6px) scale(.97) } to { opacity: 1; transform: none } }
@keyframes bw-toast-spin { to { transform: rotate(360deg) } }
.bw-toast { animation: bw-toast-in .18s ease-out }
.bw-toast-spin { width: 18px; height: 18px; border-radius: 50%; border: 2.2px solid currentColor; border-right-color: transparent; animation: bw-toast-spin .8s linear infinite }
@media (prefers-reduced-motion: reduce) { .bw-toast, .bw-toast-spin { animation-duration: 0s } .bw-toast-spin { animation: none } }
`
