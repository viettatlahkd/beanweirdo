import { useCallback, useEffect, useState } from 'react'
import { parsePath, toPath, type Where } from './routes'

/** What the address bar currently says. */
const read = (): Where => parsePath(window.location.pathname, window.location.search)
const now = () => window.location.pathname + window.location.search

/**
 * The screen, kept in the address bar.
 *
 * Every move writes a history entry, which is the whole point: the browser's
 * own back and forward buttons only work on entries, and until now the site
 * made exactly one — at load. Walking four pages in and pressing back left the
 * site altogether, because as far as the browser knew nothing had happened
 * since the page opened.
 *
 * The address is the source of truth on the way back in, so a step backwards
 * and a link pasted into a fresh tab land in the same place by the same code.
 */
export function useRoute(): [Where, (next: Where) => void] {
  const [where, setWhere] = useState(read)

  useEffect(() => {
    // The address that was typed is not always the one this place is written
    // as — `/admin` for the back office, an unknown path, a stray query.
    // Straighten it with `replace`: the reader has not taken a step, so this
    // must not become an entry of its own that back would have to walk past.
    const canonical = toPath(read())
    if (canonical !== now()) window.history.replaceState({}, '', canonical)

    const sync = () => setWhere(read())
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])

  const go = useCallback((next: Where) => {
    const path = toPath(next)
    // Landing on the address already open is not a step. Pushing it would make
    // back press twice to leave one page — the commonest way a history stack
    // turns useless.
    if (path === now()) window.history.replaceState({}, '', path)
    else window.history.pushState({}, '', path)
    setWhere(next)
  }, [])

  return [where, go]
}
