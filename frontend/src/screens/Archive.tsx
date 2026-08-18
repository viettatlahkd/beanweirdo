import { Breadcrumbs } from '../components/Breadcrumbs'
import { useModules } from '../data/useModules'
import { usePublishedPosts } from '../data/usePublishedPosts'
import { useSiteCopy } from '../data/useSiteCopy'
import { ink, layout, paper, sans, serif } from '../design/tokens'
import { Hover } from '../lib/Hover'
import { useNav } from '../lib/nav'

/** Every published post, sorted newest first — the flat list behind the modules. */
export function Archive() {
  const nav = useNav()
  const { data: modules } = useModules()
  const { data: posts } = usePublishedPosts({ orderBy: 'date_label', ascending: false })
  const { site } = useSiteCopy()

  return (
    <div style={{ padding: '44px 56px 130px', maxWidth: layout.page - 40 }}>
      <Breadcrumbs color={ink.muted} />

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
          {site.archiveTitle}
        </h1>
        <div style={{ fontFamily: sans, fontSize: 11, color: ink.muted, paddingBottom: 8 }}>
          {posts.length} notes — {site.archiveNote}
        </div>
      </div>

      {posts.map((p) => {
        const mod = modules.find((m) => m.id === p.module_id)
        return (
          <Hover
            key={p.id}
            onClick={() => nav.openArticle(p.id)}
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
            <div style={{ fontFamily: sans, fontSize: 10, color: ink.faint }}>{p.date_label}</div>
            <div
              style={{
                fontFamily: sans,
                fontSize: 9.5,
                background: mod?.accent ?? paper.rule,
                color: mod?.on_color ?? ink.base,
                padding: '4px 8px',
                width: 'fit-content',
                textTransform: 'uppercase',
                letterSpacing: '.06em',
              }}
            >
              {mod?.title ?? p.module_id}
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
        )
      })}
    </div>
  )
}
