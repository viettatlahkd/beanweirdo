import { Breadcrumbs } from '../components/Breadcrumbs'
import { useModules } from '../data/useModules'
import { usePublishedPosts } from '../data/usePublishedPosts'
import { useSiteCopy } from '../data/useSiteCopy'
import { ink, layout, paper, sans, serif } from '../design/tokens'
import { Hover } from '../lib/Hover'
import { useNav } from '../lib/nav'

/**
 * Every post the site holds, newest first — the flat list behind the modules.
 *
 * Unlike every other listing this one includes archived posts: they are a
 * record of what has been written, not part of the reading list. They are drawn
 * dimmed and lead nowhere, because there is nothing at the other end.
 */
export function Archive() {
  const nav = useNav()
  const { data: modules } = useModules()
  const { data: posts } = usePublishedPosts({
    orderBy: 'date_label',
    ascending: false,
    includeArchived: true,
  })
  const { site } = useSiteCopy()
  const liveCount = posts.filter((p) => p.status === 'published').length

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
          {liveCount} notes — {site.archiveNote}
          {posts.length > liveCount && ` · ${posts.length - liveCount} lưu trữ`}
        </div>
      </div>

      {posts.map((p) => {
        const mod = modules.find((m) => m.id === p.module_id)
        const archived = p.status === 'archived'
        return (
          <Hover
            key={p.id}
            onClick={archived ? undefined : () => nav.openArticle(p.id)}
            style={{
              display: 'grid',
              gridTemplateColumns: '56px 128px minmax(0,1fr) minmax(0,1fr) 70px',
              alignItems: 'center',
              gap: 18,
              padding: '12px 10px',
              borderBottom: `1px solid ${paper.rule}`,
              cursor: archived ? 'default' : 'pointer',
              borderLeft: '3px solid transparent',
              opacity: archived ? 0.45 : 1,
            }}
            hoverStyle={archived ? undefined : { background: paper.white, borderLeft: `3px solid ${ink.green}` }}
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
              {archived ? 'lưu trữ' : p.kind}
            </div>
          </Hover>
        )
      })}
    </div>
  )
}
