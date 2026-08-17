import { createContext, useContext } from 'react'

/**
 * Client-state screen switcher for the /admin section — same pattern as the
 * public site's `frontend/src/lib/nav.tsx` (a Nav object carried via React
 * context, no react-router). There is no per-screen URL: a fresh page load
 * always starts at 'dashboard' (or 'preview', for the one deep link — see
 * AdminApp's handling of the `?preview=<id>` query param used by the
 * editor's "open in new tab" preview link).
 */
export type AdminScreen = 'login' | 'dashboard' | 'new' | 'edit' | 'preview'

export type AdminNav = {
  screen: AdminScreen
  /** The post id the 'edit' or 'preview' screen is currently showing. */
  postId: string | null
  goLogin(): void
  goDashboard(): void
  goNew(): void
  goEdit(id: string): void
  goPreview(id: string): void
}

export const AdminNavContext = createContext<AdminNav | null>(null)

export function useAdminNav(): AdminNav {
  const nav = useContext(AdminNavContext)
  if (!nav) throw new Error('useAdminNav must be used inside <AdminNavContext.Provider>')
  return nav
}
