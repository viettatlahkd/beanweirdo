import { useEffect, useState } from 'react'
import type { Author, AuthorRef } from 'api-contract'
import { setPostAuthors } from '../lib/apiClient'
import { forgetAuthors, listAuthorsCached } from '../lib/lists'
import { IconButton } from '../../design/Button'
import { IconClose } from '../../design/icons'
import { radius } from '../../design/controls'
import { ink, paper, sans } from '../../design/tokens'
import { useToast } from '../../design/Toaster'
import { Avatar } from './AuthorsPanel'

/**
 * Ai đứng tên bài, theo đúng thứ tự dòng tác giả trên trang.
 *
 * Ghi ngay mỗi lần đổi, cả với bài đã đăng — như module và ghim, không chờ
 * "Đăng thay đổi" (xem `api/posts/[id]/authors.ts`). Ghi hỏng thì danh sách
 * quay về như cũ, để màn hình không nói một điều mà trang không làm.
 */
export function AuthorPicker({ postId, initial }: { postId: string; initial: AuthorRef[] }) {
  const toast = useToast()
  const [value, setValue] = useState(initial)
  const [all, setAll] = useState<Author[]>([])

  useEffect(() => {
    listAuthorsCached().then(setAll).catch(() => setAll([]))
  }, [])

  const write = async (next: AuthorRef[]) => {
    const before = value
    setValue(next)
    try {
      setValue(await setPostAuthors(postId, next.map((a) => a.id)))
      forgetAuthors()
    } catch (e) {
      setValue(before)
      toast.error((e as Error).message)
    }
  }

  const move = (i: number) => {
    const next = [...value]
    ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
    void write(next)
  }

  const addable = all.filter((a) => a.active && !value.some((v) => v.id === a.id))

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12, color: ink.muted }}>
      Tác giả:
      {value.length === 0 && <span style={{ color: ink.faint }}>chưa ai đứng tên</span>}
      {value.map((a, i) => (
        <span
          key={a.id}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '2px 4px 2px 6px',
            border: `1px solid ${paper.rule}`,
            borderRadius: radius,
            background: paper.white,
            fontFamily: sans,
            color: ink.strong,
          }}
        >
          <Avatar author={a} size={18} />
          {a.name}
          {i > 0 && (
            <IconButton size="sm" label={`Đưa ${a.name} lên trước`} onClick={() => move(i)}>
              <span aria-hidden>‹</span>
            </IconButton>
          )}
          <IconButton size="sm" label={`Bỏ ${a.name}`} onClick={() => void write(value.filter((v) => v.id !== a.id))}>
            <IconClose size={12} />
          </IconButton>
        </span>
      ))}
      {addable.length > 0 && (
        <select
          aria-label="Thêm đồng tác giả"
          value=""
          onChange={(e) => {
            const picked = addable.find((a) => a.id === e.target.value)
            if (picked) void write([...value, picked])
          }}
          style={{
            fontFamily: 'inherit',
            fontSize: 12,
            color: ink.strong,
            background: paper.white,
            border: `1px solid ${ink.border}`,
            borderRadius: radius,
            padding: '3px 8px',
          }}
        >
          <option value="">+ thêm tác giả</option>
          {addable.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}
