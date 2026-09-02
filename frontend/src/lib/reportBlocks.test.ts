import { describe, expect, it } from 'vitest'
import { toReportBlocks } from './reportBlocks'

/*
 * The Field report template holds nine blocks of real sample content and every
 * one of them was invisible: it stores `{t:'h', v:'…'}` while the renderer
 * switches on `block.type`, and `toReportData` cast between the two without
 * translating. The template page drew a coloured band over an empty page, and
 * a post started from that template inherited the silence — the editor showed
 * ten empty rows because it could not read what it had been handed.
 */
describe('toReportBlocks', () => {
  it('reads the short keys the templates were written with', () => {
    expect(toReportBlocks([{ t: 'meta', v: 'Trại Cầu Đất' }])).toEqual([
      { type: 'meta', text: 'Trại Cầu Đất' },
    ])
    expect(toReportBlocks([{ t: 'h', v: 'Rang thử' }])).toEqual([{ type: 'heading', text: 'Rang thử' }])
    expect(toReportBlocks([{ t: 'p', v: 'Mẻ này…' }])).toEqual([{ type: 'paragraph', text: 'Mẻ này…' }])
    expect(toReportBlocks([{ t: 'image', v: 'ảnh — nhân sau khi drop' }])).toEqual([
      { type: 'image', caption: 'ảnh — nhân sau khi drop' },
    ])
  })

  it('turns a metrics row into labelled values', () => {
    expect(toReportBlocks([{ m: [{ k: 'Charge', v: '196°C' }] }])).toEqual([
      { type: 'metrics', items: [{ label: 'Charge', value: '196°C' }] },
    ])
  })

  it('turns a curve into bars', () => {
    expect(toReportBlocks([{ c: [{ l: '0:00', v: 34 }] }])).toEqual([
      { type: 'chart', points: [{ label: '0:00', heightPct: 34 }] },
    ])
  })

  it('turns a head and rows into a table', () => {
    expect(toReportBlocks([{ t: 'table', th: ['Mốc', 'Nhiệt'], tr: [['Sấy', '196°C']] }])).toEqual([
      { type: 'table', table: { columns: ['Mốc', 'Nhiệt'], rows: [{ cells: ['Sấy', '196°C'] }] } },
    ])
  })

  it('leaves a block already in the drawn shape alone', () => {
    const drawn = { type: 'heading', text: 'Đã đúng dạng' }
    expect(toReportBlocks([drawn])).toEqual([drawn])
  })

  /*
   * An empty row on the page reads as "write here", which is a lie about
   * content that exists and cannot be read.
   */
  it('drops a block in neither shape rather than drawing it empty', () => {
    expect(toReportBlocks([{ nonsense: true }, { t: 'h', v: 'Giữ lại' }])).toEqual([
      { type: 'heading', text: 'Giữ lại' },
    ])
  })

  it('survives a body that is not a list', () => {
    expect(toReportBlocks(null)).toEqual([])
    expect(toReportBlocks({ sections: [] })).toEqual([])
  })
})
