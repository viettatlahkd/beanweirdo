import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/*
 * Không hook nào được đứng sau một chỗ thoát sớm.
 *
 * `EditorContent` từng gọi `useState` cho khung căn ảnh ở dưới chỗ
 * `if (!post) return <Đang tải…>`. Lượt vẽ đầu chạy bốn hook, tải xong bài thì
 * lượt sau chạy năm; React đếm không khớp là ném lỗi và cả màn trắng xoá — bấm
 * "Sửa" bài nào cũng trắng. Chủ site gặp trước khi bộ kiểm gặp.
 *
 * Chỗ ấy đã có bài kiểm riêng dựng cả màn hình (`Editor.mount.test.tsx`). Bài
 * này là lưới bắt cho cả họ: dự án không có eslint, nên luật "hook luôn chạy đủ
 * mọi lượt vẽ" không có ai canh ngoài chỗ này.
 *
 * Phép dò đọc theo lề chữ, hợp với lối viết của repo: trong thân một hàm cấp
 * cao nhất, câu lệnh của chính hàm ấy thụt vào đúng hai dấu cách; khối lồng bên
 * trong thụt bốn trở lên nên không lọt vào đây.
 */
const OPEN = /^(export\s+)?(default\s+)?(async\s+)?function\s+\w+|^(export\s+)?const\s+\w+\s*(:[^=]*)?=\s*(async\s*)?\(/
const RETURN = /^ {2}(if\s*\(.*\)\s*)?return\b/
const HOOK = /^ {2}(const\s+[^=]+=\s*)?use[A-Z]\w*(<[^()]*>)?\(/

function sources(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist') continue
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) sources(path, out)
    else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(path)
  }
  return out
}

function offenders(path: string): string[] {
  const lines = readFileSync(path, 'utf8').split('\n')
  const found: string[] = []
  let inside = false
  let name = ''
  let returnedAt = 0
  lines.forEach((line, i) => {
    if (OPEN.test(line)) {
      inside = true
      name = line.trim().slice(0, 60)
      returnedAt = 0
      return
    }
    if (line === '}' || line === '})') {
      inside = false
      return
    }
    if (!inside) return
    if (RETURN.test(line)) {
      if (!returnedAt) returnedAt = i + 1
      return
    }
    if (returnedAt && HOOK.test(line)) {
      found.push(`${path}:${i + 1} — hook đứng sau chỗ thoát ở dòng ${returnedAt}, trong ${name}`)
    }
  })
  return found
}

describe('luật hook', () => {
  it('không hook nào đứng sau một chỗ thoát sớm', () => {
    const files = [...sources('frontend/src'), ...sources('packages')]
    expect(files.length).toBeGreaterThan(50)
    expect(files.flatMap(offenders)).toEqual([])
  })
})
