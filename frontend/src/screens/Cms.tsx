import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { NAV, TEMPLATES_HEAD } from '../content/navItems'
import { SITE_DEFAULTS, type NavGroup, type SiteCopy, type SiteOverrides } from '../content/site'
import {
  createModule,
  deleteModule,
  listModules,
  listPosts,
  reorderModules,
  reorderPosts,
  updateModule,
  updatePost,
  updateSite,
  uploadImage,
  type Module,
  type PostSummary,
} from '../admin/lib/apiClient'
import { createPost, transitionStatus, getSite } from '../admin/lib/apiClient'
import { ink, paper, sans, serif } from '../design/tokens'
import { Hover } from '../lib/Hover'

const sectionHead: CSSProperties = {
  fontFamily: sans,
  fontSize: 10.5,
  fontWeight: 500,
  letterSpacing: '.2em',
  textTransform: 'uppercase',
  color: ink.muted,
  borderBottom: `2px solid ${ink.base}`,
  paddingBottom: 9,
  marginBottom: 18,
}

const fieldLabel: CSSProperties = {
  fontFamily: sans,
  fontSize: 10,
  letterSpacing: '.16em',
  textTransform: 'uppercase',
  color: ink.faint,
  marginBottom: 6,
}

const boxed: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  background: paper.white,
  border: `1px solid ${paper.rule}`,
  color: ink.base,
  fontFamily: sans,
  fontSize: 13,
  padding: '9px 12px',
  outline: 'none',
}

const serifInput: CSSProperties = { ...boxed, fontFamily: serif, fontSize: 22 }
const serifItalicInput: CSSProperties = { ...serifInput, fontStyle: 'italic', color: ink.green }
const area: CSSProperties = {
  ...boxed,
  fontWeight: 300,
  fontSize: 13.5,
  lineHeight: 1.5,
  padding: '10px 12px',
  resize: 'vertical',
}

const grid = (columns: string, marginBottom = 14): CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: columns,
  gap: 22,
  marginBottom,
})

const two = 'minmax(0,1fr) minmax(0,1fr)'
const three = 'repeat(3,minmax(0,1fr))'

function Field({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div>
      <div style={fieldLabel}>{label}</div>
      {children}
    </div>
  )
}

/**
 * Caption + optional photo for one image slot. The caption always exists (it
 * describes what the slot wants); the photo replaces the tinted placeholder on
 * the public screens once uploaded.
 */
function ImageSlot({
  label,
  caption,
  url,
  onCaption,
  onUpload,
  onClear,
}: {
  label: string
  caption: string
  url: string | null
  onCaption: (v: string) => void
  onUpload: (f: File) => void
  onClear: () => void
}) {
  return (
    <div>
      <div style={fieldLabel}>{label}</div>
      <input
        value={caption}
        onChange={(e) => onCaption(e.target.value)}
        style={{ ...boxed, padding: '8px 11px' }}
      />
      {url ? (
        <div
          style={{
            marginTop: 7,
            aspectRatio: '16/9',
            background: `url(${url}) center/cover no-repeat`,
            border: `1px solid ${paper.rule}`,
          }}
        />
      ) : (
        <div
          style={{
            marginTop: 7,
            aspectRatio: '16/9',
            border: `1px solid ${paper.rule}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ fontFamily: sans, fontSize: 11, color: ink.faint }}>chưa có ảnh</div>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 7 }}>
        <Hover
          as="label"
          style={{
            flex: 1,
            minWidth: 0,
            display: 'block',
            fontFamily: sans,
            fontSize: 10,
            letterSpacing: '.14em',
            textTransform: 'uppercase',
            color: ink.soft,
            border: '1px dashed #DAD7C7',
            padding: '7px 10px',
            cursor: 'pointer',
            textAlign: 'center',
          }}
          hoverStyle={{ borderColor: ink.base, color: ink.base }}
        >
          {url ? 'đổi ảnh' : 'tải ảnh lên'}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onUpload(f)
              e.target.value = ''
            }}
            style={{ display: 'none' }}
          />
        </Hover>
        {url && (
          <Hover
            onClick={onClear}
            style={{ fontFamily: sans, fontSize: 11, color: ink.faint, cursor: 'pointer', flex: 'none' }}
            hoverStyle={{ color: '#C25C7C' }}
          >
            ✕
          </Hover>
        )}
      </div>
    </div>
  )
}

/**
 * Content management — the site's own back office.
 *
 * Two tabs. "Sơ đồ trang" is a read-through map of every page in the sidebar,
 * where the three section names are editable in place. "Sửa nội dung" edits the
 * site copy, the three opening plates, and every module: its colours, its
 * layout, its image slots, and its list of posts (drag to reorder, which
 * renumbers them server-side).
 *
 * Everything saves on blur — there is no page-level save button (System
 * conventions, rule 08).
 */
export function Cms() {
  const [tab, setTab] = useState<'map' | 'content'>('map')
  const [site, setSite] = useState<SiteOverrides>({})
  const [modules, setModules] = useState<Module[]>([])
  const [posts, setPosts] = useState<PostSummary[]>([])
  const [openModule, setOpenModule] = useState<string | null>(null)
  const [dragModule, setDragModule] = useState<string | null>(null)
  const [overModule, setOverModule] = useState<string | null>(null)
  const [dragEntry, setDragEntry] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [s, m, p] = await Promise.all([getSite(), listModules(), listPosts('all')])
      setSite(s)
      setModules(m)
      setPosts(p)
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  /** Resolved copy — stored override, or the shipped default when blank. */
  const copy = useMemo(() => {
    const out = { ...SITE_DEFAULTS } as SiteCopy
    for (const [k, v] of Object.entries(site)) {
      if (k === 'sections') {
        out.sections = { ...SITE_DEFAULTS.sections, ...(v as Partial<Record<NavGroup, string>>) }
        continue
      }
      if (v !== undefined && v !== null && v !== '') (out as Record<string, unknown>)[k] = v
    }
    return out
  }, [site])

  async function saveSite(patch: SiteOverrides) {
    setSite((s) => ({ ...s, ...patch, sections: { ...s.sections, ...patch.sections } }))
    try {
      setSite(await updateSite(patch))
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const setCopy = (key: keyof SiteCopy) => (v: string) => void saveSite({ [key]: v } as SiteOverrides)

  async function savePlate(slot: 1 | 2 | 3, file: File) {
    try {
      const { url } = await uploadImage(file)
      await saveSite({ [`plateImg${slot}`]: url } as SiteOverrides)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function patchModule(id: string, patch: Partial<Module>) {
    setModules((ms) => ms.map((m) => (m.id === id ? { ...m, ...patch } : m)))
    try {
      await updateModule(id, patch)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function dropModule(targetId: string) {
    const src = dragModule
    setDragModule(null)
    setOverModule(null)
    if (!src || src === targetId) return
    const order = modules.map((m) => m.id)
    const i = order.indexOf(src)
    const j = order.indexOf(targetId)
    if (i < 0 || j < 0) return
    order.splice(j, 0, order.splice(i, 1)[0])
    setModules(order.map((id) => modules.find((m) => m.id === id)!))
    try {
      setModules(await reorderModules(order))
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const postsOf = (moduleId: string) =>
    posts.filter((p) => p.moduleId === moduleId).sort((a, b) => a.sortOrder - b.sortOrder)

  async function patchPost(id: string, patch: { en?: string; vi?: string; dateLabel?: string }) {
    setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)))
    try {
      await updatePost(id, patch)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function dropEntry(moduleId: string, targetId: string) {
    const src = dragEntry
    setDragEntry(null)
    if (!src || src === targetId) return
    const order = postsOf(moduleId).map((p) => p.id)
    const i = order.indexOf(src)
    const j = order.indexOf(targetId)
    if (i < 0 || j < 0) return
    order.splice(j, 0, order.splice(i, 1)[0])
    try {
      const updated = await reorderPosts(moduleId, order)
      setPosts((ps) => ps.filter((p) => p.moduleId !== moduleId).concat(updated))
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function addEntry(moduleId: string) {
    try {
      await createPost({ moduleId, kind: 'note', en: 'Bài mới', vi: 'Một dòng mô tả' })
      setPosts(await listPosts('all'))
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function removeEntry(id: string) {
    try {
      await transitionStatus(id, 'delete')
      setPosts((ps) => ps.filter((p) => p.id !== id))
    } catch (e) {
      setError((e as Error).message)
    }
  }

  /** The sidebar's own structure, rendered as a map. */
  const tree: { group: NavGroup; color: string; rows: { label: string; desc: string; kids: string[] }[] }[] = [
    { group: 'Public', color: ink.green, rows: [] },
    { group: 'Practice', color: '#C25C7C', rows: [] },
    { group: 'Admin', color: '#6FA8C0', rows: [] },
  ].map((g) => {
    const rows: { label: string; desc: string; kids: string[] }[] = []
    let templatesDone = false
    for (const item of NAV.filter((n) => n.group === g.group)) {
      if (g.group === 'Public' && item.key === 'notes') {
        for (const m of modules) {
          rows.push({
            label: m.title,
            desc: `module · ${m.concept}`,
            kids: postsOf(m.id).map((p) => `${p.n} · ${p.en}`),
          })
        }
      }
      if (item.sub && !templatesDone) {
        templatesDone = true
        rows.push({
          label: TEMPLATES_HEAD.label,
          desc: TEMPLATES_HEAD.desc,
          kids: NAV.filter((x) => x.group === g.group && x.sub).map((x) => `${x.label} — ${x.desc}`),
        })
        continue
      }
      if (item.sub) continue
      rows.push({ label: item.label, desc: item.desc, kids: [] })
    }
    return { ...(g as { group: NavGroup; color: string }), rows }
  })

  const postCount = posts.length

  return (
    <div style={{ background: paper.cream, color: ink.base, minHeight: '100vh' }}>
      <div style={{ background: '#DDEBF0', color: '#0E2C38', padding: '44px 56px 30px' }}>
        <Breadcrumbs style={{ opacity: 0.75 }} />

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 44,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: serif,
                fontWeight: 400,
                fontSize: 70,
                lineHeight: 1,
                letterSpacing: '-.04em',
                margin: 0,
              }}
            >
              {copy.cmsTitle}
            </h1>
            <div
              style={{
                fontFamily: sans,
                fontWeight: 300,
                fontSize: 13.5,
                lineHeight: 1.5,
                marginTop: 10,
                maxWidth: 430,
                opacity: 0.85,
              }}
            >
              {copy.cmsIntro}
            </div>
          </div>
          <div
            style={{
              fontFamily: sans,
              fontSize: 11,
              letterSpacing: '.14em',
              textTransform: 'uppercase',
              opacity: 0.7,
              paddingBottom: 8,
            }}
          >
            {modules.length} module · {postCount} bài
          </div>
        </div>

        <div style={{ display: 'flex', gap: 4, marginTop: 26 }}>
          {([
            { k: 'map', t: 'Sơ đồ trang' },
            { k: 'content', t: 'Sửa nội dung' },
          ] as const).map((x) => (
            <div
              key={x.k}
              onClick={() => setTab(x.k)}
              style={{
                fontFamily: sans,
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '.16em',
                textTransform: 'uppercase',
                padding: '10px 18px',
                cursor: 'pointer',
                background: tab === x.k ? ink.base : 'transparent',
                color: tab === x.k ? paper.cream : ink.soft,
              }}
            >
              {x.t}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div
          style={{
            background: '#FBE7E5',
            color: '#8E1E42',
            fontFamily: sans,
            fontSize: 12.5,
            padding: '10px 56px',
          }}
        >
          {error}
        </div>
      )}

      {tab === 'map' && (
        <div style={{ padding: '34px 56px 130px', maxWidth: 1080 }}>
          {tree.map((g) => (
            <div key={g.group} style={{ marginBottom: 40 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  borderBottom: `2px solid ${ink.base}`,
                  paddingBottom: 9,
                  marginBottom: 6,
                }}
              >
                <div style={{ width: 9, height: 9, background: g.color }} />
                <input
                  value={copy.sections[g.group]}
                  onChange={(e) =>
                    setSite((s) => ({ ...s, sections: { ...s.sections, [g.group]: e.target.value } }))
                  }
                  onBlur={(e) => void saveSite({ sections: { [g.group]: e.target.value } })}
                  title="Tên section — đồng bộ với sidebar"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    background: 'transparent',
                    border: 0,
                    outline: 'none',
                    color: ink.base,
                    fontFamily: sans,
                    fontSize: 10.5,
                    fontWeight: 500,
                    letterSpacing: '.2em',
                    textTransform: 'uppercase',
                    padding: '0 0 1px',
                  }}
                />
              </div>
              {g.rows.map((r, i) => (
                <div key={`${r.label}-${i}`} style={{ borderBottom: '1px solid #F0EBDB', padding: '11px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
                    <div
                      style={{
                        fontFamily: serif,
                        fontSize: 21,
                        lineHeight: 1.1,
                        letterSpacing: '-.02em',
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      {r.label}
                    </div>
                    <div style={{ fontFamily: sans, fontWeight: 300, fontSize: 12, color: ink.muted }}>
                      {r.desc}
                    </div>
                  </div>
                  {r.kids.map((k, ki) => (
                    <div
                      key={ki}
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 12,
                        padding: '4px 0 4px 26px',
                        borderLeft: `1px solid ${paper.rule}`,
                        margin: '4px 0 0 6px',
                        fontFamily: sans,
                        fontWeight: 300,
                        fontSize: 12.5,
                        color: ink.soft,
                      }}
                    >
                      {k}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {tab === 'content' && (
        <div style={{ padding: '34px 56px 130px', maxWidth: 1080 }}>
          <div style={sectionHead}>Trang chủ — landing</div>
          <div style={grid(two)}>
            <Field label="Nhãn trên cùng">
              <input
                defaultValue={copy.lEyebrow}
                onBlur={(e) => setCopy('lEyebrow')(e.target.value)}
                style={boxed}
              />
            </Field>
            <Field label="Nhãn xem mục lục">
              <input defaultValue={copy.lCta} onBlur={(e) => setCopy('lCta')(e.target.value)} style={boxed} />
            </Field>
            <Field
              label={
                <>
                  Tên lớn — dòng 1 · chữ <span style={{ color: '#F2A0A5' }}>ӕ</span> phóng to màu hồng
                </>
              }
            >
              <input
                defaultValue={copy.lTitle1}
                onBlur={(e) => setCopy('lTitle1')(e.target.value)}
                style={serifInput}
              />
            </Field>
            <Field label="Tên lớn — dòng 2 (nghiêng, xanh)">
              <input
                defaultValue={copy.lTitle2}
                onBlur={(e) => setCopy('lTitle2')(e.target.value)}
                style={serifItalicInput}
              />
            </Field>
            <Field label="Đoạn dẫn — cột 1">
              <textarea
                defaultValue={copy.lIntro1}
                onBlur={(e) => setCopy('lIntro1')(e.target.value)}
                rows={4}
                style={area}
              />
            </Field>
            <Field label="Đoạn dẫn — cột 2">
              <textarea
                defaultValue={copy.lIntro2}
                onBlur={(e) => setCopy('lIntro2')(e.target.value)}
                rows={4}
                style={area}
              />
            </Field>
          </div>

          <div style={{ ...sectionHead, margin: '34px 0 18px' }}>Mục lục</div>
          <div style={grid(two)}>
            <Field label="Tiêu đề — dòng 1">
              <input defaultValue={copy.t1} onBlur={(e) => setCopy('t1')(e.target.value)} style={serifInput} />
            </Field>
            <Field label="Tiêu đề — dòng 2 (nghiêng, xanh)">
              <input
                defaultValue={copy.t2}
                onBlur={(e) => setCopy('t2')(e.target.value)}
                style={serifItalicInput}
              />
            </Field>
          </div>
          <div style={grid(two, 18)}>
            <Field label="Đoạn dẫn — dạng danh sách">
              <textarea
                defaultValue={copy.blurb}
                onBlur={(e) => setCopy('blurb')(e.target.value)}
                rows={3}
                style={{ ...area, fontSize: 14 }}
              />
            </Field>
            <Field label="Đoạn dẫn — dạng cột">
              <textarea
                defaultValue={copy.blurbShort}
                onBlur={(e) => setCopy('blurbShort')(e.target.value)}
                rows={3}
                style={{ ...area, fontSize: 14 }}
              />
            </Field>
          </div>
          <div style={grid(three, 40)}>
            {([1, 2, 3] as const).map((slot) => (
              <ImageSlot
                key={slot}
                label={`Chú thích ảnh ${slot}`}
                caption={copy[`plate${slot}` as const]}
                url={copy[`plateImg${slot}` as const] || null}
                onCaption={(v) => void saveSite({ [`plate${slot}`]: v } as SiteOverrides)}
                onUpload={(f) => void savePlate(slot, f)}
                onClear={() => void saveSite({ [`plateImg${slot}`]: '' } as SiteOverrides)}
              />
            ))}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 20,
              borderBottom: `2px solid ${ink.base}`,
              paddingBottom: 9,
              marginBottom: 6,
            }}
          >
            <div
              style={{
                fontFamily: sans,
                fontSize: 10.5,
                fontWeight: 500,
                letterSpacing: '.2em',
                textTransform: 'uppercase',
                color: ink.muted,
              }}
            >
              Module — kéo thẻ để đổi thứ tự
            </div>
            <div
              onClick={async () => {
                try {
                  const m = await createModule()
                  setModules((ms) => ms.concat([m]))
                  setOpenModule(m.id)
                } catch (e) {
                  setError((e as Error).message)
                }
              }}
              style={{
                fontFamily: sans,
                fontSize: 11,
                letterSpacing: '.14em',
                textTransform: 'uppercase',
                background: ink.base,
                color: paper.cream,
                padding: '8px 14px',
                cursor: 'pointer',
              }}
            >
              + module mới
            </div>
          </div>

          {modules.map((m, mi) => {
            const entries = postsOf(m.id)
            const open = openModule === m.id
            return (
              <div
                key={m.id}
                draggable
                onDragStart={() => setDragModule(m.id)}
                onDragOver={(e) => {
                  e.preventDefault()
                  if (overModule !== m.id) setOverModule(m.id)
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  void dropModule(m.id)
                }}
                onDragEnd={() => {
                  setDragModule(null)
                  setOverModule(null)
                }}
                style={{
                  borderBottom: '1px solid #F0EBDB',
                  padding: '13px 0',
                  opacity: dragModule === m.id ? 0.45 : 1,
                }}
              >
                {overModule === m.id && dragModule !== m.id && (
                  <div style={{ height: 2, background: ink.base, margin: '-13px 0 11px' }} />
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                  <Hover
                    title="Kéo để đổi thứ tự"
                    style={{
                      fontFamily: sans,
                      fontSize: 13,
                      lineHeight: 1,
                      color: '#C9C2AC',
                      cursor: 'grab',
                      width: 12,
                      flex: 'none',
                      letterSpacing: '.05em',
                    }}
                    hoverStyle={{ color: ink.base }}
                  >
                    ⠿
                  </Hover>
                  <div
                    onClick={() => setOpenModule(open ? null : m.id)}
                    style={{ fontFamily: sans, fontSize: 12, color: ink.muted, cursor: 'pointer', width: 14, flex: 'none' }}
                  >
                    {open ? '▾' : '▸'}
                  </div>
                  <div style={{ width: 9, height: 9, borderRadius: '50%', background: m.accent, flex: 'none' }} />
                  <div
                    style={{ fontFamily: sans, fontSize: 10.5, letterSpacing: '.16em', color: ink.faint, width: 26, flex: 'none' }}
                  >
                    {String(mi + 1).padStart(2, '0')}
                  </div>
                  <div
                    onClick={() => setOpenModule(open ? null : m.id)}
                    style={{
                      fontFamily: serif,
                      fontSize: 24,
                      lineHeight: 1.1,
                      letterSpacing: '-.025em',
                      flex: 1,
                      minWidth: 0,
                      cursor: 'pointer',
                    }}
                  >
                    {m.title}
                  </div>
                  <div style={{ fontFamily: sans, fontWeight: 300, fontSize: 12, color: ink.muted, flex: 'none' }}>
                    {entries.length ? `${entries.length} bài` : 'chưa có bài — chưa hiện trên trang'}
                  </div>
                  <Hover
                    onClick={async () => {
                      try {
                        await deleteModule(m.id)
                        setModules((ms) => ms.filter((x) => x.id !== m.id))
                        setPosts((ps) => ps.filter((p) => p.moduleId !== m.id))
                        setOpenModule(null)
                      } catch (e) {
                        setError((e as Error).message)
                      }
                    }}
                    style={{ fontFamily: sans, fontSize: 12, color: ink.faint, cursor: 'pointer', flex: 'none' }}
                    hoverStyle={{ color: '#C25C7C' }}
                  >
                    ✕
                  </Hover>
                </div>

                {open && (
                  <div style={{ padding: '16px 0 6px 39px' }}>
                    <div style={grid(three)}>
                      <Field label="Tên module">
                        <input
                          defaultValue={m.title}
                          onBlur={(e) => void patchModule(m.id, { title: e.target.value })}
                          style={boxed}
                        />
                      </Field>
                      <Field label="Concept">
                        <input
                          defaultValue={m.concept}
                          onBlur={(e) => void patchModule(m.id, { concept: e.target.value })}
                          style={boxed}
                        />
                      </Field>
                      <Field label="Màu">
                        <input
                          defaultValue={m.accent}
                          onBlur={(e) => void patchModule(m.id, { accent: e.target.value })}
                          style={boxed}
                        />
                      </Field>
                    </div>

                    <div style={grid(two)}>
                      <Field label="Giới thiệu ngắn — hiện ở Mục lục">
                        <textarea
                          defaultValue={m.blurb}
                          onBlur={(e) => void patchModule(m.id, { blurb: e.target.value })}
                          rows={3}
                          style={area}
                        />
                      </Field>
                      <Field label="Mô tả dài — Trang chủ và đầu trang module">
                        <textarea
                          defaultValue={m.longDesc}
                          onBlur={(e) => void patchModule(m.id, { longDesc: e.target.value })}
                          rows={3}
                          style={area}
                        />
                      </Field>
                    </div>

                    <div style={grid(three)}>
                      <Field label="Dàn trang">
                        <select
                          value={m.layout}
                          onChange={(e) => void patchModule(m.id, { layout: e.target.value })}
                          style={boxed}
                        >
                          <option value="band">band</option>
                          <option value="specimen">specimen</option>
                          <option value="sequence">sequence</option>
                        </select>
                      </Field>
                      <Field label="Treatment — hiện ở Design system">
                        <textarea
                          defaultValue={m.treatment}
                          onBlur={(e) => void patchModule(m.id, { treatment: e.target.value })}
                          rows={2}
                          style={area}
                        />
                      </Field>
                      <Field label="Ghi chú dàn trang — Design system">
                        <textarea
                          defaultValue={m.layoutNote}
                          onBlur={(e) => void patchModule(m.id, { layoutNote: e.target.value })}
                          rows={2}
                          style={area}
                        />
                      </Field>
                    </div>

                    <div style={grid(three)}>
                      {([1, 2, 3] as const).map((slot) => (
                        <ImageSlot
                          key={slot}
                          label={slot === 1 ? 'Chú thích ảnh chính' : `Chú thích ảnh phụ ${slot - 1}`}
                          caption={(m[`shot${slot}` as const] ?? '') as string}
                          url={m[`img${slot}` as const]}
                          onCaption={(v) => void patchModule(m.id, { [`shot${slot}`]: v })}
                          onUpload={async (f) => {
                            try {
                              const { url } = await uploadImage(f)
                              await patchModule(m.id, { [`img${slot}`]: url })
                            } catch (e) {
                              setError((e as Error).message)
                            }
                          }}
                          onClear={() => void patchModule(m.id, { [`img${slot}`]: null })}
                        />
                      ))}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 16,
                        borderTop: '1px solid #E8E2CE',
                        paddingTop: 14,
                        marginBottom: 4,
                      }}
                    >
                      <div
                        style={{
                          fontFamily: sans,
                          fontSize: 10,
                          fontWeight: 500,
                          letterSpacing: '.18em',
                          textTransform: 'uppercase',
                          color: ink.muted,
                        }}
                      >
                        Bài trong module
                      </div>
                      <Hover
                        onClick={() => void addEntry(m.id)}
                        style={{
                          fontFamily: sans,
                          fontSize: 10.5,
                          letterSpacing: '.14em',
                          textTransform: 'uppercase',
                          border: '1px solid #DAD7C7',
                          padding: '6px 12px',
                          cursor: 'pointer',
                          color: ink.soft,
                        }}
                        hoverStyle={{ borderColor: ink.base, color: ink.base }}
                      >
                        + bài
                      </Hover>
                    </div>

                    {entries.map((e) => (
                      <div
                        key={e.id}
                        draggable
                        onDragStart={() => setDragEntry(e.id)}
                        onDragOver={(ev) => ev.preventDefault()}
                        onDrop={(ev) => {
                          ev.preventDefault()
                          void dropEntry(m.id, e.id)
                        }}
                        onDragEnd={() => setDragEntry(null)}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '44px minmax(0,1fr) minmax(0,1.15fr) 74px 48px',
                          gap: 10,
                          alignItems: 'center',
                          padding: '6px 0',
                          borderBottom: '1px solid #EFEADA',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <Hover
                            title="Kéo để đổi thứ tự"
                            style={{ fontFamily: sans, fontSize: 12, lineHeight: 1, color: '#D5CEB8', cursor: 'grab' }}
                            hoverStyle={{ color: ink.base }}
                          >
                            ⠿
                          </Hover>
                          <div style={{ fontFamily: sans, fontSize: 10.5, letterSpacing: '.12em', color: ink.faint }}>
                            {e.n}
                          </div>
                        </div>
                        <input
                          defaultValue={e.en}
                          onBlur={(ev) => void patchPost(e.id, { en: ev.target.value })}
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            background: 'transparent',
                            border: 0,
                            color: ink.base,
                            fontFamily: sans,
                            fontSize: 13.5,
                            padding: '4px 2px',
                            outline: 'none',
                          }}
                        />
                        <input
                          defaultValue={e.vi}
                          onBlur={(ev) => void patchPost(e.id, { vi: ev.target.value })}
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            background: 'transparent',
                            border: 0,
                            color: ink.soft,
                            fontFamily: sans,
                            fontWeight: 300,
                            fontSize: 13,
                            padding: '4px 2px',
                            outline: 'none',
                          }}
                        />
                        <input
                          defaultValue={e.dateLabel}
                          onBlur={(ev) => void patchPost(e.id, { dateLabel: ev.target.value })}
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            background: 'transparent',
                            border: 0,
                            color: ink.muted,
                            fontFamily: sans,
                            fontSize: 12,
                            padding: '4px 2px',
                            outline: 'none',
                          }}
                        />
                        <Hover
                          onClick={() => void removeEntry(e.id)}
                          style={{ fontFamily: sans, fontSize: 12, color: ink.faint, cursor: 'pointer' }}
                          hoverStyle={{ color: '#C25C7C' }}
                        >
                          ✕
                        </Hover>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          <div style={{ ...sectionHead, margin: '44px 0 18px' }}>{copy.sections.Admin}</div>
          <div style={grid(two, 20)}>
            <Field label="Design system — tiêu đề dòng 1">
              <input
                defaultValue={copy.artT1}
                onBlur={(e) => setCopy('artT1')(e.target.value)}
                style={{ ...serifInput, fontSize: 20 }}
              />
            </Field>
            <Field label="Design system — tiêu đề dòng 2 (nghiêng, xanh)">
              <input
                defaultValue={copy.artT2}
                onBlur={(e) => setCopy('artT2')(e.target.value)}
                style={{ ...serifItalicInput, fontSize: 20 }}
              />
            </Field>
            <div style={{ gridColumn: 'span 2' }}>
              <Field label="Design system — đoạn dẫn">
                <textarea
                  defaultValue={copy.artIntro}
                  onBlur={(e) => setCopy('artIntro')(e.target.value)}
                  rows={3}
                  style={area}
                />
              </Field>
            </div>
            <Field label="System conventions — tiêu đề">
              <input
                defaultValue={copy.logicTitle}
                onBlur={(e) => setCopy('logicTitle')(e.target.value)}
                style={{ ...serifInput, fontSize: 20 }}
              />
            </Field>
            <Field label="System conventions — đoạn dẫn">
              <textarea
                defaultValue={copy.logicIntro}
                onBlur={(e) => setCopy('logicIntro')(e.target.value)}
                rows={2}
                style={area}
              />
            </Field>
            <Field label="Content — tiêu đề">
              <input
                defaultValue={copy.cmsTitle}
                onBlur={(e) => setCopy('cmsTitle')(e.target.value)}
                style={{ ...serifInput, fontSize: 20 }}
              />
            </Field>
            <Field label="Content — đoạn dẫn">
              <textarea
                defaultValue={copy.cmsIntro}
                onBlur={(e) => setCopy('cmsIntro')(e.target.value)}
                rows={2}
                style={area}
              />
            </Field>
            <Field label="Archive — tiêu đề">
              <input
                defaultValue={copy.archiveTitle}
                onBlur={(e) => setCopy('archiveTitle')(e.target.value)}
                style={{ ...serifInput, fontSize: 20 }}
              />
            </Field>
            <Field label="Archive — ghi chú sau số bài">
              <input
                defaultValue={copy.archiveNote}
                onBlur={(e) => setCopy('archiveNote')(e.target.value)}
                style={boxed}
              />
            </Field>
          </div>

          <Hover
            onClick={async () => {
              // Every field back to its shipped default: clear the whole blob.
              try {
                setSite(await updateSite(Object.fromEntries(
                  Object.keys(SITE_DEFAULTS)
                    .filter((k) => k !== 'sections')
                    .map((k) => [k, '']),
                ) as SiteOverrides))
                await load()
              } catch (e) {
                setError((e as Error).message)
              }
            }}
            style={{
              display: 'inline-block',
              marginTop: 30,
              fontFamily: sans,
              fontSize: 10.5,
              letterSpacing: '.16em',
              textTransform: 'uppercase',
              color: ink.faint,
              borderBottom: `1px solid ${paper.rule}`,
              paddingBottom: 4,
              cursor: 'pointer',
            }}
            hoverStyle={{ color: '#C25C7C', borderColor: '#C25C7C' }}
          >
            Trả về nội dung gốc
          </Hover>
        </div>
      )}
    </div>
  )
}
