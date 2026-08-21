import { useCallback, useEffect, useRef } from 'react'

/** One reversible operation: how to take it back, and how to put it back. */
export type UndoEntry = {
  /** Short description of what was done — for a future toast, and for debugging. */
  label: string
  undo(): void | Promise<void>
  redo(): void | Promise<void>
}

type Held = UndoEntry & { at: number }

/** System conventions, rule 08: the last five, and nothing beyond the page. */
export const UNDO_DEPTH = 5

/**
 * How long an entry stays reversible.
 *
 * Undo is for the thing you just did. Ten minutes on, the screen has moved on
 * and Ctrl+Z would be reaching for something you can no longer see — closer to
 * a second mistake than a fix.
 */
export const UNDO_TTL_MS = 10 * 60 * 1000

/**
 * Ctrl+Z / Ctrl+Shift+Z over the last five writes.
 *
 * The rule pairs this with "xoá thẳng, không hỏi lại" — delete outright, never
 * ask. That trade only works if taking it back is genuinely one keystroke away,
 * so undo is what a confirmation dialog would have been.
 *
 * Deliberately not persisted: the stack dies with the page, and each entry dies
 * ten minutes after it was recorded. A history that outlives what you were
 * looking at invites undoing something you can no longer see — and one that
 * survives a reload would be undoing against a database another device may have
 * moved on from.
 */
export function useUndoStack(enabled = true) {
  const undoStack = useRef<Held[]>([])
  const redoStack = useRef<Held[]>([])

  /** Entries younger than the TTL, in order. */
  const fresh = (stack: Held[]) => stack.filter((e) => Date.now() - e.at < UNDO_TTL_MS)

  const record = useCallback((entry: UndoEntry) => {
    undoStack.current = fresh(undoStack.current)
      .concat([{ ...entry, at: Date.now() }])
      .slice(-UNDO_DEPTH)
    // A fresh action makes any redo branch unreachable.
    redoStack.current = []
  }, [])

  const undo = useCallback(async () => {
    undoStack.current = fresh(undoStack.current)
    const entry = undoStack.current[undoStack.current.length - 1]
    if (!entry) return
    undoStack.current = undoStack.current.slice(0, -1)
    // Taking it back is itself something you might take back, so the clock on
    // the redo entry starts now rather than when the action was first done.
    redoStack.current = redoStack.current.concat([{ ...entry, at: Date.now() }]).slice(-UNDO_DEPTH)
    await entry.undo()
  }, [])

  const redo = useCallback(async () => {
    redoStack.current = fresh(redoStack.current)
    const entry = redoStack.current[redoStack.current.length - 1]
    if (!entry) return
    redoStack.current = redoStack.current.slice(0, -1)
    undoStack.current = undoStack.current.concat([{ ...entry, at: Date.now() }]).slice(-UNDO_DEPTH)
    await entry.redo()
  }, [])

  useEffect(() => {
    if (!enabled) return

    function onKey(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return

      // Inside a text field the browser's own undo is the one you want — it
      // works on the characters you are typing, not on the last saved row.
      const el = document.activeElement as HTMLElement | null
      const typing =
        el &&
        (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
      if (typing) return

      e.preventDefault()
      void (e.shiftKey ? redo() : undo())
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled, undo, redo])

  // Leaving the page clears it — see the note above.
  useEffect(
    () => () => {
      undoStack.current = []
      redoStack.current = []
    },
    [],
  )

  return { record, undo, redo }
}
