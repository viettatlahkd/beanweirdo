import { Fragment, type CSSProperties, type ReactNode } from 'react'
import { ElementList } from './elements'
import { paletteFrom } from './palette'
import { garden, ink, layout, paper, sans, serif, wrapTitle } from './tokens'
import { fillStyle } from './focus'
import { PlateCorner, plateHost, type PlateAction } from './plates'
import type { ArticlePlateData, ArticlePostData, FigureData } from './types'

/**
 * A body entry that came from the shared element store rather than from
 * article's own `{h, p, fig}` vocabulary.
 *
 * Told apart by `type` because that is the one key every stored element
 * carries and no section ever has — the alternative, "has neither h nor p",
 * would also swallow a section the writer has simply not filled in yet.
 */
function isStoredElement(s: unknown): boolean {
  return typeof (s as { type?: unknown } | null)?.type === 'string'
}

const label: CSSProperties = {
  fontFamily: sans,
  fontSize: 10,
  letterSpacing: '.14em',
  textTransform: 'uppercase',
}

export type ArticleOverrides = {
  renderEyebrow?: (eyebrow: string) => ReactNode
  renderTitle?: (title: string, titleItalic: string | undefined) => ReactNode
  renderLead?: (lead: string) => ReactNode
  /** the four decorative tint plates: hero, opener-primary, opener-secondary, rail-detail */
  renderPlateCaption?: (plate: ArticlePlateData, slot: 'hero' | 'primary' | 'secondary' | 'detail') => ReactNode
  /**
   * A handle in the corner of each fixed picture cell — the four plates above
   * and every section figure, keyed `fig-0`, `fig-1`, …
   *
   * Article draws more of these cells than any other template, and three of the
   * four plates had nowhere at all to put a photo: `toArticleData` filled them
   * with `imageUrl: null` and there was no field behind them.
   */
  renderPlateAction?: PlateAction
  renderSectionHeading?: (h: string, index: number) => ReactNode
  /**
   * Wraps one section, so the admin can hang its move / copy / delete handles
   * on it. The page passes the section straight through; only the editor puts
   * anything around it.
   */
  wrapSection?: (section: ReactNode, index: number) => ReactNode
  /** Shown under the last section — where the editor puts "add a section". */
  renderAfterSections?: () => ReactNode
  renderSectionBody?: (p: string, index: number) => ReactNode
  renderFigure?: (fig: FigureData, index: number) => ReactNode
  /*
   * Hai mẩu chữ của khung ảnh, tách riêng khỏi `renderFigure`.
   *
   * `renderFigure` thay cả cách vẽ khung ảnh, nên khung sửa muốn cho gõ chú
   * thích thì phải vẽ lại toàn bộ bố cục ấy — và một bản vẽ lại thì sai khác
   * bản thật chỉ sau vài ngày. Hai móc hẹp này để bố cục nằm nguyên một chỗ.
   */
  renderFigureNote?: (note: string, index: number) => ReactNode
  renderFigureCaption?: (caption: string, index: number) => ReactNode
  renderPullQuote?: (pull: string) => ReactNode
  renderRelatedItem?: (label: string, index: number) => ReactNode
  renderFurtherReadingItem?: (item: string, index: number) => ReactNode
}

export type ArticleProps = ArticleOverrides & {
  /**
   * Bố cục điện thoại. Chỗ gọi quyết định, không phải khuôn tự đo — xem
   * `PostRenderer`.
   */
  mobile?: boolean
  /**
   * The trail back to where this post is filed. Supplied by the app, so the
   * renderer package stays independent of how routing works.
   */
  breadcrumb?: ReactNode
  post: ArticlePostData
}

/**
 * The "article" template — a single body column at a comfortable measure,
 * a color band up top with the title kept clear of the hero plate, and a
 * sticky rail (pull-quote / related / further-reading) that runs the length
 * of the piece. Ported from frontend/src/screens/Article.tsx, parameterized
 * over `post` instead of the static article/articleMeta content modules.
 */
export function Article({ post, breadcrumb, mobile = false, ...overrides }: ArticleProps) {
  // Store elements paint themselves from the module's colours, the same way
  // they do on every other template; the band's fallback is repeated below.
  const palette = paletteFrom(post.band?.bg ?? garden.leaf, post.band?.fg)
  return (
    <div>
      <div
        style={{
          // The module's own colours, so a biochem essay and a sensory one do
          // not open identically. Green is only the fallback for the standalone
          // sample under Admin › Templates, which belongs to no module.
          background: post.band?.bg ?? garden.leaf,
          color: post.band?.fg ?? '#1F3323',
          padding: mobile ? '28px 20px 26px' : '46px 56px 124px',
          position: 'relative',
        }}
      >
        {breadcrumb}
        <div style={{ ...label, opacity: 0.7, marginBottom: 24 }}>
          {overrides.renderEyebrow ? overrides.renderEyebrow(post.moduleTitle) : `← ${post.moduleTitle}`}
        </div>
        <div style={{ ...label, opacity: 0.7, marginBottom: 12 }}>{post.eyebrow}</div>
        <h1
          lang="en"
          data-testid="article-title"
          style={{
            ...wrapTitle,
            fontFamily: serif,
            // B46 — tiêu đề bài 76→36.
            fontSize: mobile ? 36 : 76,
            lineHeight: 0.94,
            letterSpacing: '-.04em',
            margin: '0 0 12px',
            // Hẹp hơn `wrapTitle` cho phép: tiêu đề bài không được chạy xuống
            // dưới cột phụ bên phải, nên bề ngang của nó thắng.
            /*
             * B45 — hai `maxWidth` này chỉ tồn tại để né tấm hero đứng bên
             * phải khối màu. Trên mobile tấm ấy xuống dưới thành một dải ngang,
             * nên không còn gì để né; giữ lại là tự bóp cột chữ.
             */
            maxWidth: mobile ? undefined : 'min(660px, 100% - 300px)',
          }}
        >
          {overrides.renderTitle ? (
            overrides.renderTitle(post.title, post.titleItalic)
          ) : (
            <>
              {post.title}
              {post.titleItalic && <span style={{ fontStyle: 'italic' }}>{post.titleItalic}</span>}
            </>
          )}
        </h1>
        <div
          style={{
            fontFamily: serif,
            fontStyle: 'italic',
            fontSize: mobile ? 19 : 24,
            lineHeight: 1.4,
            maxWidth: mobile ? undefined : 'min(520px, 100% - 300px)',
          }}
        >
          {overrides.renderLead ? overrides.renderLead(post.lead) : post.lead}
        </div>

        <div
          data-testid="article-hero-plate"
          style={{
            // B45 — trên mobile tấm hero rời khỏi mép phải và nằm thành một dải
            // ngang 200px dưới khối màu: 300px cạnh chữ trên màn 390 thì cột
            // chữ chỉ còn 90px.
            position: mobile ? 'relative' : 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: mobile ? '100%' : 300,
            height: mobile ? 200 : undefined,
            ...fillStyle(post.heroPlate.imageUrl, post.heroPlate.tint),
            display: 'flex',
            alignItems: 'flex-end',
            padding: 14,
          }}
        >
          <div style={{ fontFamily: sans, fontSize: 9.5, color: '#3B2A2B' }}>
            {overrides.renderPlateCaption
              ? overrides.renderPlateCaption(post.heroPlate, 'hero')
              : post.heroPlate.caption}
          </div>
          {/* Already `absolute` (or `relative` on mobile), so it is its own
              positioning context without `plateHost`. */}
          <PlateCorner
            action={overrides.renderPlateAction}
            slot={{ key: 'hero', imageUrl: post.heroPlate.imageUrl ?? null }}
          />
        </div>
      </div>

      <div style={{ padding: '56px 56px 140px', maxWidth: layout.measure }}>
        <div
          style={{
            display: 'grid',
            /*
             * B47 — cột phụ tháo xuống cuối bài. Cột 200–260px cạnh một cột
             * chữ trên màn 390 thì cả hai đều không đọc được.
             */
            gridTemplateColumns: mobile
              ? 'minmax(0,1fr)'
              : `minmax(0,1fr) minmax(${layout.railMin}px,${layout.railMax}px)`,
            gap: 48,
            alignItems: 'start',
          }}
        >
          <div>
            {/* two plates of unequal height, bottom-aligned to a common edge */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: mobile ? 'minmax(0,1fr)' : 'minmax(0,2.1fr) minmax(0,1fr)',
                gap: 10,
                margin: '0 0 46px',
              }}
            >
              <div
                style={{
                  ...plateHost,
                  height: 280,
                  ...fillStyle(post.platePrimary.imageUrl, post.platePrimary.tint),
                  display: 'flex',
                  alignItems: 'flex-end',
                  padding: 14,
                }}
              >
                <div style={{ fontFamily: sans, fontSize: 10, color: ink.strong, lineHeight: 1.3 }}>
                  {overrides.renderPlateCaption
                    ? overrides.renderPlateCaption(post.platePrimary, 'primary')
                    : post.platePrimary.caption}
                </div>
                <PlateCorner
                  action={overrides.renderPlateAction}
                  slot={{ key: 'primary', imageUrl: post.platePrimary.imageUrl ?? null }}
                />
              </div>
              <div
                style={{
                  ...plateHost,
                  height: 180,
                  alignSelf: 'end',
                  ...fillStyle(post.plateSecondary.imageUrl, post.plateSecondary.tint),
                  display: 'flex',
                  alignItems: 'flex-end',
                  padding: 12,
                }}
              >
                <div style={{ fontFamily: sans, fontSize: 9.5, color: '#6B6555', lineHeight: 1.2 }}>
                  {overrides.renderPlateCaption
                    ? overrides.renderPlateCaption(post.plateSecondary, 'secondary')
                    : post.plateSecondary.caption}
                </div>
                <PlateCorner
                  action={overrides.renderPlateAction}
                  slot={{ key: 'secondary', imageUrl: post.plateSecondary.imageUrl ?? null }}
                />
              </div>
            </div>

            {post.sections.map((s, i) => {
              /*
               * An entry taken from the shared store.
               *
               * Article keeps `{h, p, fig}` for its own sections, so a table
               * or a chart has no shape to live in here — it travels as the
               * stored element it already is, and both shapes ride in one
               * `body`. Same arrangement long-form arrived at.
               */
              const section = isStoredElement(s) ? (
                <div style={{ marginBottom: 34 }}>
                  <ElementList elements={[s]} palette={palette} mobile={mobile} />
                </div>
              ) : (
                <div style={{ marginBottom: 34 }}>
                <h3
                  style={{
                    fontFamily: sans,
                    fontWeight: 400,
                    fontSize: 11,
                    letterSpacing: '.16em',
                    textTransform: 'uppercase',
                    color: ink.green,
                    margin: '0 0 12px',
                  }}
                >
                  {overrides.renderSectionHeading ? overrides.renderSectionHeading(s.h, i) : s.h}
                </h3>
                <div style={{ fontSize: 16, lineHeight: 1.2, color: ink.body }}>
                  {overrides.renderSectionBody ? overrides.renderSectionBody(s.p, i) : s.p}
                </div>

                {s.fig &&
                  (overrides.renderFigure ? (
                    overrides.renderFigure(s.fig, i)
                  ) : (
                    // the plate sits off to one side; its marginal note takes the
                    // space that would otherwise be a gap in the reading column
                    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-end', margin: s.fig.margin }}>
                      <div style={{ flex: 1, minWidth: 0, paddingBottom: 6 }}>
                        <div
                          style={{
                            fontFamily: sans,
                            fontSize: 9.5,
                            letterSpacing: '.12em',
                            textTransform: 'uppercase',
                            color: ink.green,
                            marginBottom: 8,
                          }}
                        >
                          {s.fig.label}
                        </div>
                        <div style={{ fontSize: 13.5, lineHeight: 1.45, color: ink.soft }}>
                          {overrides.renderFigureNote ? overrides.renderFigureNote(s.fig.note ?? '', i) : s.fig.note}
                        </div>
                      </div>
                      <div style={{ width: s.fig.w, flex: 'none' }}>
                        <div
                          style={{
                            ...plateHost,
                            height: s.fig.h,
                            ...fillStyle(s.fig.imageUrl, s.fig.tint),
                            display: 'flex',
                            alignItems: 'flex-end',
                            padding: 12,
                          }}
                        >
                          <div style={{ fontFamily: sans, fontSize: 9.5, color: ink.strong, lineHeight: 1.3 }}>
                            {overrides.renderFigureCaption
                              ? overrides.renderFigureCaption(s.fig.caption ?? '', i)
                              : s.fig.caption}
                          </div>
                          <PlateCorner
                            action={overrides.renderPlateAction}
                            slot={{ key: `fig-${i}`, imageUrl: s.fig.imageUrl ?? null }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
              return (
                <Fragment key={i}>
                  {overrides.wrapSection ? overrides.wrapSection(section, i) : section}
                </Fragment>
              )
            })}
            {overrides.renderAfterSections?.()}
          </div>

          <div style={{ position: 'sticky', top: 44, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div
              style={{
                background: ink.moss,
                color: '#F4F2E4',
                padding: '22px 20px',
                fontFamily: serif,
                fontStyle: 'italic',
                fontSize: 18,
                lineHeight: 1.2,
              }}
            >
              {overrides.renderPullQuote ? overrides.renderPullQuote(post.pull) : post.pull}
            </div>

            <div style={{ borderTop: `2px solid ${ink.base}`, paddingTop: 14 }}>
              <div style={{ ...label, color: ink.muted, marginBottom: 8 }}>{post.relatedHeading}</div>
              {post.related.map((r, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: 13,
                    lineHeight: 1.4,
                    padding: '9px 0',
                    borderBottom: `1px solid ${paper.rule}`,
                    cursor: 'pointer',
                    color: ink.soft,
                  }}
                >
                  {overrides.renderRelatedItem ? overrides.renderRelatedItem(r.label, i) : r.label}
                </div>
              ))}
            </div>

            <div
              style={{
                ...plateHost,
                aspectRatio: '1',
                ...fillStyle(post.detailPlate.imageUrl, post.detailPlate.tint),
                display: 'flex',
                alignItems: 'flex-end',
                padding: 12,
              }}
            >
              <div style={{ fontFamily: sans, fontSize: 9.5, color: '#6B6555' }}>
                {overrides.renderPlateCaption
                  ? overrides.renderPlateCaption(post.detailPlate, 'detail')
                  : post.detailPlate.caption}
              </div>
              <PlateCorner
                action={overrides.renderPlateAction}
                slot={{ key: 'detail', imageUrl: post.detailPlate.imageUrl ?? null }}
              />
            </div>

            <div style={{ fontFamily: sans, fontSize: 10, color: ink.muted, lineHeight: 1.6 }}>
              <div style={{ ...label, color: ink.green, marginBottom: 6 }}>{post.furtherReadingHeading}</div>
              {post.furtherReading.map((r, i) => (
                <div key={i}>
                  {overrides.renderFurtherReadingItem ? overrides.renderFurtherReadingItem(r, i) : r}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
