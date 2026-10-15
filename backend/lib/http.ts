import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { ApiErrorBody, ApiErrorCode } from 'api-contract'

const STATUS: Record<ApiErrorCode, number> = {
  unauthorized: 401,
  not_found: 404,
  method_not_allowed: 405,
  invalid: 400,
  conflict: 409,
  server: 500,
}

/** Answer with the contract's error shape; the status follows from `code`. */
export function fail(
  res: VercelResponse,
  code: ApiErrorCode,
  error: string,
  extra: Pick<ApiErrorBody, 'field' | 'details'> = {},
): void {
  const body: ApiErrorBody = { error, code, ...extra }
  res.status(STATUS[code]).json(body)
}

/** A Postgres or PostgREST error, as the contract's `server` error. */
export function failDb(res: VercelResponse, error: unknown): void {
  fail(res, 'server', (error as { message?: string } | null)?.message ?? 'database error')
}

/** `:id` from a dynamic route segment — Vercel puts it in the query. */
export function pathId(req: VercelRequest): string | null {
  const raw = req.query.id
  const id = Array.isArray(raw) ? raw[0] : raw
  return typeof id === 'string' && id.length > 0 ? id : null
}

/** The request body as a plain object, or null when it is anything else. */
export function bodyObject(req: VercelRequest): Record<string, unknown> | null {
  const body = req.body ?? {}
  return typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : null
}
