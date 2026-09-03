/**
 * Kéo một ảnh sang khung khác để hai ảnh đổi chỗ.
 *
 * Khung ảnh trên trang là cố định: mỗi khung một kích thước, một vị trí trong
 * bố cục. Nên thứ người dùng muốn không phải "chèn vào giữa" mà là *ảnh nào
 * nằm ở khung nào* — kéo A sang B thì hai bên đổi chỗ cho nhau, chú thích đi
 * theo ảnh.
 *
 * Trước đó muốn đổi thứ tự phải xoá ảnh rồi tải lại từng cái, và mỗi lần như
 * vậy là mất chú thích cùng điểm căn khung đã chỉnh.
 */
import { useState } from 'react'

export type SlotSwap = {
  /** Khung đang được kéo, để làm mờ nó đi. */
  from: number | null
  /** Khung con trỏ đang ở trên, để đánh dấu chỗ sắp thả. */
  over: number | null
  slotProps: (index: number) => {
    draggable: true
    onDragStart: () => void
    onDragEnd: () => void
    onDragOver: (e: { preventDefault: () => void }) => void
    onDrop: () => void
  }
}

export function useSlotSwap(onSwap: (a: number, b: number) => void): SlotSwap {
  const [from, setFrom] = useState<number | null>(null)
  const [over, setOver] = useState<number | null>(null)

  const done = () => {
    setFrom(null)
    setOver(null)
  }

  return {
    from,
    over,
    slotProps: (index) => ({
      draggable: true,
      onDragStart: () => setFrom(index),
      onDragEnd: done,
      onDragOver: (e) => {
        if (from === null || from === index) return
        e.preventDefault()
        setOver(index)
      },
      onDrop: () => {
        if (from !== null && from !== index) onSwap(from, index)
        done()
      },
    }),
  }
}
