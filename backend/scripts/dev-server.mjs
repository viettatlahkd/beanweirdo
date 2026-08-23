/**
 * Local stand-in for Vercel's serverless runtime.
 *
 * The API is a folder of Vercel handlers, which in production Vercel itself
 * routes to and runs. Locally there is no such runtime, so admin login — and
 * with it every admin screen — cannot be exercised at all. This serves the
 * same handler files over plain HTTP: same code, same CORS wrapper, same env,
 * so what passes here is what ships.
 *
 * Vite loads the TypeScript, so this needs no compiler and no new dependency.
 *
 *   node backend/scripts/dev-server.mjs
 */
import { createServer as createHttpServer } from 'node:http'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer as createViteServer } from 'vite'

const BACKEND = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const API = join(BACKEND, 'api')

/**
 * `--port 3099`, else PORT, else 3001. Worth passing explicitly: several
 * worktrees may be running this at once, and whoever binds 3001 first would
 * otherwise answer everyone else's requests with their own CORS origin.
 */
const portArg = process.argv.indexOf('--port')
const PORT = Number(portArg > -1 ? process.argv[portArg + 1] : (process.env.PORT ?? 3001))

/** Reads .env.local the way Vercel injects project env vars. */
function loadEnv() {
  const file = join(BACKEND, '.env.local')
  if (!existsSync(file)) {
    console.error(`Thiếu ${file} — sao chép từ worktree chính rồi chạy lại.`)
    process.exit(1)
  }
  // The file wins over anything inherited. A dev server that silently used a
  // stale ADMIN_ALLOWED_ORIGIN from the parent shell would reject the very
  // browser it was started for, and the failure looks like a bad password.
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
    if (m) process.env[m[1]] = m[2]
  }
}

/**
 * Maps a request path onto a handler file, filling `query` from any `[param]`
 * segment — the one piece of routing Vercel does for us in production.
 */
function routeTo(pathname) {
  const parts = pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean)
  const query = {}
  let dir = API

  for (let i = 0; i < parts.length; i++) {
    const literal = join(dir, parts[i])
    const isLast = i === parts.length - 1

    if (isLast && existsSync(`${literal}.ts`)) return { file: `${literal}.ts`, query }
    if (existsSync(literal)) { dir = literal; continue }

    // no literal match — try the folder's [param] segment
    const dynamic = join(dir, '[id]')
    if (existsSync(dynamic)) {
      query.id = decodeURIComponent(parts[i])
      dir = dynamic
      if (isLast && existsSync(join(dir, 'index.ts'))) return { file: join(dir, 'index.ts'), query }
      continue
    }
    return null
  }
  const index = join(dir, 'index.ts')
  return existsSync(index) ? { file: index, query } : null
}

/** Adds the `.status().json()` sugar Vercel's response object carries. */
function decorate(res) {
  res.status = (code) => { res.statusCode = code; return res }
  res.json = (payload) => {
    if (!res.headersSent) res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(payload))
    return res
  }
  res.send = (payload) => { res.end(payload); return res }
  return res
}

function readBody(req) {
  return new Promise((done) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => {
      const raw = Buffer.concat(chunks)
      if (raw.length === 0) return done(undefined)
      const type = req.headers['content-type'] ?? ''
      if (type.includes('application/json')) {
        try { return done(JSON.parse(raw.toString('utf8'))) } catch { return done(undefined) }
      }
      done(raw)
    })
  })
}

loadEnv()

const vite = await createViteServer({
  root: BACKEND,
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'warn',
})

const server = createHttpServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  const match = routeTo(url.pathname)

  if (!match) {
    decorate(res).status(404).json({ error: `No handler for ${url.pathname}` })
    return
  }

  try {
    const mod = await vite.ssrLoadModule(match.file)
    req.query = { ...Object.fromEntries(url.searchParams), ...match.query }
    // A route that opts out of body parsing wants the raw stream — draining it
    // here would leave the handler waiting on data that has already gone by.
    // Vercel honours the same `config.api.bodyParser` flag; without this the
    // multipart upload route hangs locally but works in production.
    if (mod.config?.api?.bodyParser !== false) req.body = await readBody(req)
    await mod.default(req, decorate(res))
    if (!res.writableEnded) res.end()
  } catch (err) {
    vite.ssrFixStacktrace(err)
    console.error(`✗ ${req.method} ${url.pathname}\n`, err)
    if (!res.headersSent) decorate(res).status(500).json({ error: String(err?.message ?? err) })
  }
})

server.listen(PORT, () => {
  console.log(`admin-api  → http://localhost:${PORT}`)
  console.log(`env        ← ${join(BACKEND, '.env.local')}`)
  console.log(`origin cho phép: ${process.env.ADMIN_ALLOWED_ORIGIN}`)
})
