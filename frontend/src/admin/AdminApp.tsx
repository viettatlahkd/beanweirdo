import { useMemo, useState } from 'react'
import './admin.css'
import { AdminNavContext, type AdminNav, type AdminScreen } from './lib/nav'
import { Login } from './screens/Login'
import { Dashboard } from './screens/Dashboard'
import { NewPostWizard } from './screens/NewPostWizard'
import { Editor } from './screens/Editor'
import { Preview } from './screens/Preview'
import { paper, sans } from '../design/tokens'

/**
 * Top-level shell for the /admin section — a plain useState screen switcher,
 * same pattern as the public site's `App.tsx` (via `lib/nav.tsx`). No
 * react-router: each screen is chosen by local state, not a URL.
 *
 * The one exception is the `?preview=<id>` query param, read once on mount:
 * the editor's "Xem trước ↗" link opens `/admin?preview=<id>` in a new
 * browser tab (see screens/Editor.tsx), and that fresh tab has no other way
 * to know which post to show, since screens otherwise carry no URL. Every
 * other navigation (dashboard → new/edit, editor → dashboard, login →
 * dashboard, …) goes through the nav context below.
 */
export function AdminApp() {
  const initial = useMemo(() => {
    const previewId = new URLSearchParams(window.location.search).get('preview')
    return previewId ? { screen: 'preview' as AdminScreen, postId: previewId } : { screen: 'dashboard' as AdminScreen, postId: null }
  }, [])

  const [screen, setScreen] = useState<AdminScreen>(initial.screen)
  const [postId, setPostId] = useState<string | null>(initial.postId)

  const nav = useMemo<AdminNav>(
    () => ({
      screen,
      postId,
      goLogin: () => setScreen('login'),
      goDashboard: () => {
        setPostId(null)
        setScreen('dashboard')
      },
      goNew: () => setScreen('new'),
      goEdit: (id) => {
        setPostId(id)
        setScreen('edit')
      },
      goPreview: (id) => {
        setPostId(id)
        setScreen('preview')
      },
    }),
    [screen, postId],
  )

  return (
    <AdminNavContext.Provider value={nav}>
      <div style={{ minHeight: '100vh', background: paper.cream, fontFamily: sans, fontWeight: 300 }}>
        {screen === 'login' && <Login />}
        {screen === 'dashboard' && <Dashboard />}
        {screen === 'new' && <NewPostWizard />}
        {screen === 'edit' && postId && <Editor postId={postId} />}
        {screen === 'preview' && postId && <Preview postId={postId} />}
      </div>
    </AdminNavContext.Provider>
  )
}
