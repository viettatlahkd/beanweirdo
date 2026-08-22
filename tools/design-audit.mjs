/**
 * Compares the design export against the code, from files that are both in
 * this repository.
 *
 * The previous comparison could not be re-run: it read the design from a
 * scratch directory belonging to a session that has since ended, and that copy
 * turned out to be an older export than the one committed here — 14 screens
 * against 16, so two screens were reported as having no design at all.
 *
 *   node tools/design-audit.mjs            # summary
 *   node tools/design-audit.mjs --screens  # what each side defines
 *   node tools/design-audit.mjs --props    # CSS values in design, absent in code
 *
 * Every number it prints can be recomputed by running it again.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DESIGN = join(ROOT, 'frontend/design/prototype/Coffee Study Blog v4.dc.html')

const design = readFileSync(DESIGN, 'utf8')

/** Screens the design defines, in the order it defines them. */
export function designScreens() {
  return [...design.matchAll(/sc-if value="\{\{ (is[A-Za-z]+) \}\}"/g)]
    .map((m) => m[1])
    .filter((v, i, a) => a.indexOf(v) === i)
}

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    if (e === 'node_modules' || e.startsWith('.')) continue
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.tsx?$/.test(e) && !/\.test\./.test(e)) out.push(p)
  }
  return out
}

const codeFiles = [
  ...walk(join(ROOT, 'frontend/src')),
  ...walk(join(ROOT, 'packages/post-renderer/src')),
]
const code = codeFiles.map((f) => readFileSync(f, 'utf8')).join('\n')

/**
 * Every CSS declaration the design writes literally. Template holes like
 * `{{ m.accent }}` are skipped — there is no literal to compare.
 */
export function designDeclarations() {
  const seen = new Map()
  for (const m of design.matchAll(/style="([^"]*)"/g)) {
    for (const decl of m[1].split(';')) {
      const [rawProp, ...rest] = decl.split(':')
      const prop = rawProp?.trim()
      const value = rest.join(':').trim()
      if (!prop || !value || value.includes('{{')) continue
      const key = `${prop}: ${value}`
      seen.set(key, (seen.get(key) ?? 0) + 1)
    }
  }
  return seen
}

/** Loose: does this literal appear anywhere in the code at all? */
function codeMentions(value) {
  if (code.includes(value)) return true
  const noSpace = value.replace(/\s+/g, '')
  if (code.replace(/\s+/g, '').includes(noSpace)) return true
  const px = /^-?[\d.]+px$/.test(value) && value.slice(0, -2)
  return px !== false && new RegExp(`\\b${px.replace('.', '\\.')}\\b`).test(code)
}

const screens = designScreens()
const decls = designDeclarations()
const missing = [...decls.keys()].filter((k) => !codeMentions(k.split(': ').slice(1).join(': ')))

if (process.argv.includes('--screens')) {
  console.log('Màn hình design định nghĩa:', screens.length)
  for (const s of screens) console.log('  ' + s)
} else if (process.argv.includes('--props')) {
  console.log(`Giá trị design viết ra mà không thấy trong code: ${missing.length}`)
  for (const k of missing) console.log('  ' + k)
} else {
  console.log(`design      : ${DESIGN.slice(ROOT.length + 1)}`)
  console.log(`              ${design.split('\n').length} dòng, ${design.length} ký tự`)
  console.log(`code        : ${codeFiles.length} file .ts/.tsx (bỏ test)`)
  console.log(`màn hình    : ${screens.length}`)
  console.log(`khai báo CSS: ${decls.size} giá trị literal khác nhau`)
  console.log(`  khớp chuỗi: ${decls.size - missing.length}  ← MÁY đối chiếu, chưa ai soi tay`)
  console.log(`  không thấy: ${missing.length}  ← cần người xem, không phải lệch đã xác nhận`)
  console.log('')
  console.log('"khớp chuỗi" chỉ nghĩa là chuỗi đó có mặt đâu đó trong code —')
  console.log('không chứng minh nó được dùng đúng chỗ. Đây là sàng lọc, không phải kết luận.')
}
