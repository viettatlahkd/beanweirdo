import { describe, expect, it } from 'vitest'
import { postDescription, postTitle } from './postText'

const base = { en: 'Sensory Lexicon', vi: 'Bộ từ vựng mô tả hương vị' }

describe('postText', () => {
  it('reads the title from the one field every listing uses', () => {
    expect(postTitle(base)).toBe('Sensory Lexicon')
  })

  it('takes the description from the subtitle when the post has one', () => {
    expect(postDescription({ ...base, lead: 'Nguồn gốc của vị chát' })).toBe('Nguồn gốc của vị chát')
  })

  it('falls back to the stored key phrase when there is no subtitle', () => {
    expect(postDescription({ ...base, lead: null })).toBe('Bộ từ vựng mô tả hương vị')
    expect(postDescription(base)).toBe('Bộ từ vựng mô tả hương vị')
  })

  it('treats a whitespace-only subtitle as none — an empty sapo is not a description', () => {
    expect(postDescription({ ...base, lead: '   ' })).toBe('Bộ từ vựng mô tả hương vị')
  })
})
