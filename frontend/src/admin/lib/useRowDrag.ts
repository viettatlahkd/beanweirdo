/** The two indices a drag needs, and what to do when it lands. */
import { useState } from 'react'
import type { RowDrag } from '../components/RowShell'

export function useRowDrag(onMove: (from: number, to: number) => void): RowDrag {
  const [from, setFrom] = useState<number | null>(null)
  const [over, setOver] = useState<number | null>(null)

  return {
    from,
    over,
    setFrom,
    setOver,
    drop(to) {
      if (from !== null && from !== to) onMove(from, to)
      setFrom(null)
      setOver(null)
    },
    end() {
      setFrom(null)
      setOver(null)
    },
  }
}
