import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { AdminApp } from './admin/AdminApp'
import './global.css'

// No router: the admin screens are a separate top-level component, chosen by
// a single pathname check. Everything under /admin gets AdminApp (its own
// internal useState screen switcher — see admin/AdminApp.tsx); every other
// path gets the public site, unchanged.
const isAdmin = window.location.pathname.startsWith('/admin')

createRoot(document.getElementById('root')!).render(
  <StrictMode>{isAdmin ? <AdminApp /> : <App />}</StrictMode>,
)
