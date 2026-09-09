import { useEffect, useState } from 'react'
import { CLIP_INK, CLIP_WASH, PostRenderer } from 'post-renderer'
import { toReportBlocks, toReportNotes } from '../lib/reportBlocks'
import type {
  ArticlePostData,
  BitesizePostData,
  CardData,
  LongformBlock,
  MemoPostData,
  SectionData,
} from 'post-renderer'
import { getTemplate, listTemplates, type StoredTemplate, type TemplateSummary } from '../admin/lib/apiClient'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { ink, paper, sans, serif } from '../design/tokens'
import { Hover } from '../lib/Hover'
import { useNav } from '../lib/nav'

const status = { fontFamily: sans, fontSize: 13, color: ink.muted, padding: '60px 56px' }

/** Draw a stored template with its own body, whichever renderer it names. */
function Preview({ template }: { template: StoredTemplate }) {
  const body = template.body
  const title = template.name
  const subtitle = template.description

  if (template.renderer === 'longform') {
    return (
      <PostRenderer
        template="longform"
        post={{ title, subtitle, blocks: (Array.isArray(body) ? body : []) as LongformBlock[] }}
      />
    )
  }
  if (template.renderer === 'cards') {
    return (
      <PostRenderer
        template="cards"
        post={{ title, intro: [subtitle], cards: (Array.isArray(body) ? body : []) as CardData[] }}
      />
    )
  }
  if (template.renderer === 'report') {
    return (
      <PostRenderer
        template="report"
        post={{ title, blurb: subtitle, blocks: toReportBlocks(body), notes: toReportNotes(body), template: 'report' }}
      />
    )
  }
  if (template.renderer === 'bitesize') {
    const note = (body ?? {}) as Partial<BitesizePostData>
    const clip = note.media === 'vid'
    return (
      <PostRenderer
        template="bitesize"
        post={{
          title,
          tag: note.tag ?? (clip ? 'video' : 'quan sát'),
          date: note.date ?? '',
          num: '',
          pinned: false,
          image: null,
          ink: clip ? CLIP_INK : '#B65A3C',
          wash: clip ? CLIP_WASH : '#E9B79C',
          len: note.len ?? 'ngắn',
          portrait: note.portrait ?? false,
          media: clip ? 'vid' : 'img',
          mediaHint: note.mediaHint ?? (clip ? 'video ngang — clip ngắn không tiếng' : 'ảnh — cận cảnh chủ thể'),
          sub: note.sub ?? '',
          subImage: null,
          text: note.text ?? subtitle,
        }}
      />
    )
  }
  if (template.renderer === 'memo') {
    const memo = (body ?? {}) as Partial<MemoPostData>
    return (
      <PostRenderer
        template="memo"
        post={{ title, subtitle: memo.subtitle ?? subtitle, specs: memo.specs, elements: memo.elements, sections: memo.sections ?? [] }}
      />
    )
  }

  const article: ArticlePostData = {
    eyebrow: 'bài mẫu',
    moduleTitle: 'module',
    title,
    lead: subtitle,
    platePrimary: { tint: '#E4F0DF', caption: 'ảnh chính', imageUrl: null },
    plateSecondary: { tint: '#F9EBD2', caption: 'ảnh phụ', imageUrl: null },
    heroPlate: { tint: '#FBE7E5', caption: 'ảnh mở đầu', imageUrl: null },
    sections: (Array.isArray(body) ? body : []) as SectionData[],
    pull: subtitle,
    relatedHeading: 'Trong module này',
    related: [],
    detailPlate: { tint: '#E4F0DF', caption: 'chi tiết', imageUrl: null },
    furtherReadingHeading: 'Đọc thêm',
      furtherReading: [],
  }
  return <PostRenderer template="article" post={article} />
}

/**
 * Admin › Templates — the stored blueprints, and what each looks like.
 *
 * The list is fetched rather than written into the sidebar, so a template added
 * to the table appears here without anyone editing this file. That is the point
 * of templates being their own data: the number of them is not a fact about
 * the code.
 */
export function Templates() {
  const nav = useNav()
  const [list, setList] = useState<TemplateSummary[]>([])
  const [open, setOpen] = useState<StoredTemplate | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listTemplates()
      .then(setList)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false))
  }, [])

  /**
   * The address is what decides which template is open — on first paint, on
   * every step of the browser's history, and on a click. Fetching from the
   * address rather than from the click means a link pasted into a fresh tab
   * opens the same thing, and one back press closes the template.
   */
  const openId = nav.templateId
  useEffect(() => {
    let live = true
    if (!openId) {
      setOpen(null)
      return
    }
    getTemplate(openId)
      .then((t) => live && setOpen(t))
      // A template named in the address that no longer exists shows the list
      // rather than an error: the address is stale, nothing is broken.
      .catch(() => live && (setOpen(null), nav.openTemplate(null)))
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId])

  if (open) {
    return (
      <div>
        <div style={{ padding: '40px 56px 0' }}>
          <Breadcrumbs color="#7C7C70" trailing={open.name} onParent={() => nav.openTemplate(null)} />
        </div>
        <Preview template={open} />
      </div>
    )
  }

  return (
    <div style={{ padding: '44px 56px 130px', maxWidth: 1080 }}>
      <Breadcrumbs color={ink.muted} />

      <h1 style={{ fontFamily: serif, fontWeight: 400, fontSize: 70, lineHeight: 1, letterSpacing: '-.04em', margin: 0 }}>
        Templates
      </h1>
      <div style={{ fontFamily: sans, fontWeight: 300, fontSize: 13.5, lineHeight: 1.5, marginTop: 10, maxWidth: 460, color: ink.soft }}>
        Khung để bắt đầu một bài mới. Chọn một khung khi tạo bài thì nội dung của nó được chép sang — bài sau đó là bản độc lập, sửa thoải mái.
      </div>

      {error && <div style={{ color: '#8E1E42', fontSize: 12.5, marginTop: 20 }}>{error}</div>}
      {loading && <div style={status}>Đang tải…</div>}

      <div style={{ marginTop: 34 }}>
        {list.map((t) => (
          <Hover
            key={t.id}
            onClick={() => nav.openTemplate(t.id)}
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0,240px) minmax(0,1fr) 90px',
              gap: 20,
              alignItems: 'baseline',
              padding: '18px 10px',
              borderTop: `1px solid ${paper.rule}`,
              cursor: 'pointer',
              borderLeft: '3px solid transparent',
            }}
            hoverStyle={{ background: paper.white, borderLeft: `3px solid ${ink.green}` }}
          >
            <div style={{ fontFamily: serif, fontSize: 24, letterSpacing: '-.02em' }}>{t.name}</div>
            <div style={{ fontFamily: sans, fontWeight: 300, fontSize: 13.5, lineHeight: 1.45, color: ink.soft }}>
              {t.description}
            </div>
            <div
              style={{
                fontFamily: sans,
                fontSize: 10,
                letterSpacing: '.14em',
                textTransform: 'uppercase',
                color: ink.faint,
                textAlign: 'right',
              }}
            >
              {t.renderer}
            </div>
          </Hover>
        ))}
      </div>
    </div>
  )
}
