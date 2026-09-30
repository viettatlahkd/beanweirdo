import { describe, expect, it } from 'vitest'
import { planModuleMove } from './moduleMove'

/**
 * Cây dùng chung cho cả tệp, viết đúng thứ tự màn hình bày nó:
 *
 *   a
 *     a1
 *     a2
 *   b
 *     b1
 *   c
 */
const TREE = [
  { id: 'a', parent_id: null },
  { id: 'a1', parent_id: 'a' },
  { id: 'a2', parent_id: 'a' },
  { id: 'b', parent_id: null },
  { id: 'b1', parent_id: 'b' },
  { id: 'c', parent_id: null },
]

const plan = (drag: string, target: string, where: 'before' | 'after' | 'inside') =>
  planModuleMove(TREE, drag, target, where)

const ok = (r: ReturnType<typeof plan>) => {
  if ('error' in r) throw new Error(`không mong đợi lỗi: ${r.error}`)
  return r
}

describe('thả một module vào cây', () => {
  it('thả vào trong thì đổi cha, và cắm xuống cuối danh sách con', () => {
    const r = ok(plan('c', 'a', 'inside'))
    expect(r.parentId).toBe('a')
    expect(r.order).toEqual(['a', 'a1', 'a2', 'c', 'b', 'b1'])
  })

  it('thả lên trên một hàng thì thành anh em đứng ngay trước nó', () => {
    const r = ok(plan('c', 'a2', 'before'))
    expect(r.parentId).toBe('a')
    expect(r.order).toEqual(['a', 'a1', 'c', 'a2', 'b', 'b1'])
  })

  /*
   * Chỗ dễ sai nhất: `b` có `b1` nằm trong. Cắm ngay sau dòng `b` thì thẻ vừa
   * thả rơi vào giữa ruột `b`, mà cha của nó lại là tầng trên cùng — cây dựng
   * lại từ `sort_order` sẽ khác hẳn cái người ta vừa nhìn.
   */
  it('thả xuống dưới một hàng có con thì qua hết cả cụm con của nó', () => {
    const r = ok(plan('c', 'b', 'after'))
    expect(r.parentId).toBeNull()
    expect(r.order).toEqual(['a', 'a1', 'a2', 'b', 'b1', 'c'])
  })

  it('kéo một module là kéo cả những gì nằm trong nó', () => {
    const r = ok(plan('a', 'c', 'after'))
    expect(r.parentId).toBeNull()
    expect(r.order).toEqual(['b', 'b1', 'c', 'a', 'a1', 'a2'])
  })

  it('kéo cả cụm vào trong một module khác', () => {
    const r = ok(plan('b', 'a1', 'inside'))
    expect(r.parentId).toBe('a1')
    expect(r.order).toEqual(['a', 'a1', 'b', 'b1', 'a2', 'c'])
  })

  it('đưa một module con trở lại tầng trên cùng', () => {
    const r = ok(plan('a1', 'c', 'after'))
    expect(r.parentId).toBeNull()
    expect(r.order).toEqual(['a', 'a2', 'b', 'b1', 'c', 'a1'])
  })

  /*
   * Luật này máy chủ cũng giữ (`backend/api/modules/[id]/index.ts`), và ở đây
   * gọi chung một hàm `canReparent` chứ không chép lại — hai bản chép tay thì
   * một ngày nào đó chúng trả lời khác nhau.
   */
  it('từ chối thả một module vào bên trong chính nó', () => {
    expect(plan('a', 'a1', 'inside')).toEqual({ error: expect.stringContaining('descendant') })
    expect(plan('a', 'a', 'inside')).toEqual({ error: expect.any(String) })
  })

  it('từ chối id không có trong danh sách', () => {
    expect(planModuleMove(TREE, 'khong-co', 'a', 'inside')).toEqual({ error: expect.any(String) })
    expect(planModuleMove(TREE, 'a', 'khong-co', 'inside')).toEqual({ error: expect.any(String) })
  })

  it('luôn trả về đủ mọi module, không thiếu không thừa', () => {
    for (const where of ['before', 'after', 'inside'] as const) {
      for (const drag of TREE) {
        for (const target of TREE) {
          const r = planModuleMove(TREE, drag.id, target.id, where)
          if ('error' in r) continue
          expect([...r.order].sort()).toEqual(TREE.map((t) => t.id).sort())
        }
      }
    }
  })
})
