import { useState } from 'react'

/**
 * The row of site tabs (Journal | Port | …) that splits an admin screen
 * by site. Cài đặt hiển thị had it first; the owner asked for the same bar on
 * Cấu hình, so both screens draw this one and they cannot drift apart.
 */
export function SiteTabs<T extends string>({ tabs, labels, value, onChange }: { tabs: readonly T[]; labels: Record<T, string>; value: T; onChange: (t: T) => void }) {
  return (
    <div role="tablist" className="ab-seg">
      {tabs.map((s) => (
        <button key={s} type="button" role="tab" aria-selected={value === s} onClick={() => onChange(s)}>
          {labels[s]}
        </button>
      ))}
    </div>
  )
}

/** Hiển thị's three rows in the sidebar (owner, 2026-10-16), once the tabs of Cài đặt hiển thị; the open one is remembered. */
export const DISPLAY_TABS = ['blog', 'port', 'routes'] as const
export type DisplayTab = (typeof DISPLAY_TABS)[number]
export const DISPLAY_LABELS: Record<DisplayTab, string> = { blog: 'Journal', port: 'Portfolio', routes: 'Đường dẫn' }
export const DISPLAY_TAB_KEY = 'beanweirdo.display.site'

/** The tab last open on this screen; storage is a convenience, so any failure falls back to the first tab. */

export function useRememberedTab<T extends string>(key: string, tabs: readonly T[]): [T, (t: T) => void] {
  const [tab, setTab] = useState<T>(() => {
    try {
      const v = localStorage.getItem(key)
      return tabs.find((t) => t === v) ?? tabs[0]
    } catch {
      return tabs[0]
    }
  })
  const set = (t: T) => {
    setTab(t)
    try {
      localStorage.setItem(key, t)
    } catch {
      /* a remembered tab is a convenience */
    }
  }
  return [tab, set]
}
