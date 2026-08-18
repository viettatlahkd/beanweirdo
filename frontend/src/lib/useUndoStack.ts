import { useCallback, useEffect, useRef } from 'react'

/** One reversible operation: how to take it back, and how to put it back. */
export type UndoEntry = {
  /** Short description of what was done — for a future toast, and for debugging. */
  label: string
  undo(): void | Promise<void>
  redo(): void | Promise<void>
}

/** System conventions, rule 08: the last five, and nothing beyond the page. */
export const UNDO_DEPTH = 5

/**
 * Ctrl+Z / Ctrl+Shift+Z over the last five writes.
 *
 * The rule pairs this with "xoá thẳng, không hỏi lại" — delete outright, never
 * ask. That trade only works if taking it back is genuinely one keystroke away,
 * so undo is what a confirmation dialog would have been.
 *
 * Deliberately not persisted: the stack dies with the page. A history that
 * outlives what you were looking at invites undoing something you can no longer
 * see, which is worse than not offering it.
 */
export function useUndoStack(enabled = true) {
  const undoStack = useRef<UndoEntry[]>([])
  const redoStack = useRef<UndoEntry[]>([])

  const record = useCallback((entry: UndoEntry) => {
    undoStack.current = undoStack.current.concat([entry]).slice(-UNDO_DEPTH)
    // A fresh action makes any redo branch unreachable.
    redoStack.current = []
  }, [])

  const undo = useCallback(async () => {
    const entry = undoStack.current[undoStack.current.length - 1]
    if (!entry) return
    undoStack.current = undoStack.current.slice(0, -1)
    redoStack.current = redoStack.current.concat([entry]).slice(-UNDO_DEPTH)
    await entry.undo()
  }, [])

  const redo = useCallback(async () => {
    const entry = redoStack.current[redoStack.current.length - 1]
    if (!entry) return
    redoStack.current = redoStack.current.slice(0, -1)
    undoStack.current = undoStack.current.concat([entry]).slice(-UNDO_DEPTH)
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
