import { ink, paper } from '../../design/tokens'

export type StepId = 'metadata' | 'template' | 'editor'

const STEPS: { id: StepId; label: string }[] = [
  { id: 'metadata', label: '1. Metadata' },
  { id: 'template', label: '2. Template' },
  { id: 'editor', label: '3. Soạn bài' },
]

export function Stepper({ current }: { current: StepId }) {
  const order = STEPS.map((s) => s.id)
  const currentIndex = order.indexOf(current)

  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
      {STEPS.map((s, i) => {
        const isCurrent = i === currentIndex
        const isDone = i < currentIndex
        return (
          <div
            key={s.id}
            style={{
              fontSize: 11.5,
              padding: '6px 14px',
              borderRadius: 6,
              border: `1px solid ${isDone ? ink.green : isCurrent ? ink.base : paper.rule}`,
              color: isDone ? ink.green : isCurrent ? ink.base : ink.faint,
              fontWeight: isCurrent ? 500 : 400,
              background: isCurrent ? paper.hover : 'transparent',
            }}
          >
            {s.label}
          </div>
        )
      })}
    </div>
  )
}
