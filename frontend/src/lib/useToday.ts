import { useEffect, useState } from 'react'
import { todayStr } from '../content/hours'

/**
 * Today's date, kept true while the tab stays open.
 *
 * It used to be read once on mount. A journal is a tab people leave open —
 * across a night, across a weekend — and after midnight every reading of
 * "today" was yesterday: the header totalled the wrong day, and a session
 * finished in the morning was filed under the day before.
 *
 * Two things move it. A minute timer catches the rollover while someone is
 * looking, and `visibilitychange` catches the far more common case: the tab
 * was buried for hours and is only now being looked at again. Both compare
 * before they set, so a quiet day costs nothing but the comparison.
 */
export function useToday(): string {
  const [today, setToday] = useState(todayStr)

  useEffect(() => {
    const check = () => setToday((prev) => {
      const now = todayStr()
      return now === prev ? prev : now
    })

    const id = window.setInterval(check, 60_000)
    document.addEventListener('visibilitychange', check)
    window.addEventListener('focus', check)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', check)
      window.removeEventListener('focus', check)
    }
  }, [])

  return today
}
