import { describe, expect, it } from 'vitest'
import { AREA_HOME, areaFromPath, areaOfGroup, isPrivate, screenAllowed, type Area } from './area'

describe('areaFromPath', () => {
  it('maps each entry point to its area', () => {
    expect(areaFromPath('/')).toBe('public')
    expect(areaFromPath('/practice')).toBe('practice')
    expect(areaFromPath('/admin')).toBe('admin')
  })

  it('keeps sub-paths inside their area', () => {
    expect(areaFromPath('/admin?preview=abc')).toBe('admin')
    expect(areaFromPath('/practice/anything')).toBe('practice')
  })

  it('treats every unknown path as public', () => {
    expect(areaFromPath('/khong-ton-tai')).toBe('public')
    expect(areaFromPath('/administrator')).toBe('admin')
  })
})

describe('areaOfGroup', () => {
  it('sends the two private groups to their own areas', () => {
    expect(areaOfGroup('Public')).toBe('public')
    expect(areaOfGroup('Practice')).toBe('practice')
    expect(areaOfGroup('Admin')).toBe('admin')
  })
})

describe('isPrivate', () => {
  it('is true for everything except the public journal', () => {
    expect(isPrivate('public')).toBe(false)
    expect(isPrivate('practice')).toBe(true)
    expect(isPrivate('admin')).toBe(true)
  })
})

describe('screenAllowed', () => {
  it("refuses a private screen asked for on the public site", () => {
    // `/?screen=cms` typed into the address bar must not draw the back office.
    expect(screenAllowed('public', 'cms')).toBe(false)
    expect(screenAllowed('public', 'hours')).toBe(false)
    expect(screenAllowed('public', 'archive')).toBe(false)
    expect(screenAllowed('public', 'art')).toBe(false)
    expect(screenAllowed('public', 'logic')).toBe(false)
    expect(screenAllowed('public', 'postEdit')).toBe(false)
  })

  it('keeps the two private areas out of each other', () => {
    expect(screenAllowed('practice', 'cms')).toBe(false)
    expect(screenAllowed('admin', 'hours')).toBe(false)
  })

  it('allows each area its own screens', () => {
    expect(screenAllowed('public', 'landing')).toBe(true)
    expect(screenAllowed('public', 'module')).toBe(true)
    expect(screenAllowed('practice', 'hours')).toBe(true)
    expect(screenAllowed('admin', 'cms')).toBe(true)
    expect(screenAllowed('admin', 'postNew')).toBe(true)
  })

  it('lets the three templates render in both areas — post vs blank sample', () => {
    for (const screen of ['article', 'cards', 'report']) {
      expect(screenAllowed('public', screen)).toBe(true)
      expect(screenAllowed('admin', screen)).toBe(true)
    }
  })

  it('always allows the screen an area opens on', () => {
    for (const area of ['public', 'practice', 'admin'] as Area[]) {
      expect(screenAllowed(area, AREA_HOME[area])).toBe(true)
    }
  })
})
