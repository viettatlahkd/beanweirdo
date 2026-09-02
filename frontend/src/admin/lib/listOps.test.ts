import { describe, expect, it } from 'vitest'
import { duplicateAt, insertAt, move, removeAt } from './listOps'

const list = ['a', 'b', 'c']

describe('moving an item', () => {
  it('lifts it out and drops it in, rather than swapping with a neighbour', () => {
    expect(move(list, 0, 2)).toEqual(['b', 'c', 'a'])
    expect(move(list, 2, 0)).toEqual(['c', 'a', 'b'])
  })

  it('returns the same list when there is nowhere to go', () => {
    expect(move(list, 0, -1)).toBe(list)
    expect(move(list, 2, 3)).toBe(list)
    expect(move(list, 1, 1)).toBe(list)
  })
})

describe('adding an item', () => {
  it('puts it where asked', () => {
    expect(insertAt(list, 1, 'x')).toEqual(['a', 'x', 'b', 'c'])
  })

  it('clamps rather than leaving a hole', () => {
    expect(insertAt(list, 99, 'x')).toEqual(['a', 'b', 'c', 'x'])
    expect(insertAt(list, -5, 'x')).toEqual(['x', 'a', 'b', 'c'])
  })
})

describe('removing an item', () => {
  it('takes it out', () => {
    expect(removeAt(list, 1)).toEqual(['a', 'c'])
  })

  it('can be told to keep the last one, so a body never draws as a blank page', () => {
    expect(removeAt(['only'], 0, true)).toEqual(['only'])
    expect(removeAt(['only'], 0)).toEqual([])
  })
})

describe('copying an item', () => {
  it('puts the copy directly beneath, where it was made', () => {
    expect(duplicateAt(list, 0)).toEqual(['a', 'a', 'b', 'c'])
  })

  it('takes a copier, for items that must not share what is inside them', () => {
    const rows = [{ cells: ['x'] }]
    const copied = duplicateAt(rows, 0, (r) => ({ cells: [...r.cells] }))
    copied[1].cells[0] = 'y'
    expect(rows[0].cells[0]).toBe('x')
  })

  it('leaves the list alone when asked for an item that is not there', () => {
    expect(duplicateAt(list, 9)).toBe(list)
  })
})
