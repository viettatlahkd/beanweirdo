import type { CSSProperties } from 'react'
import { useMemo } from 'react'
import { splitAesc } from '../content/site'
import { landingModules, useModules } from '../data/useModules'
import type { ModuleImageFields } from '../admin/moduleForm'
import { coverStyle } from '../lib/imageFocus'
import type { PostRow } from '../data/usePublishedPosts'
import { usePublishedPosts } from '../data/usePublishedPosts'
import { useSiteCopy } from '../data/useSiteCopy'
import { garden, ink, layout, paper, prose, sans, serif, wrapTitle } from '../design/tokens'
import { Hover } from '../lib/Hover'
import { Rise } from '../lib/Rise'
import { useNav } from '../lib/nav'
import { useIsMobile } from '../lib/useIsMobile'

const eyebrow: CSSProperties = {
  fontFamily: sans,
  fontSize: 10,
  letterSpacing: '.18em',
  textTransform: 'uppercase',
}

const shotCaption: CSSProperties = { fontFamily: sans, fontSize: 10, color: ink.strong }
const shotCaptionSm: CSSProperties = { ...shotCaption, fontSize: 9.5 }

/** Over a photo the caption needs its own ground to stay readable. */
const captionOnPhoto: CSSProperties = {
  color: paper.cream,
  background: 'rgba(24,22,17,.55)',
  padding: '3px 7px',
}

/**
 * One cell of a module's image band. With a photo it is the photo, cropped to
 * fill and centred; without one it stays the tinted box the design draws — an
 * empty cell is a colour box, not a gap. See admin/moduleForm.ts.
 */
const tile = (background: string, padding: number, img?: string | null): CSSProperties => ({
  ...(img ? coverStyle(img) : { background }),
  display: 'flex',
  alignItems: 'flex-end',
  padding,
})

/** Captions are optional — an empty one takes no room and draws no scrim. */
function Shot({ text, small, over }: { text: string | null; small?: boolean; over?: boolean }) {
  if (!text) return null
  const base = small ? shotCaptionSm : shotCaption
  return <div style={over ? { ...base, ...captionOnPhoto } : base}>{text}</div>
}

const bandGrid = (columns: string, rows: string, mob: boolean): CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: columns,
  gridTemplateRows: rows,
  gap: 8,
  height: mob ? layout.bandMobile : layout.band,
  /*
   * Trên điện thoại dải ảnh tràn ra hai mép.
   *
   * Khối module có lề 20px hai bên. Dải ảnh nằm trong lề ấy thì trên màn 375
   * mỗi tấm chỉ còn hơn trăm pixel, và cả dải đọc ra thành mấy mảnh nhỏ trôi
   * trong một mảng màu — đúng cái chủ site gọi là "hơi rỗng". Kéo âm đúng bằng
   * lề để dải chạm hai mép: ảnh rộng thêm 40px, và mảng màu không còn viền
   * trống hai bên.
   */
  ...(mob ? { marginLeft: -layout.padMobile, marginRight: -layout.padMobile } : null),
})

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

/**
 * Each module gets its own image arrangement, and every tile breaks its grid
 * cell by a different amount — the band's top and bottom edges are deliberately
 * ragged so scrolling past three modules doesn't read as three identical rows.
 */
/**
  * The homepage image band. Exported because the CMS preview draws this exact
  * component rather than a copy of it: the cells are fluid, so their aspect
  * ratios move with the viewport and no redrawn mock could stay truthful.
  */
export function ImageBand({ m }: { m: ModuleImageFields }) {
  const mob = useIsMobile()

  /*
   * Mép trên dưới của dải cố tình so le — ba module xếp nối nhau mà đều tăm
   * tắp thì thành ba hàng giống hệt. Xuống hẹp phải rút biên âm lại chứ không
   * bỏ: dải chỉ còn cao 220 thay vì 310, giữ nguyên -34px thì ô trên trồi ra
   * ngoài khối màu. Rút còn khoảng 55%, đủ để mép vẫn ragged.
   */
  const mm = (desktop: string, mobile: string) => (mob ? mobile : desktop)

  if (m.layout === 'band') {
    return (
      <div style={bandGrid(mob ? 'minmax(0,1.7fr) minmax(0,1fr) 14px' : 'minmax(0,1.9fr) minmax(0,1fr) 30px', '1.5fr 1fr', mob)}>
        <Rise
          from={['-34px', '0px']}
          delay="0ms"
          style={{
            gridColumn: 1,
            gridRow: '1/3',
            margin: mm('-34px 0 0', '-18px 0 0'),
            ...tile(paper.cream, 14, m.img1),
          }}
        >
          <Shot text={m.shot1} over={!!m.img1} />
        </Rise>
        <Rise
          from={['0px', '-22px']}
          delay="90ms"
          style={{
            gridColumn: 2,
            gridRow: 1,
            margin: mm('38px 0 0 -46px', '22px 0 0 -24px'),
            ...tile(paper.cream, 11, m.img2),
          }}
        >
          <Shot text={m.shot2} small over={!!m.img2} />
        </Rise>
        <Rise
          from={['0px', '22px']}
          delay="150ms"
          style={{
            gridColumn: 2,
            gridRow: 2,
            margin: mm('0 0 -36px', '0 0 -20px'),
            ...tile(garden.petalTint, 11, m.img3),
          }}
        >
          <Shot text={m.shot3} small over={!!m.img3} />
        </Rise>
        {/* a solid strip, not a photo — it keeps the rhythm without a fourth image */}
        <Rise
          from={['20px', '0px']}
          delay="210ms"
          style={{
            gridColumn: 3,
            gridRow: '1/3',
            margin: mm('96px 0 22px', '62px 0 14px'),
            background: garden.petalTint2,
          }}
        />
      </div>
    )
  }

  if (m.layout === 'specimen') {
    return (
      <div style={bandGrid('minmax(0,1.7fr) minmax(0,1fr)', '1fr 1.4fr', mob)}>
        <Rise
          from={['-34px', '0px']}
          delay="0ms"
          style={{
            gridColumn: 1,
            gridRow: '1/3',
            margin: mm('-22px 0 34px', '-14px 0 20px'),
            ...tile(paper.cream, 14, m.img1),
          }}
        >
          <Shot text={m.shot1} over={!!m.img1} />
        </Rise>
        <Rise
          from={['0px', '-24px']}
          delay="90ms"
          style={{
            gridColumn: 2,
            gridRow: 1,
            margin: mm('52px -26px 0 -34px', '30px -14px 0 -18px'),
            ...tile(garden.leafTint, 11, m.img2),
          }}
        >
          <Shot text={m.shot2} small over={!!m.img2} />
        </Rise>
        <Rise
          from={['0px', '26px']}
          delay="160ms"
          style={{
            gridColumn: 2,
            gridRow: 2,
            margin: mm('24px 34px -40px 22px', '14px 18px -24px 12px'),
            ...tile(paper.cream, 11, m.img3),
          }}
        >
          <Shot text={m.shot3} small over={!!m.img3} />
        </Rise>
      </div>
    )
  }

  return (
    <div style={bandGrid('minmax(0,2.1fr) minmax(0,1fr)', '1.45fr 1fr', mob)}>
      <Rise
        from={['-34px', '0px']}
        delay="0ms"
        style={{
          gridColumn: 1,
          gridRow: '1/3',
          margin: mm('26px 0 -34px', '16px 0 -20px'),
          ...tile(paper.cream, 14, m.img1),
        }}
      >
        <Shot text={m.shot1} over={!!m.img1} />
      </Rise>
      <Rise
        from={['0px', '-26px']}
        delay="90ms"
        style={{
          gridColumn: 2,
          gridRow: 1,
          margin: mm('-38px 26px 0 -40px', '-22px 14px 0 -22px'),
          ...tile(garden.honeyTint, 11, m.img2),
        }}
      >
        <Shot text={m.shot2} small over={!!m.img2} />
      </Rise>
      <Rise
        from={['0px', '26px']}
        delay="170ms"
        style={{
          gridColumn: 2,
          gridRow: 2,
          margin: mm('38px -18px 0 44px', '22px -10px 0 24px'),
          ...tile(paper.cream, 11, m.img3),
        }}
      >
        <Shot text={m.shot3} small over={!!m.img3} />
      </Rise>
    </div>
  )
}

/**
 * Trang chủ — the real homepage. An introduction, then one full-bleed colour
 * block per module. The whole block is the target, not just its heading.
 */
/**
 * Phần tên còn lại sau chữ `ӕ`, ngắt tại khoảng trắng đầu tiên.
 *
 * Không có khoảng trắng thì trả nguyên — một cái tên một từ vẫn phải vẽ ra
 * được, và trang không được vỡ vì chủ site đổi tên trong CMS.
 */
function PostSplit({ text }: { text: string }) {
  const at = text.indexOf(' ')
  if (at < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, at)}
      <br />
      {text.slice(at + 1)}
    </>
  )
}

export function Landing() {
  const nav = useNav()
  const { data: allModules } = useModules()
  const modules = landingModules(allModules)
  const { data: posts } = usePublishedPosts()
  const postsByModule = useMemo(() => groupByModule(posts), [posts])
  const { site } = useSiteCopy()
  const title = splitAesc(site.lTitle1)
  const mob = useIsMobile()

  return (
    <div>
      <div style={{ padding: mob ? '30px 20px 44px' : '80px 56px 64px', maxWidth: layout.page }}>
        <div style={{ ...eyebrow, color: ink.muted, marginBottom: 28 }}>{site.lEyebrow}</div>
        {/*
          * Tên trang trên điện thoại: ba dòng, không phải hai.
          *
          * "beӕn weirdo" một dòng ở 54px chiếm chưa tới nửa bề ngang — tên
          * trang mà đọc như một dòng phụ. Tách làm hai dòng thì mỗi từ được
          * 80px, gần gấp rưỡi.
          *
          * Dòng `#viettatlahkd` phải nhỏ hơn hai dòng trên, và đây là chỗ đo
          * mới ra: nó dài gấp ba "weirdo", nên cùng cỡ 80px thì tràn ra ngoài
          * 449px trên một màn 375. Đo được bề rộng của nó ≈ 5,4 lần cỡ chữ,
          * nên `15.5vw` giữ nó vừa khung ở cả 320px lẫn 375px, và trần 58px để
          * trên máy tính bảng nó không phình to hơn cần thiết.
          */}
        <h1
          style={{
            fontFamily: serif,
            fontSize: mob ? 80 : 104,
            lineHeight: mob ? 0.86 : 0.9,
            letterSpacing: '-.035em',
            margin: mob ? '0 0 20px' : '0 0 24px',
          }}
        >
          {title.pre}
          <span
            style={{
              display: 'inline-block',
              transform: 'scale(1.22)',
              transformOrigin: '50% 88%',
              color: garden.blush,
            }}
          >
            {title.ae}
          </span>
          {/*
            * Trên điện thoại, ngắt ngay khoảng trắng đầu tiên sau chữ `ӕ` —
            * "beӕn" một dòng, "weirdo" một dòng. Cắt ở đây chứ không sửa
            * `splitAesc`: hàm ấy chia theo con chữ `ӕ` cho cả trang dùng, còn
            * chỗ xuống dòng là quyết định của riêng bố cục này.
            */}
          {mob ? <PostSplit text={title.post} /> : title.post}
          <br />
          <span
            style={{
              fontStyle: 'italic',
              color: ink.green,
              ...(mob ? { fontSize: 'min(58px, 15.5vw)', display: 'inline-block' } : null),
            }}
          >
            {site.lTitle2}
          </span>
        </h1>
        <div className="bw-intro">
          <div style={{ fontSize: 15, lineHeight: 1.5, color: ink.strong, ...prose }}>{site.lIntro1}</div>
          <div style={{ fontSize: 13.5, lineHeight: 1.45, color: ink.soft, ...prose }}>{site.lIntro2}</div>
          <Hover
            onClick={nav.goHome}
            style={{
              ...eyebrow,
              letterSpacing: '.14em',
              color: ink.green,
              cursor: 'pointer',
              paddingTop: 4,
            }}
            hoverStyle={{ color: ink.base }}
          >
            {site.lCta} {posts.length} bài →
          </Hover>
        </div>
      </div>

      {modules.map((m) => {
        const entries = postsByModule.get(m.id) ?? []
        return (
          <div
            key={m.id}
            onClick={() => nav.openModule(m.id)}
            style={{
              background: m.accent,
              color: m.on_color,
              padding: mob ? '34px 20px 52px' : '44px 56px 72px',
              cursor: 'pointer',
            }}
          >
            <div className="bw-modhead">
              <div style={{ minWidth: 0, maxWidth: '100%' }}>
                <div style={{ ...eyebrow, letterSpacing: '.16em', marginBottom: 12, opacity: 0.65 }}>
                  {m.concept} — {entries.length} bài
                </div>
                {/* `lang="en"` + luật ngắt âm tiết: xem `wrapTitle` trong tokens.
                    Chỗ này là nơi luật ấy ra đời, giờ cả tám tầng tiêu đề đọc
                    chung một bản. */}
                <h3
                  lang="en"
                  style={
                    {
                      ...wrapTitle,
                      fontFamily: serif,
                      fontSize: mob ? 40 : 72,
                      lineHeight: 0.94,
                      letterSpacing: '-.035em',
                      margin: 0,
                    } as CSSProperties
                  }
                >
                  {m.title}
                </h3>
              </div>

              {/*
                Hẹp thì lấy bản mô tả NGẮN. Bản dài của `sensory` là ~90 chữ —
                trên màn 390 nó đẩy dải ảnh và danh sách "Mới nhất" xuống quá
                sâu, người đọc cuộn hết đoạn văn mới thấy có bài để bấm.
              */}
              <div style={{ fontSize: 14, lineHeight: 1.45, ...prose }}>
                {mob ? m.blurb : m.long_desc}
              </div>

              <div>
                <div style={{ ...eyebrow, letterSpacing: '.14em', opacity: 0.65, marginBottom: 10 }}>
                  Mới nhất
                </div>
                {/* Module chưa có bài thì trước đây chỉ còn cái tiêu đề trên một
                    khoảng trống — đọc ra như trang vỡ chứ không như "chưa viết". */}
                {entries.length === 0 && (
                  <div style={{ fontSize: 13, fontStyle: 'italic', opacity: 0.6, paddingTop: 2 }}>
                    chưa có bài nào
                  </div>
                )}
                {entries.slice(0, 3).map((e) => (
                  <div
                    key={e.id}
                    style={{
                      display: 'flex',
                      gap: 12,
                      padding: '7px 0',
                      borderTop: '1px solid rgba(35,33,26,.16)',
                    }}
                  >
                    <div style={{ fontFamily: sans, fontSize: 9.5, opacity: 0.6, paddingTop: 5 }}>
                      {e.date_label}
                    </div>
                    <div style={{ fontFamily: serif, fontSize: 19, lineHeight: 1.2 }}>{e.en}</div>
                  </div>
                ))}
              </div>
            </div>

            <ImageBand m={m} />
          </div>
        )
      })}
    </div>
  )
}
