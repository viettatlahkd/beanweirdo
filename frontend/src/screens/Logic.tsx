import { Breadcrumbs } from '../components/Breadcrumbs'
import { LOGIC, SCOPE_COLOR, SCOPE_KEY } from '../content/logic'
import { interpolateNav } from '../content/navItems'
import { useSiteCopy } from '../data/useSiteCopy'
import { ink, paper, prose, sans, serif } from '../design/tokens'

/**
 * System conventions — the rulebook, read-only.
 *
 * Three parts (visual, interaction, per-template), each a run of numbered
 * groups. Every rule carries a scope swatch on the left and a worked example on
 * the right, so the reader can tell at a glance how far a rule reaches without
 * reading it. Page names inside the copy are `[[token]]`s resolved against the
 * live nav, so renaming a page rewrites the rules that mention it.
 */
export function Logic() {
  const { site } = useSiteCopy()
  const tok = (s: string) => interpolateNav(s, site.sections)

  return (
    <div style={{ background: paper.cream, color: ink.base, minHeight: '100vh' }}>
      <div style={{ background: '#102F35', color: '#F4F4EF', padding: '44px 56px 38px' }}>
        <Breadcrumbs style={{ marginBottom: 22, opacity: 0.7 }} />

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 44,
            flexWrap: 'wrap',
          }}
        >
          <h1
            style={{
              fontFamily: serif,
              fontWeight: 400,
              fontSize: 76,
              lineHeight: 0.88,
              letterSpacing: '-.04em',
              margin: 0,
            }}
          >
            {site.logicTitle}
          </h1>
          <div
            style={{
              fontFamily: sans,
              fontWeight: 300,
              fontSize: 13.5,
              lineHeight: 1.55,
              maxWidth: 400,
              opacity: 0.8,
              paddingBottom: 8,
              ...prose,
            }}
          >
            {site.logicIntro}
          </div>
        </div>
      </div>

      <div style={{ padding: '0 56px 120px', maxWidth: 1120 }}>
        <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', padding: '16px 0 20px' }}>
          {SCOPE_KEY.map((k) => (
            <div key={k.s}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, background: k.c, flex: 'none' }} />
                <div
                  style={{
                    fontFamily: sans,
                    fontSize: 10.5,
                    fontWeight: 500,
                    letterSpacing: '.14em',
                    textTransform: 'uppercase',
                    color: ink.soft,
                  }}
                >
                  {k.s}
                </div>
              </div>
              <div
                style={{
                  fontFamily: sans,
                  fontWeight: 300,
                  fontSize: 12,
                  color: '#A2A296',
                  margin: '3px 0 0 16px',
                }}
              >
                {k.d}
              </div>
            </div>
          ))}
        </div>

        {LOGIC.map((part) => (
          <div key={part.p} style={{ marginTop: 38 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: 18,
                flexWrap: 'wrap',
                borderBottom: `2px solid ${ink.base}`,
                paddingBottom: 12,
              }}
            >
              <div style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 19, color: ink.faint }}>
                {part.p}
              </div>
              <div style={{ fontFamily: serif, fontSize: 40, lineHeight: 1, letterSpacing: '-.035em' }}>
                {tok(part.part)}
              </div>
              <div
                style={{
                  flex: '1 1 240px',
                  fontFamily: sans,
                  fontWeight: 300,
                  fontSize: 12.5,
                  lineHeight: 1.5,
                  color: '#8A8A7C',
                  paddingBottom: 4,
                }}
              >
                {tok(part.note)}
              </div>
            </div>

            {part.groups.map((group) => (
              <div
                key={group.n}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0,168px) minmax(0,1fr)',
                  gap: 26,
                  padding: '18px 0 16px',
                  borderBottom: '1px solid #E8E2CE',
                  alignItems: 'start',
                }}
              >
                <div
                  style={{ position: 'sticky', top: 24, display: 'flex', alignItems: 'baseline', gap: 9 }}
                >
                  <div
                    style={{
                      fontFamily: sans,
                      fontSize: 10.5,
                      fontWeight: 500,
                      letterSpacing: '.18em',
                      color: ink.faint,
                    }}
                  >
                    {group.n}
                  </div>
                  <div
                    style={{ fontFamily: serif, fontSize: 23, lineHeight: 1.06, letterSpacing: '-.03em' }}
                  >
                    {tok(group.g)}
                  </div>
                </div>
                <div>
                  {group.items.map((item, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '14px minmax(0,1fr) minmax(0,186px)',
                        gap: 16,
                        padding: '7px 0',
                        alignItems: 'baseline',
                      }}
                    >
                      <div
                        title={item.s}
                        style={{
                          width: 7,
                          height: 7,
                          background: SCOPE_COLOR[item.s],
                          marginTop: 6,
                        }}
                      />
                      <div
                        style={{
                          fontFamily: sans,
                          fontWeight: 300,
                          fontSize: 14.5,
                          lineHeight: 1.45,
                          color: ink.strong,
                        }}
                      >
                        {tok(item.r)}
                      </div>
                      <div style={{ fontFamily: sans, fontSize: 12, lineHeight: 1.5, color: '#A2A296' }}>
                        {tok(item.e)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
