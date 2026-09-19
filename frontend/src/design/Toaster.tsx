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
 * One region, bottom right, `aria-live="polite"` so a screen reader hears it
 * without being interrupted mid-sentence.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { garden, ink, paper, sans } from './tokens'
import { radius } from './controls'
import { IconAlert, IconCheck, IconClose } from './icons'

type Tone = 'ok' | 'error' | 'info'
type Toast = { id: number; tone: Tone; text: string }

export type Toaster = {
  ok: (text: string) => void
  error: (text: string) => void
  info: (text: string) => void
  /** Reports whatever a rejected promise carried, without each caller unwrapping it. */
  fromError: (e: unknown) => void
}

/*
 * The default is a working no-op rather than a thrown "missing provider".
 * Every component here is also rendered on its own by a test and by the
 * editor's preview, and a save that throws because nothing is listening for
 * the receipt would be a worse failure than a receipt nobody reads.
 */
const NOOP: Toaster = { ok: () => {}, error: () => {}, info: () => {}, fromError: () => {} }

const ToastContext = createContext<Toaster>(NOOP)

export const useToast = () => useContext(ToastContext)

/** How long a toast stays before it clears itself. Errors never do — see below. */
const DWELL_MS = 4000

const TONE: Record<Tone, { background: string; border: string; color: string }> = {
  ok: { background: garden.leafTint, border: garden.leaf, color: garden.moss },
  error: { background: garden.petalTint, border: ink.dangerLine, color: ink.danger },
  info: { background: paper.white, border: ink.faint, color: ink.strong },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([])
  const next = useRef(1)

  const dismiss = useCallback((id: number) => {
    setItems((xs) => xs.filter((x) => x.id !== id))
  }, [])

  const push = useCallback(
    (tone: Tone, text: string) => {
      const id = next.current++
      setItems((xs) => xs.concat([{ id, tone, text }]))
      /*
       * An error stays until it is dismissed. The other two are receipts for
       * something the user just did and already expected; an error is news, and
       * news that clears itself after four seconds is news nobody read.
       */
      if (tone !== 'error') window.setTimeout(() => dismiss(id), DWELL_MS)
    },
    [dismiss],
  )

  const api = useMemo<Toaster>(
    () => ({
      ok: (t) => push('ok', t),
      error: (t) => push('error', t),
      info: (t) => push('info', t),
      fromError: (e) => push('error', e instanceof Error ? e.message : String(e)),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        style={{
          position: 'fixed',
          right: 20,
          bottom: 20,
          zIndex: 60,
          display: 'flex',
          flexDirection: 'column',
          gap: 9,
          alignItems: 'flex-end',
          maxWidth: 'min(380px, calc(100vw - 40px))',
          pointerEvents: 'none',
        }}
      >
        {items.map((t) => {
          const paint = TONE[t.tone]
          return (
            <div
              key={t.id}
              role={t.tone === 'error' ? 'alert' : undefined}
              style={{
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontFamily: sans,
                fontSize: 12.5,
                lineHeight: 1.4,
                padding: '10px 13px',
                borderRadius: radius,
                border: `1px solid ${paint.border}`,
                background: paint.background,
                color: paint.color,
                boxShadow: '0 2px 6px rgba(35, 33, 26, .07)',
              }}
            >
              {t.tone === 'error' && <IconAlert size={16} />}
              {t.tone === 'ok' && <IconCheck size={16} />}
              <span style={{ minWidth: 0 }}>{t.text}</span>
              {t.tone === 'error' && (
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  aria-label="Đóng"
                  style={{
                    marginLeft: 'auto',
                    background: 'none',
                    border: 'none',
                    padding: 2,
                    cursor: 'pointer',
                    color: 'inherit',
                    flex: 'none',
                  }}
                >
                  <IconClose size={14} />
                </button>
              )}
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
