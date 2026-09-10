/** Gõ tới đâu render tới đó — đo trong Chrome thật, vì jsdom không dựng contenteditable. */
import { chromium } from 'playwright'
const out = []
const note = (ok, name, detail) => { out.push(ok); console.log(`${ok ? 'XANH' : 'ĐỎ  '}  ${name}\n        ${detail}`) }
const b = await chromium.launch({ channel: 'chrome' })
const p = await b.newPage({ viewport: { width: 900, height: 800 } })
const fresh = async () => { await p.goto('http://localhost:5199/harness.html'); await p.waitForSelector('[contenteditable]'); await p.locator('[contenteditable]').click() }

await fresh()
await p.keyboard.type('# Mẻ rang #14')
await p.waitForTimeout(150)
note(await p.locator('h1').count() > 0, 'Gõ `# ` là thành tiêu đề NGAY, chưa rời ô',
  `thẻ h1: "${await p.locator('h1').first().innerText().catch(() => '')}"`)
// "#14" là chữ thật của tiêu đề; chỉ dấu thăng MỞ ĐẦU mới là ký hiệu.
const h1 = await p.locator('h1').first().innerText()
note(!h1.startsWith('#'), 'Dấu thăng mở đầu biến mất, chỉ còn chữ', `h1 = "${h1}"`)

await fresh()
await p.keyboard.type('- mục một')
await p.keyboard.press('Enter')
await p.keyboard.type('mục hai')
await p.waitForTimeout(150)
note((await p.locator('ul li').count()) === 2, 'Gõ `- ` thành danh sách, Enter ra mục kế',
  `${await p.locator('ul li').count()} mục`)

await fresh()
await p.keyboard.type('> lời trích')
await p.waitForTimeout(150)
note(await p.locator('blockquote').count() > 0, 'Gõ `> ` thành trích dẫn ngay', 'có blockquote')

await fresh()
await p.keyboard.type('có **đậm** đây')
await p.waitForTimeout(200)
const txt = await p.locator('[contenteditable]').innerText()
note(!txt.includes('*') && txt.includes('đậm'), 'Gõ `**đậm**` là chữ đậm hiện ra, dấu sao biến mất', `trên màn: "${txt}"`)

// Bôi đen suốt nhiều khối
await fresh()
await p.keyboard.type('# Tiêu đề')
await p.keyboard.press('Enter')
await p.keyboard.type('Một đoạn.')
await p.keyboard.press('Enter')
await p.keyboard.type('- mục một')
await p.keyboard.press('Enter')
await p.keyboard.type('mục hai')
await p.waitForTimeout(200)
await p.keyboard.press('Meta+a')
const picked = await p.evaluate(() => String(window.getSelection()))
note(picked.includes('Tiêu đề') && picked.includes('mục hai'),
  'Bôi đen chạy suốt qua tiêu đề, đoạn văn và cả danh sách', `chọn ${picked.length} ký tự`)

// Ghi ra vẫn là markdown
await p.locator('pre').click()
await p.waitForTimeout(250)
const md = await p.evaluate(() => window.__md)
note(typeof md === 'string' && md.includes('# Tiêu đề') && md.includes('- mục một'),
  'Rời ô thì ghi lại thành markdown, không phải HTML', JSON.stringify(md))

// Hoàn tác
await fresh()
await p.keyboard.type('chữ đầu')
await p.keyboard.press('Meta+z')
await p.waitForTimeout(200)
note(!(await p.locator('[contenteditable]').innerText()).includes('chữ đầu'),
  'Cmd+Z hoàn tác ngay trong mặt soạn', 'chữ đã lùi')

await b.close()
const bad = out.filter((x) => !x).length
console.log(`\n${out.length - bad}/${out.length} xanh`)
process.exit(bad ? 1 : 0)
