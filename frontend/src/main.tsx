import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { areaFromPath } from './lib/area'
import './global.css'
import './admin/admin.css'

/**
 * No router: the area is picked from the pathname once, and every screen
 * inside it is chosen by local state (see `lib/nav.tsx`).
 *
 * Three entry points — `/` is the public journal, `/practice` and `/admin` are
 * behind one shared login. They are separate URLs rather than hidden rows in a
 * sidebar so that an unauthenticated visitor has no route into them at all;
 * crossing between areas is a real page load, which re-runs the auth check.
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App area={areaFromPath()} />
  </StrictMode>,
)
