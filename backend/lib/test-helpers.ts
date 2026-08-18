// Shared helpers for handler unit tests. Not a *.test.ts file itself, so
// vitest's `include: ['api/**/*.test.ts', 'lib/**/*.test.ts']` never picks it
// up as a suite on its own.
import { vi } from 'vitest'

/**
 * A stand-in for a Supabase PostgrestFilterBuilder chain. Every chain method
 * (select/eq/gte/order/insert/upsert/update/delete/limit/maybeSingle/single)
 * returns itself,
 * and the object is thenable so `await builder.foo().bar()` resolves with
 * `result` regardless of how many links are in the chain — good enough for
 * handler tests that only care about the final `{ data, error, count }`.
 */
export function queryBuilder(result: { data?: unknown; error?: unknown; count?: number | null }) {
  const builder: any = {}
  for (const method of ['select', 'eq', 'gte', 'order', 'insert', 'upsert', 'update', 'delete', 'limit', 'maybeSingle', 'single']) {
    builder[method] = vi.fn(() => builder)
  }
  builder.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject)
  return builder
}

export function mockReq(overrides: Partial<{ method: string; body: unknown; query: Record<string, unknown>; headers: Record<string, string> }> = {}) {
  return {
    method: 'GET',
    body: {},
    query: {},
    headers: {},
    ...overrides,
  } as any
}

export function mockRes() {
  const res: any = {
    statusCode: undefined as number | undefined,
    body: undefined as unknown,
    ended: false,
    headers: {} as Record<string, string>,
    setHeader(key: string, value: string) {
      res.headers[key] = value
    },
    status(code: number) {
      res.statusCode = code
      return res
    },
    json(body: unknown) {
      res.body = body
      return res
    },
    end() {
      res.ended = true
      return res
    },
  }
  return res
}

export function authHeaders(token: string) {
  return { authorization: `Bearer ${token}` }
}
