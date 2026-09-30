import { describe, expect, it } from 'vitest'
import { countUnder, groupByModule, postsUnder } from './postGroups'

const p = (id: string, module_id: string) => ({ id, module_id })

const modules = [
  { id: 'bean', parent_id: null },
  { id: 'roasting', parent_id: 'bean' },
  { id: 'biochem', parent_id: 'bean' },
  { id: 'heat', parent_id: 'roasting' },
  { id: 'ghi', parent_id: null },
]

const posts = [
  p('b1', 'bean'),
  p('r1', 'roasting'),
  p('r2', 'roasting'),
  p('h1', 'heat'),
  p('bc1', 'biochem'),
  p('g1', 'ghi'),
]

describe('groupByModule', () => {
  it('files each post under the module it names, and nowhere else', () => {
    const map = groupByModule(posts)
    expect(map.get('roasting')?.map((x) => x.id)).toEqual(['r1', 'r2'])
    // Not the branch above it: a caller wanting the whole branch says so.
    expect(map.get('bean')?.map((x) => x.id)).toEqual(['b1'])
  })

  it('keeps the order it was given, which is the order the reader will see', () => {
    const map = groupByModule([p('sau', 'bean'), p('truoc', 'bean')])
    expect(map.get('bean')?.map((x) => x.id)).toEqual(['sau', 'truoc'])
  })

  it('has no key for a module nothing was filed under', () => {
    expect(groupByModule(posts).has('khong-co')).toBe(false)
  })
})

describe('postsUnder', () => {
  it('reaches every level of the branch, which a flat map could not', () => {
    expect(postsUnder(posts, modules, 'bean').map((x) => x.id)).toEqual([
      'b1',
      'r1',
      'r2',
      'h1',
      'bc1',
    ])
  })

  it('includes the branch page own posts alongside its children', () => {
    expect(postsUnder(posts, modules, 'roasting').map((x) => x.id)).toEqual(['r1', 'r2', 'h1'])
  })

  it('is just the module own posts when nothing sits inside it', () => {
    expect(postsUnder(posts, modules, 'ghi').map((x) => x.id)).toEqual(['g1'])
  })

  it('stops a branch heading reading as empty', () => {
    // bean weirdo holds no posts of its own in the owner sketch; everything
    // written under it is one level down.
    const branchOnly = posts.filter((x) => x.module_id !== 'bean')
    expect(countUnder(branchOnly, modules, 'bean')).toBe(4)
    expect(groupByModule(branchOnly).get('bean')).toBeUndefined()
  })

  it('counts nothing for a module that does not exist', () => {
    expect(countUnder(posts, modules, 'khong-co')).toBe(0)
  })
})
