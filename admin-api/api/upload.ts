import { randomUUID } from 'node:crypto'
import { readFile, unlink } from 'node:fs/promises'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import formidable, { type File } from 'formidable'
import { withCors } from '../lib/cors.js'
import { requireAuth } from '../lib/auth.js'
import { getSupabase } from '../lib/supabase.js'

const BUCKET = 'post-images'

// Vercel's Node runtime only auto-parses application/json,
// application/x-www-form-urlencoded and text/plain bodies — multipart/form-data
// is left as a raw, unconsumed stream on `req`, which is exactly what
// formidable needs.
export const config = {
  api: { bodyParser: false },
}

function extensionFor(file: File): string {
  const fromName = file.originalFilename?.match(/\.[a-zA-Z0-9]+$/)?.[0]
  if (fromName) return fromName.toLowerCase()
  const fromMime = file.mimetype?.split('/')[1]
  return fromMime ? `.${fromMime.toLowerCase()}` : ''
}

async function parseUpload(req: VercelRequest): Promise<File | null> {
  const form = formidable({ maxFiles: 1, multiples: false })
  const [, files] = await form.parse(req)
  const fileField = files.file ?? files.image
  if (!fileField) return null
  return Array.isArray(fileField) ? (fileField[0] ?? null) : fileField
}

async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (!requireAuth(req, res)) return

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  let file: File | null
  try {
    file = await parseUpload(req)
  } catch (err) {
    res.status(400).json({ error: `Failed to parse upload: ${(err as Error).message}` })
    return
  }

  if (!file) {
    res.status(400).json({ error: "No file provided (expected multipart field 'file')" })
    return
  }

  const buffer = await readFile(file.filepath)
  const path = `${randomUUID()}${extensionFor(file)}`

  const supabase = getSupabase()
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.mimetype ?? 'application/octet-stream',
    upsert: false,
  })

  await unlink(file.filepath).catch(() => {})

  if (uploadError) {
    res.status(500).json({ error: uploadError.message })
    return
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  res.status(200).json({ url: data.publicUrl })
}

export default withCors(handler)
