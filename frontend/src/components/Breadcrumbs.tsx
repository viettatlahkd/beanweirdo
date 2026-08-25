import type { CSSProperties } from 'react'
import { useModules } from '../data/useModules'
import { useSiteCopy } from '../data/useSiteCopy'
import { sans } from '../design/tokens'
import { buildCrumbs, crumbBack } from '../lib/crumbs'
import { useNav } from '../lib/nav'

/**
 * The trail that opens every screen: a `←` back arrow, then each stop the
 * reader passed through. Only the colour changes between screens, so the caller
 * passes its own ink and the bar inherits everything else.
 */
export function Breadcrumbs({
  color,
  opacity,
  style,
  trailing,
  moduleId,
  onParent,
}: {
  color?: string
  /** The name of the thing being looked at — a post's own title, say. */
  trailing?: string
  /** Which module the reader came through, when the screen alone cannot say. */
  moduleId?: string
  /** How to close a layer the screen owns — see `parentGo` in buildCrumbs. */
  onParent?: () => void
  /** Screens on a colour block dim the whole bar instead of recolouring it. */
  opacity?: number
  style?: CSSProperties
}) {
  const nav = useNav()
  const { data: modules } = useModules()
  const { site } = useSiteCopy()

  const crumbs = buildCrumbs(nav, modules, site.sections, { trailing, moduleId, parentGo: onParent })
  const back = crumbBack(nav, moduleId)

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
        fontFamily: sans,
        fontSize: 10,
        letterSpacing: '.14em',
        textTransform: 'uppercase',
        marginBottom: 24,
        color,
        opacity,
        ...style,
      }}
    >
      <div onClick={back} style={{ cursor: 'pointer', paddingRight: 6 }}>
        ←
      </div>
      {crumbs.map((c, i) => (
        <div key={`${c.label}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            onClick={c.go}
            style={{ cursor: c.go ? 'pointer' : 'default', opacity: i === crumbs.length - 1 ? 1 : 0.6 }}
          >
            {c.label}
          </div>
          {i < crumbs.length - 1 && <div style={{ opacity: 0.4 }}>›</div>}
        </div>
      ))}
    </div>
  )
}
