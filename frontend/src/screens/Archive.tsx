import { allPosts } from '../content/modules'
import { ink, layout, paper, sans, serif } from '../design/tokens'
import { Hover } from '../lib/Hover'
import { useNav } from '../lib/nav'

/** Every post, sorted newest first — the flat list behind the modules. */
export function Archive() {
  const nav = useNav()

  return (
    <div style={{ padding: '76px 56px 130px', maxWidth: layout.page - 40 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          paddingBottom: 16,
          borderBottom: `3px solid ${ink.base}`,
        }}
      >
        <h1
          style={{
            fontFamily: serif,
            fontSize: 72,
            lineHeight: 0.94,
            letterSpacing: '-.04em',
            margin: 0,
          }}
        >
          Archive
        </h1>
        <div style={{ fontFamily: sans, fontSize: 11, color: ink.muted, paddingBottom: 8 }}>
          {allPosts.length} notes — sắp theo thời gian
        </div>
      </div>

      {allPosts.map((p, i) => (
        <Hover
          key={i}
          onClick={nav.openArticle}
          style={{
            display: 'grid',
            gridTemplateColumns: '56px 128px minmax(0,1fr) minmax(0,1fr) 70px',
            alignItems: 'center',
            gap: 18,
            padding: '12px 10px',
            borderBottom: `1px solid ${paper.rule}`,
            cursor: 'pointer',
            borderLeft: '3px solid transparent',
          }}
          hoverStyle={{ background: paper.white, borderLeft: `3px solid ${ink.green}` }}
        >
          <div style={{ fontFamily: sans, fontSize: 10, color: ink.faint }}>{p.date}</div>
          <div
            style={{
              fontFamily: sans,
              fontSize: 9.5,
              background: p.accent,
              color: p.on,
              padding: '4px 8px',
              width: 'fit-content',
              textTransform: 'uppercase',
              letterSpacing: '.06em',
            }}
          >
            {p.mod}
          </div>
          <div style={{ fontFamily: serif, fontSize: 20, letterSpacing: '-.015em' }}>{p.en}</div>
          <div style={{ fontSize: 12.5, color: ink.muted }}>{p.vi}</div>
          <div
            style={{
              fontFamily: sans,
              fontSize: 10,
              color: ink.faint,
              textAlign: 'right',
              textTransform: 'uppercase',
            }}
          >
            {p.kind}
          </div>
        </Hover>
      ))}
    </div>
  )
}
