import { useState } from 'react'

/**
 * The row of site tabs (Personal Blog | Port | …) that splits an admin screen
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
