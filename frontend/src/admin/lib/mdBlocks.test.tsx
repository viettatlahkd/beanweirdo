import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LiveText } from '../components/LiveText'
import { mdBlocks } from './mdBlocks'

/** Mỗi dòng là một cái bẫy đã gặp thật, xem chú thích trong `mdBlocks.ts`. */
const cases = [
  'A\n\nB',
  '## H\n\npara',
  '- a\n- b\n\n- c\n- d',
  '> một\n\n> hai',
  'dòng1\ndòng2\n\nsau',
  '## H1\n\n## H2',
  '- a\n\npara\n\n- b',
  '1. a\n2. b\n\n1. c',
  'A\n\n\n\nB',
  'p1\np2\n- a\n- b\np3',
  '# T\n## H\npara\n- x\n  - y\npara2',
  '1. a\n- b',
  '> q\npara',
  'chỉ một dòng',
  '',
]

describe('mdBlocks đếm đúng số khối mặt soạn vẽ ra', () => {
  /*
   * Đây là **bài kiểm đối chiếu**, không phải bài kiểm theo ý mình nghĩ.
   *
   * `mdBlocks` chỉ có ích nếu nó đếm ra đúng bằng số khối Lexical dựng, nên
   * mỗi trường hợp dựng thật một mặt soạn rồi đếm con của nó. Đo kiểu này
   * bắt được ba luật không ai đoán ra: danh sách nuốt dòng chữ ngay sau nó,
   * một dòng trống không cắt hai danh sách cùng kiểu, và trích dẫn cũng nuốt
   * như danh sách.
   */
  for (const md of cases) {
    it(`khớp với Lexical: ${JSON.stringify(md)}`, () => {
      const { container } = render(<LiveText text={md} onCommit={() => {}} />)
      const kids = Array.from(container.querySelector('.awc-live-input')!.children)
      expect(mdBlocks(md)).toHaveLength(kids.length)
    })
  }
})
