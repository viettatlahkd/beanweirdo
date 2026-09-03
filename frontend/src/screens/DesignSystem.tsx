import type { CSSProperties } from 'react'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { useSiteCopy } from '../data/useSiteCopy'
import { indexModules, useModules } from '../data/useModules'
import {
  colorRules,
  gridRules,
  imageRules,
  spaceScale,
  swatches,
  typeScale,
} from '../content/designSystem'
import { garden, ink, prose, sans, serif } from '../design/tokens'

const columnLabel: CSSProperties = {
  fontFamily: sans,
  fontSize: 10,
  letterSpacing: '.14em',
  textTransform: 'uppercase',
  color: ink.muted,
  marginBottom: 16,
}

const ruleRow: CSSProperties = { display: 'flex', gap: 12, padding: '11px 0', borderBottom: `1px solid #EBE5D3` }

function RuleList({ items }: { items: { n: string; t: string }[] }) {
  return (
    <>
      {items.map((r) => (
        <div key={r.n} style={ruleRow}>
          <div style={{ fontFamily: sans, fontSize: 10, color: ink.faint, paddingTop: 3 }}>{r.n}</div>
          <div style={{ fontSize: 13.5, lineHeight: 1.3, color: '#3B3729' }}>{r.t}</div>
        </div>
      ))}
    </>
  )
}

/** Stands in for a field the CMS has not filled yet. */
function Unset() {
  return (
    <span style={{ color: ink.faint, fontStyle: 'italic' }}>chưa đặt — điền trong Content management</span>
  )
}

/**
 * Its own tab, deliberately not the homepage — tokens only: palette, type,
 * spacing rhythm, grid rules, and the per-module theme table.
 */
export function DesignSystem() {
  const { site } = useSiteCopy()
  const { data: allModules } = useModules()
  // The same list the index shows — the journals included, since a special
  // module is still a module. Ghi 02 is private, so it is not here.
  const modules = indexModules(allModules)

  return (
    <div>
      <div style={{ background: '#F7DCD3', color: ink.base, padding: '44px 56px 56px' }}>
        <Breadcrumbs color="#8A6B62" />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)',
            gap: 48,
            alignItems: 'end',
          }}
        >
          <h1
            style={{
              fontFamily: serif,
              fontSize: 100,
              lineHeight: 0.92,
              letterSpacing: '-.03em',
              margin: 0,
            }}
          >
            {site.artT1}
            <br />
            <span style={{ fontStyle: 'italic', color: ink.green }}>{site.artT2}</span>
          </h1>
          <div style={{ fontSize: 14, lineHeight: 1.45, marginTop: 36, color: ink.mid , ...prose}}>
            {site.artIntro}
          </div>
        </div>
      </div>

      <div style={{ padding: '52px 56px 110px', maxWidth: 1240 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))', gap: 0 }}>
          {swatches.map((s) => (
            <div
              key={s.hex}
              style={{
                background: s.hex,
                aspectRatio: 1.5,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                padding: 12,
              }}
            >
              <div style={{ fontFamily: sans, fontSize: 10, color: s.fg }}>{s.name}</div>
              <div style={{ fontFamily: sans, fontSize: 9, color: s.fg, opacity: 0.7 }}>
                {s.hex}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3,minmax(0,1fr))',
            gap: 40,
            marginTop: 44,
          }}
        >
          <div>
            <div style={columnLabel}>Typeface</div>
            <div style={{ fontFamily: serif, fontSize: 54, lineHeight: 0.98, letterSpacing: '-.02em' }}>
              Playfair
              <br />
              <span style={{ fontStyle: 'italic', color: ink.green }}>Display</span>
            </div>
            <div style={{ fontSize: 12.5, color: ink.muted, margin: '10px 0 20px' }}>
              Chỉ dùng cho tiêu đề. Weight 400, nét thanh đậm rõ, có đủ dấu tiếng Việt. Nghiêng dùng
              cho vế thứ hai của tiêu đề.
            </div>
            <div style={{ fontSize: 19 }}>Be Vietnam Pro Light 300</div>
            <div style={{ fontSize: 12.5, color: ink.muted, margin: '6px 0 18px' }}>
              Toàn bộ phần chữ không phải tiêu đề: thân bài, mô tả, nhãn, số, ngày. Chỉ nạp duy nhất
              weight 300 — không đậm, không nhấn bằng độ dày. Hỗ trợ dấu tiếng Việt đầy đủ.
            </div>
            <div
              style={{
                fontSize: 11,
                letterSpacing: '.14em',
                textTransform: 'uppercase',
                color: ink.soft,
              }}
            >
              Nhãn — cùng font, chỉ đổi cỡ và giãn chữ
            </div>
          </div>

          <div>
            <div style={columnLabel}>Dùng màu</div>
            <RuleList items={colorRules} />
          </div>

          <div>
            <div style={columnLabel}>Hình ảnh</div>
            <RuleList items={imageRules} />
          </div>
        </div>

        <div
          style={{
            marginTop: 56,
            paddingTop: 36,
            borderTop: `2px solid ${ink.base}`,
            display: 'grid',
            gridTemplateColumns: 'minmax(0,1.25fr) minmax(0,1fr)',
            gap: 52,
          }}
        >
          <div>
            <div style={{ ...columnLabel, marginBottom: 18 }}>Thang chữ</div>
            {typeScale.map((t) => (
              <div
                key={t.token}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '88px minmax(0,1fr) 132px',
                  gap: 16,
                  alignItems: 'baseline',
                  padding: '12px 0',
                  borderBottom: '1px solid #EBE5D3',
                }}
              >
                <div style={{ fontFamily: sans, fontSize: 10, color: ink.faint }}>{t.token}</div>
                <div
                  style={{
                    fontFamily: t.family,
                    fontSize: t.size,
                    lineHeight: 1.05,
                    letterSpacing: '-.02em',
                    color: ink.base,
                    overflow: 'hidden',
                  }}
                >
                  {t.sample}
                </div>
                <div style={{ fontFamily: sans, fontSize: 9.5, color: ink.muted, lineHeight: 1.5 }}>
                  {t.spec}
                </div>
              </div>
            ))}
          </div>

          <div>
            <div style={{ ...columnLabel, marginBottom: 18 }}>Nhịp khoảng cách</div>
            {spaceScale.map((s) => (
              <div
                key={s.px}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '9px 0',
                  borderBottom: '1px solid #EBE5D3',
                }}
              >
                <div style={{ fontFamily: sans, fontSize: 10, color: ink.faint, width: 34 }}>
                  {s.px}
                </div>
                <div style={{ height: 10, width: s.px, background: garden.blush, flex: 'none' }} />
                <div style={{ fontSize: 12.5, color: ink.soft, lineHeight: 1.35 }}>{s.use}</div>
              </div>
            ))}

            <div style={{ ...columnLabel, margin: '26px 0 12px' }}>Lưới &amp; khung</div>
            {gridRules.map((g) => (
              <div
                key={g.k}
                style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid #EBE5D3' }}
              >
                <div style={{ fontFamily: sans, fontSize: 10, color: ink.faint, width: 66, flex: 'none' }}>
                  {g.k}
                </div>
                <div style={{ fontSize: 12.5, color: ink.soft, lineHeight: 1.35 }}>{g.v}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 56, paddingTop: 36, borderTop: `2px solid ${ink.base}` }}>
          <div style={{ ...columnLabel, marginBottom: 18 }}>Theme &amp; dàn trang từng module</div>
          {modules.map((m) => (
            <div
              key={m.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '180px minmax(0,1fr) minmax(0,1fr)',
                gap: 28,
                padding: '16px 0',
                borderBottom: '1px solid #EBE5D3',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: '50%',
                    background: m.accent,
                    marginTop: 5,
                    flex: 'none',
                  }}
                />
                <div>
                  <div style={{ fontFamily: serif, fontSize: 22, lineHeight: 1.1 }}>{m.title}</div>
                  <div
                    style={{
                      fontFamily: sans,
                      fontSize: 9.5,
                      letterSpacing: '.12em',
                      textTransform: 'uppercase',
                      color: ink.muted,
                      marginTop: 4,
                    }}
                  >
                    {m.concept ? `${m.concept} / ${m.layout}` : 'module đặc biệt'}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.4, color: ink.soft }}>
                {m.treatment || <Unset />}
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.4, color: ink.soft }}>
                {m.layout_note || <Unset />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
