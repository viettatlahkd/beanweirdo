import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * A template is stored content, cloned into posts that then go their own way.
 *
 * The rulebook said the opposite for months — that a template was an empty
 * frame and that every post made from one kept the same content, changing only
 * its colours and labels. That was true of an older idea of "template", three
 * blank sample screens, and it outlived the rework that replaced them. A rule
 * that contradicts the code is worse than no rule: the next person to read it
 * fixes the code to match.
 */
describe('the rulebook describes the template model the code implements', () => {
  const rules = readFileSync(join(__dirname, '../content/logic.ts'), 'utf8')

  it('does not call a template an empty frame', () => {
    expect(rules).not.toMatch(/khung rỗng để dựng/)
  })

  it('does not claim a cloned post keeps the template content', () => {
    expect(rules).not.toMatch(/nội dung và thao tác giữ nguyên/)
  })

  it('says a post owns its content once cloned', () => {
    expect(rules).toMatch(/sửa bài không đụng đến mẫu/)
    expect(rules).toMatch(/khác cả nội dung/)
  })
})
