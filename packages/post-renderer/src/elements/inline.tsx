/**
 * Drawing a line of runs, in one place.
 *
 * List rows carried the only copy of this, so a paragraph could hold an
 * emphasis or an address and draw neither — the words came out flat with
 * nothing on screen to say a mark had been dropped. The same three marks now
 * draw the same way wherever a line appears.
 *
 * Elements that store a plain string rather than runs go through `Inline`,
 * which parses on the way to the screen. Nothing about how they are stored
 * changes: the notation *is* the storage, the way it already was for memo.
 */
import type { ReactNode } from 'react'
import { textToRuns, type Run } from './runs'

/**
 * Bốn dấu, bốn tín hiệu, cố ý không giống nhau.
 *
 * Nhấn đổi màu, và đổi dáng chữ theo hai cách rời nhau — nghiêng, đậm, hoặc
 * cả hai. Số đo không đổi màu, chỉ lấy một gạch chân xám mảnh. Địa chỉ lấy
 * màu của bài kèm gạch chân của riêng nó. Hai thứ cùng là gạch chân chỉ an
 * toàn vì màu khác nhau: địa chỉ trông như chỗ để đi tới, số đo trông như một
 * con số.
 *
 * Đậm và nghiêng bật cùng lúc cho ra đúng mức nhấn mà site có trước
 * 2026-09-19, lúc nó chỉ có một. Nên bài cũ viết `***x***` trông y như trước;
 * bài viết `**x**` nay mất phần nghiêng, `*x*` nay mất phần đậm. Đó là chỗ
 * duy nhất bản tách này đổi hình dạng bài đã đăng.
 */
function mark(run: Run, key: number, accentInk: string): ReactNode {
  const inner =
    run.em || run.b ? (
      <em
        style={{
          fontWeight: run.b ? 600 : 'inherit',
          fontStyle: run.em ? 'italic' : 'normal',
          color: accentInk,
        }}
      >
        {run.t}
      </em>
    ) : run.u ? (
      <span style={{ borderBottom: '1px solid #CFCFC4' }}>{run.t}</span>
    ) : (
      run.t
    )

  if (run.href) {
    return (
      <a
        key={key}
        href={run.href}
        // A post links out to roasters and papers; those open beside the post
        // rather than taking the reader's place in it.
        target="_blank"
        rel="noreferrer noopener"
        style={{ color: accentInk, textDecoration: 'none', borderBottom: `1px solid ${accentInk}` }}
      >
        {inner}
      </a>
    )
  }
  return <span key={key}>{inner}</span>
}

/** A line already stored as runs. */
export function Runs({ runs, accentInk }: { runs: Run[] | undefined; accentInk: string }) {
  return <>{(runs ?? []).map((r, i) => mark(r, i, accentInk))}</>
}

/** A line stored as a plain string, read in the same notation. */
export function Inline({ text, accentInk }: { text: string; accentInk: string }) {
  return <Runs runs={textToRuns(text)} accentInk={accentInk} />
}
