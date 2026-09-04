import type { CSSProperties } from 'react'
import { displayNumber, postDescription } from '../lib/postText'
import { useMemo } from 'react'
import type { ModuleRow } from '../data/useModules'
import { indexModules, useModules } from '../data/useModules'
import type { PostRow } from '../data/usePublishedPosts'
import { usePublishedPosts } from '../data/usePublishedPosts'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { useSiteCopy } from '../data/useSiteCopy'
import { coverStyle } from '../lib/imageFocus'
import { garden, ink, paper, prose, sans, serif, wrapTitle } from '../design/tokens'
import { Hover } from '../lib/Hover'
import { rowPad, useNav, useSettings } from '../lib/nav'
import { openPost } from '../lib/openPost'
import { openModule } from '../lib/moduleTarget'
import { useIsMobile } from '../lib/useIsMobile'

const label: CSSProperties = {
  fontFamily: sans,
  fontSize: 10,
  letterSpacing: '.14em',
  textTransform: 'uppercase',
  color: ink.muted,
}

const switcher: CSSProperties = {
  ...label,
  cursor: 'pointer',
  display: 'inline-block',
  borderBottom: `1px solid ${paper.rule}`,
  paddingBottom: 3,
}

/**
 * The three opening plates — one per module concept, in module order. Caption
 * and photo both come from the CMS; the colour is what shows until a photo is
 * uploaded, so an empty site still reads as designed.
 */
const plateFallback = [
  { bg: garden.blush, fg: '#3B2A2B' },
  { bg: garden.leaf, fg: '#1F3323' },
  { bg: garden.apricot, fg: '#3B2E19' },
]

function usePlates() {
  const { site } = useSiteCopy()
  const captions = [site.plate1, site.plate2, site.plate3]
  const photos = [site.plateImg1, site.plateImg2, site.plateImg3]
  return plateFallback.map((p, i) => ({
    ...p,
    caption: captions[i],
    fill: photos[i] ? coverStyle(photos[i]) : { background: p.bg },
  }))
}

/** Groups posts by `module_id`, preserving each module's `sort_order`. */
function groupByModule(posts: PostRow[]): Map<string, PostRow[]> {
  const map = new Map<string, PostRow[]>()
  for (const p of posts) {
    const list = map.get(p.module_id)
    if (list) list.push(p)
    else map.set(p.module_id, [p])
  }
  return map
}

type ModulesProps = { modules: ModuleRow[]; postsByModule: Map<string, PostRow[]> }

/** A — the ledger. Reads top to bottom like the contents page of a notebook. */
function Ledger({ modules, postsByModule }: ModulesProps) {
  const nav = useNav()
  const { density, showPlates } = useSettings()
  const pad = rowPad(density)
  const { site } = useSiteCopy()
  const plates = usePlates()
  const mob = useIsMobile()

  return (
    <div>
      <div style={{ padding: mob ? '28px 20px 30px' : '44px 56px 38px', maxWidth: 1240 }}>
        <Breadcrumbs color={ink.muted} />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: mob ? 'minmax(0,1fr)' : 'minmax(0,1.6fr) minmax(0,1fr)',
            gap: mob ? 20 : 44,
            alignItems: mob ? 'start' : 'end',
          }}
        >
          <h1
            style={{
              fontFamily: serif,
              fontSize: mob ? 50 : 108,
              lineHeight: 0.9,
              letterSpacing: '-.035em',
              margin: 0,
            }}
          >
            {site.t1}
            <br />
            <span style={{ fontStyle: 'italic', color: ink.green }}>{site.t2}</span>
          </h1>
          <div style={{ paddingBottom: 14 }}>
            <div style={{ fontSize: 14, lineHeight: 1.45, color: ink.mid, marginBottom: 14, ...prose }}>
              {site.blurb}
            </div>
            <Hover
              onClick={nav.toggleVariant}
              style={switcher}
              hoverStyle={{ color: ink.green }}
            >
              xem dạng cột →
            </Hover>
          </div>
        </div>
      </div>

      {showPlates && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: mob
              ? 'minmax(0,1fr) minmax(0,1fr)'
              : 'minmax(0,2fr) minmax(0,1fr) minmax(0,1fr)',
            gap: 0,
          }}
        >
          {plates.map((p, pi) => (
            <div
              key={p.caption}
              style={{
                aspectRatio: '16/9',
                // Hẹp: tấm đầu nằm trọn một hàng, hai tấm sau chia đôi hàng dưới.
                // Ba tấm bằng nhau ở 390px thì mỗi tấm rộng 130 — quá nhỏ để đọc.
                ...(mob && pi === 0 ? { gridColumn: '1 / 3' } : null),
                ...p.fill,
                display: 'flex',
                alignItems: 'flex-end',
                padding: 16,
              }}
            >
              <div style={{ fontFamily: sans, fontSize: 10, color: p.fg }}>{p.caption}</div>
            </div>
          ))}
        </div>
      )}

      {modules.map((m) => {
        const entries = postsByModule.get(m.id) ?? []
        return (
          <div key={m.id} style={{ padding: mob ? '34px 20px 6px' : '44px 56px 8px', maxWidth: 1240 }}>
            <div
              style={{
                display: 'flex',
                alignItems: mob ? 'stretch' : 'flex-end',
                flexDirection: mob ? 'column' : 'row',
                gap: mob ? 10 : 18,
                paddingBottom: 14,
              }}
            >
              <Hover
          lang="en"
                as="h2"
                onClick={() => openModule(nav, m)}
                style={{
                  fontFamily: serif,
                  fontSize: mob ? 34 : 44,
                  lineHeight: 1,
                  letterSpacing: '-.028em',
                  margin: 0,
                  cursor: 'pointer',
                  // Hẹp: gạch chân ôm đúng cái tên chứ không kéo hết hàng.
                  alignSelf: mob ? 'flex-start' : undefined,
                  borderBottom: `${mob ? 5 : 6}px solid ${m.accent}`,
                  ...wrapTitle,
                }}
                hoverStyle={{ color: ink.green }}
              >
                {m.title}
              </Hover>
              <div
                style={{
                  display: 'contents',
                  ...(mob ? { display: 'flex', alignItems: 'center', gap: 12 } : null),
                }}
              >
                <div style={{ fontFamily: sans, fontSize: 11, color: ink.muted, paddingBottom: mob ? 0 : 6, flex: 'none' }}>
                  {entries.length} bài
                </div>
                <div style={{ flex: 1, height: 1, background: paper.rule, marginBottom: mob ? 0 : 8 }} />
                <div style={{ ...label, paddingBottom: mob ? 0 : 6, flex: 'none' }}>{m.concept}</div>
              </div>
            </div>

            <div
              style={{
                fontSize: 14,
                lineHeight: 1.35,
                color: ink.soft,
                maxWidth: 600,
                ...prose,
                margin: '0 0 18px',
              }}
            >
              {m.blurb}
            </div>

            {entries.map((e, i) => (
              <Hover
                key={e.id}
                onClick={() => openPost(nav, e)}
                style={{
                  display: 'grid',
                  // Hẹp: năm cột thành ba dòng — số + tên · mô tả · loại và ngày.
                  gridTemplateColumns: mob
                    ? '26px minmax(0,1fr) minmax(0,auto)'
                    : '44px minmax(0,1fr) minmax(0,1.05fr) 72px 56px',
                  alignItems: 'baseline',
                  gap: mob ? '6px 10px' : 18,
                  padding: mob ? `12px 8px` : `${pad} 12px ${pad} 10px`,
                  borderTop: `1px solid ${paper.rule}`,
                  cursor: 'pointer',
                  borderLeft: '3px solid transparent',
                }}
                hoverStyle={{ background: paper.white, borderLeft: `3px solid ${ink.green}` }}
              >
                <div style={{ fontFamily: sans, fontSize: 11, color: ink.faint, gridArea: mob ? '1 / 1' : undefined }}>{displayNumber(i)}</div>
                <div style={{ fontFamily: serif, fontSize: mob ? 21 : 23, letterSpacing: '-.015em', lineHeight: mob ? 1.15 : undefined, gridArea: mob ? '1 / 2 / 2 / 4' : undefined }}>{e.en}</div>
                <div style={{ fontSize: 13, color: ink.soft, lineHeight: 1.2, gridArea: mob ? '2 / 2 / 3 / 4' : undefined }}>{postDescription(e)}</div>
                <div
                  style={{
                    fontFamily: sans,
                    fontSize: 10,
                    color: ink.muted,
                    letterSpacing: '.05em',
                    textTransform: 'uppercase',
                    gridArea: mob ? '3 / 2' : undefined,
                  }}
                >
                  {e.kind}
                </div>
                <div
                  style={{ fontFamily: sans, fontSize: 10, color: ink.faint, textAlign: 'right', gridArea: mob ? '3 / 3' : undefined }}
                >
                  {e.date_label}
                </div>
              </Hover>
            ))}
            <div style={{ borderTop: `1px solid ${paper.rule}` }} />
          </div>
        )
      })}
      <div style={{ height: 80 }} />
    </div>
  )
}

/** B — three parallel columns. Easier to compare modules side by side. */
function Columns({ modules, postsByModule }: ModulesProps) {
  const nav = useNav()
  const { showPlates } = useSettings()
  const { site } = useSiteCopy()
  const mob = useIsMobile()

  return (
    <div style={{ padding: mob ? '28px 20px 40px' : '44px 56px 130px', maxWidth: 1340 }}>
      <Breadcrumbs color={ink.muted} />

      <h1
        style={{
          fontFamily: serif,
          fontSize: mob ? 50 : 108,
          lineHeight: 0.9,
          letterSpacing: '-.035em',
          margin: '0 0 16px',
        }}
      >
        {site.t1} <span style={{ fontStyle: 'italic', color: ink.green }}>{site.t2}</span>
      </h1>
      <div
        style={{
          maxWidth: 440,
          fontSize: 14,
          lineHeight: 1.45,
          color: ink.mid,
          marginBottom: 14,
          ...prose,
        }}
      >
        {site.blurbShort}
      </div>
      <Hover
        onClick={nav.toggleVariant}
        style={{ ...switcher, marginBottom: mob ? 28 : 44 }}
        hoverStyle={{ color: ink.green }}
      >
        xem dạng danh sách →
      </Hover>

      {/*
        Ba cột xếp chồng khi hẹp. Cái giữ cho nó vẫn khác Trang chủ là tấm kem
        4:3 nằm TRONG khối màu và không có dải ảnh tràn viền ở cuối mỗi khối —
        bỏ tấm ấy đi thì hai màn thành một.
      */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: mob ? 'minmax(0,1fr)' : 'repeat(3,minmax(0,1fr))',
          gap: 0,
        }}
      >
        {modules.map((m) => {
          const entries = postsByModule.get(m.id) ?? []
          return (
            <div
              key={m.id}
              style={{ background: m.accent, color: m.on_color, padding: mob ? '24px 20px 28px' : '26px 24px 30px' }}
            >
              <div
                style={{
                  fontFamily: sans,
                  fontSize: 10,
                  letterSpacing: '.16em',
                  textTransform: 'uppercase',
                  opacity: 0.7,
                  marginBottom: 10,
                }}
              >
                {m.concept}
              </div>
              <h2
          lang="en"
                onClick={() => openModule(nav, m)}
                style={{
                  fontFamily: serif,
                  fontSize: mob ? 38 : 46,
                  lineHeight: 1,
                  letterSpacing: '-.03em',
                  margin: '0 0 14px',
                  cursor: 'pointer',
                  ...wrapTitle,
                }}
              >
                {m.title}
              </h2>
              <div style={{ fontSize: 13.5, lineHeight: 1.35, marginBottom: 20, ...prose }}>{m.blurb}</div>

              {showPlates && (
                /*
                 * Ảnh của module, không phải một ô kem trống. Dạng cột vẽ cái
                 * khung này từ đầu mà chưa bao giờ đọc `img1` — ảnh vẫn nằm
                 * trong CMS, chỉ là bề mặt này không lấy. Và chú thích chỉ vẽ
                 * khi có chữ: cái nền mờ tồn tại để chữ đọc được trên ảnh.
                 */
                <div
                  style={{
                    aspectRatio: '4/3',
                    marginBottom: 20,
                    ...(m.img1 ? coverStyle(m.img1) : { background: paper.cream }),
                    display: 'flex',
                    alignItems: 'flex-end',
                    padding: 12,
                  }}
                >
                  {m.shot1 && (
                    <div
                      style={{
                        fontFamily: sans,
                        fontSize: 10,
                        lineHeight: 1.3,
                        color: m.img1 ? paper.cream : ink.strong,
                        background: m.img1 ? 'rgba(24,22,17,.55)' : undefined,
                        padding: m.img1 ? '3px 7px' : undefined,
                      }}
                    >
                      {m.shot1}
                    </div>
                  )}
                </div>
              )}

              {entries.map((e, i) => (
                <div
                  key={e.id}
                  onClick={() => openPost(nav, e)}
                  style={{
                    display: 'flex',
                    gap: 12,
                    padding: '11px 0',
                    borderTop: '1px solid rgba(35,33,26,.16)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontFamily: sans, fontSize: 10, opacity: 0.6, paddingTop: 6 }}>
                    {displayNumber(i)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontFamily: serif,
                        fontSize: 21,
                        lineHeight: 1.2,
                        letterSpacing: '-.015em',
                      }}
                    >
                      {e.en}
                    </div>
                    <div
                      style={{ fontSize: 12.5, lineHeight: 1.2, marginTop: 3, opacity: 0.82 }}
                    >
                      {postDescription(e)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Mục lục — the table of contents, in whichever shape is selected. */
export function IndexScreen() {
  const { variant } = useNav()
  const { data: allModules } = useModules()
  const modules = indexModules(allModules)
  const { data: posts } = usePublishedPosts()
  const postsByModule = useMemo(() => groupByModule(posts), [posts])

  return variant === 'A' ? (
    <Ledger modules={modules} postsByModule={postsByModule} />
  ) : (
    <Columns modules={modules} postsByModule={postsByModule} />
  )
}
