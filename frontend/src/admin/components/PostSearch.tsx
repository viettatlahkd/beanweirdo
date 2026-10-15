import { useId, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { ink, sans } from '../../design/tokens'
import { IconButton } from '../../design/Button'
import { IconClose, IconSearch } from '../../design/icons'
import { desk } from './Detail'

/**
 * The search bar over Nội dung's post list.
 *
 * One box for every way a post is filed (owner, 2026-10-14: "filter được
 * theo các metadata của 1 bài", big and centred like Google's). Free text
 * narrows by anything a post carries; a suggestion picked from the list
 * becomes a chip, an exact filter. The left column's entries are the same
 * chips, so the two can never disagree about what is filtered.
 */

export type Facet = 'topic' | 'kw' | 'author' | 'tpl' | 'site' | 'status'

/** One exact filter: a topic, a tag, an author, a template, a home it shows on, or a status. */
export type Token = { kind: Facet; id: string }

/** Something the box can suggest; `path` is where a topic sits on the tree. */
export type Suggestion = Token & { label: string; path?: string; color?: string; count: number }

const FACET_LABEL: Record<Facet, string> = { topic: 'Chủ đề', kw: 'Tag', author: 'Tác giả', tpl: 'Template', site: 'Hiện ở', status: 'Trạng thái' }
const FACET_ORDER: Facet[] = ['topic', 'kw', 'author', 'tpl', 'site', 'status']

/** Case- and accent-blind, so "kinh te" finds "Kinh tế". */
export const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')

/** `#` asks for tags only, `@` for authors only — the marks the site already prints before them. */
function parse(text: string): { only: Facet | null; words: string } {
  const t = text.trimStart()
  if (t.startsWith('#')) return { only: 'kw', words: t.slice(1) }
  if (t.startsWith('@')) return { only: 'author', words: t.slice(1) }
  return { only: null, words: t }
}

/** What the free text still filters by once a leading # or @ is read as a facet. */
export const freeWords = (text: string) => fold(parse(text).words).split(/\s+/).filter(Boolean)

const MAX = 9

// The admin frames every field inside `.cfg-detail` (DETAIL_CSS, !important);
// here the bar is the frame, so the input inside it must not draw one.
// `:not(#_)` only lifts the selector above that rule's weight.
const CSS = `
.ps-bar .ps-in:not(#_){border:none!important;box-shadow:none!important;background:transparent!important;padding:6px 4px!important;font-size:16px!important}
.ps-bar{transition:box-shadow .12s}
.ps-bar:hover,.ps-bar:focus-within{box-shadow:0 1px 6px rgba(32,33,36,.18);border-color:transparent!important}
.ps-in::placeholder{color:#8A8F98}
.ps-opt[aria-selected=true]{background:${desk.soft}}
`

export function PostSearch({
  text,
  onText,
  tokens,
  nameOf,
  suggestions,
  onAdd,
  onRemove,
  onClear,
}: {
  text: string
  onText: (t: string) => void
  tokens: Token[]
  nameOf: (t: Token) => string
  suggestions: Suggestion[]
  onAdd: (t: Token) => void
  onRemove: (t: Token) => void
  onClear: () => void
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const input = useRef<HTMLInputElement>(null)
  const listId = useId()

  const { only, words } = parse(text)
  const want = fold(words.trim())
  const has = (s: Suggestion) => tokens.some((t) => t.kind === s.kind && t.id === s.id)
  const shown =
    want || only
      ? suggestions
          .filter((s) => (!only || s.kind === only) && !has(s) && fold(`${s.label} ${s.path ?? ''}`).includes(want))
          // Names that start with what was typed first, then the facet order the left column uses.
          .sort((a, b) => Number(fold(b.label).startsWith(want)) - Number(fold(a.label).startsWith(want)) || FACET_ORDER.indexOf(a.kind) - FACET_ORDER.indexOf(b.kind))
          .slice(0, MAX)
      : []
  const listOpen = open && shown.length > 0
  // With a # or @ the person is plainly picking one, so Enter takes the first.
  const current = active >= 0 ? active : only ? 0 : -1

  const pick = (s: Suggestion) => {
    onAdd({ kind: s.kind, id: s.id })
    onText('')
    setActive(-1)
    input.current?.focus()
  }

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && shown.length) {
      e.preventDefault()
      setOpen(true)
      setActive((current + 1) % shown.length)
    } else if (e.key === 'ArrowUp' && shown.length) {
      e.preventDefault()
      setActive(current <= 0 ? shown.length - 1 : current - 1)
    } else if (e.key === 'Enter' && listOpen && current >= 0) {
      e.preventDefault()
      pick(shown[current])
    } else if (e.key === 'Escape') {
      if (listOpen) setOpen(false)
      else onText('')
    } else if (e.key === 'Backspace' && !text && tokens.length) {
      onRemove(tokens[tokens.length - 1])
    }
  }

  const chip: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 5, background: desk.soft, color: ink.base, borderRadius: 14, padding: '0 0 0 10px', fontFamily: sans, fontSize: 13.5, whiteSpace: 'nowrap' }

  return (
    <div role="search" style={{ position: 'relative', maxWidth: 760, margin: '6px auto 18px' }}>
      <style>{CSS}</style>
      <div
        className="ps-bar"
        onClick={() => input.current?.focus()}
        style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, minHeight: 50, boxSizing: 'border-box', padding: '6px 10px 6px 18px', background: desk.panel, border: `1px solid ${desk.field}`, borderRadius: 25, cursor: 'text' }}
      >
        <IconSearch size={18} style={{ color: ink.soft, marginRight: 4 }} />
        {tokens.map((t) => (
          <span key={`${t.kind}:${t.id}`} style={chip}>
            <span style={{ color: ink.soft }}>{FACET_LABEL[t.kind]}</span>
            {nameOf(t)}
            <IconButton size="sm" label={`Bỏ lọc ${nameOf(t)}`} onClick={() => onRemove(t)}>
              <IconClose size={12} />
            </IconButton>
          </span>
        ))}
        <input
          ref={input}
          className="ps-in"
          type="text"
          role="combobox"
          aria-label="Lọc bài"
          aria-expanded={listOpen}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={listOpen && current >= 0 ? `${listId}-${current}` : undefined}
          placeholder={tokens.length ? 'Thêm điều kiện…' : 'Lọc bài theo tên, chủ đề, #tag, @tác giả, template, trạng thái'}
          value={text}
          onChange={(e) => {
            onText(e.target.value)
            setOpen(true)
            setActive(-1)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKey}
          style={{ flex: '1 1 200px', minWidth: 120, border: 'none', outline: 'none', background: 'transparent', fontFamily: sans, fontSize: 16, color: ink.base, padding: '6px 4px' }}
        />
        {(text || tokens.length > 0) && (
          <IconButton label="Xoá bộ lọc" onClick={onClear}>
            <IconClose />
          </IconButton>
        )}
      </div>
      {listOpen && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Gợi ý lọc"
          // Keep focus in the box while a suggestion is clicked.
          onMouseDown={(e) => e.preventDefault()}
          style={{ position: 'absolute', zIndex: 20, left: 0, right: 0, top: '100%', margin: '6px 0 0', padding: '6px 0', listStyle: 'none', background: desk.panel, border: `1px solid ${desk.line}`, borderRadius: 12, boxShadow: '0 4px 16px rgba(32,33,36,.16)' }}
        >
          {shown.map((s, i) => (
            <li
              key={`${s.kind}:${s.id}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === current}
              className="ps-opt"
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(s)}
              style={{ display: 'grid', gridTemplateColumns: '84px 12px minmax(0,1fr) auto', gap: 10, alignItems: 'center', padding: '8px 18px', cursor: 'pointer', fontFamily: sans, fontSize: 14 }}
            >
              <span style={{ color: ink.soft, fontSize: 12.5 }}>{FACET_LABEL[s.kind]}</span>
              <span aria-hidden style={{ width: 9, height: 9, borderRadius: '50%', background: s.color ?? 'transparent' }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: ink.base }}>
                {s.kind === 'kw' ? '#' : s.kind === 'author' ? '@' : ''}
                {s.label}
                {s.path && <span style={{ color: ink.soft }}> · trong {s.path}</span>}
              </span>
              <span style={{ color: ink.soft, fontSize: 12.5, fontVariantNumeric: 'tabular-nums' }}>{s.count} bài</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
