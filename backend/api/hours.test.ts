import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { queryBuilder, mockReq, mockRes, authHeaders } from '../lib/test-helpers.js'

const fromMock = vi.fn()
vi.mock('../lib/supabase.js', () => ({
  getSupabase: () => ({ from: fromMock }),
}))

let handler: typeof import('./hours.js').default
let signToken: typeof import('../lib/auth.js').signToken

beforeEach(async () => {
  process.env.ADMIN_SESSION_SECRET = 'test-secret'
  process.env.ADMIN_ALLOWED_ORIGIN = 'https://admin.example.com'
  fromMock.mockReset()
  handler = (await import('./hours.js')).default
  signToken = (await import('../lib/auth.js')).signToken
})

afterEach(() => {
  delete process.env.ADMIN_SESSION_SECRET
  delete process.env.ADMIN_ALLOWED_ORIGIN
  vi.resetModules()
})

const row = {
  id: 'log-1',
  date: '2026-08-18',
  name: 'Cupping 6 mẫu',
  kind: 'thực hành',
  mins: 90,
  at: '06:30:00',
  done: true,
  created_at: '2026-08-18T00:00:00Z',
}

describe('GET /api/hours', () => {
  it('requires auth — the practice log is private', async () => {
    const res = mockRes()
    await handler(mockReq({ method: 'GET' }), res)
    expect(res.statusCode).toBe(401)
    expect(fromMock).not.toHaveBeenCalled()
  })

  it("returns the span's logs and both tag systems in one round trip", async () => {
    fromMock.mockReturnValueOnce(queryBuilder({ data: [row], error: null })).mockReturnValueOnce(
      queryBuilder({
        data: [
          { name: 'đọc', system: 'task' },
          { name: 'viết', system: 'task' },
          { name: 'Sao đâu', system: 'project' },
        ],
        error: null,
      }),
    )

    const res = mockRes()
    await handler(mockReq({ method: 'GET', headers: authHeaders(signToken()) }), res)

    expect(res.statusCode).toBe(200)
    // The two systems come back split, not as one list the caller must sort.
    expect(res.body.kinds).toEqual(['đọc', 'viết'])
    expect(res.body.projects).toEqual(['Sao đâu'])
    // Postgres returns HH:MM:SS; the journal only ever shows HH:MM.
    expect(res.body.logs[0].at).toBe('06:30')
  })

  it('limits the query to the requested span', async () => {
    const logs = queryBuilder({ data: [], error: null })
    fromMock.mockReturnValueOnce(logs).mockReturnValueOnce(queryBuilder({ data: [], error: null }))

    const res = mockRes()
    await handler(mockReq({ method: 'GET', query: { from: '2026-08-01' }, headers: authHeaders(signToken()) }), res)

    expect(logs.gte).toHaveBeenCalledWith('date', '2026-08-01')
    expect(res.statusCode).toBe(200)
  })
})

describe('POST /api/hours', () => {
  it('rejects a log with no kind', async () => {
    const res = mockRes()
    await handler(
      mockReq({ method: 'POST', body: { date: '2026-08-18', mins: 30, at: '09:00' }, headers: authHeaders(signToken()) }),
      res,
    )
    expect(res.statusCode).toBe(400)
  })

  it('rejects a non-positive duration', async () => {
    const res = mockRes()
    await handler(
      mockReq({
        method: 'POST',
        body: { date: '2026-08-18', kind: 'đọc', mins: 0, at: '09:00' },
        headers: authHeaders(signToken()),
      }),
      res,
    )
    expect(res.statusCode).toBe(400)
  })

  it('creates the log and hands the saved row back', async () => {
    const builder = queryBuilder({ data: row, error: null })
    fromMock.mockReturnValue(builder)

    const res = mockRes()
    await handler(
      mockReq({
        method: 'POST',
        body: { date: '2026-08-18', kind: 'thực hành', mins: 90, at: '06:30', name: 'Cupping 6 mẫu' },
        headers: authHeaders(signToken()),
      }),
      res,
    )

    expect(builder.insert).toHaveBeenCalledWith(expect.objectContaining({ mins: 90, done: true }))
    expect(res.statusCode).toBe(201)
    expect(res.body.log.id).toBe('log-1')
  })
})

describe('PATCH / DELETE /api/hours', () => {
  it('needs an id', async () => {
    const res = mockRes()
    await handler(mockReq({ method: 'PATCH', body: { mins: 45 }, headers: authHeaders(signToken()) }), res)
    expect(res.statusCode).toBe(400)
  })

  it('writes only the fields the journal may edit', async () => {
    const builder = queryBuilder({ data: row, error: null })
    fromMock.mockReturnValue(builder)

    const res = mockRes()
    await handler(
      mockReq({
        method: 'PATCH',
        query: { id: 'log-1' },
        body: { mins: 45, id: 'hacked', created_at: 'nope' },
        headers: authHeaders(signToken()),
      }),
      res,
    )

    expect(builder.update).toHaveBeenCalledWith({ mins: 45 })
    expect(res.statusCode).toBe(200)
  })

  it('404s when the log is gone', async () => {
    fromMock.mockReturnValue(queryBuilder({ data: null, error: null }))
    const res = mockRes()
    await handler(
      mockReq({ method: 'DELETE', query: { id: 'nope' }, headers: authHeaders(signToken()) }),
      res,
    )
    expect(res.statusCode).toBe(404)
  })
})

describe('POST /api/hours?resource=kinds', () => {
  it('treats an already-existing kind as success, not an error', async () => {
    fromMock
      .mockReturnValueOnce(queryBuilder({ data: [{ sort_order: 4 }], error: null }))
      // 23505 = unique violation: the caller wanted the kind to exist, and it does.
      .mockReturnValueOnce(queryBuilder({ data: null, error: { code: '23505', message: 'duplicate' } }))
      .mockReturnValueOnce(queryBuilder({ data: [{ name: 'đọc', system: 'task' }], error: null }))

    const res = mockRes()
    await handler(
      mockReq({ method: 'POST', query: { resource: 'kinds' }, body: { name: 'đọc' }, headers: authHeaders(signToken()) }),
      res,
    )

    expect(res.statusCode).toBe(200)
    expect(res.body.kinds).toEqual(['đọc'])
  })

  it('files the tag under the system it was asked for', async () => {
    const insert = queryBuilder({ data: null, error: null })
    fromMock
      .mockReturnValueOnce(queryBuilder({ data: [{ sort_order: 2 }], error: null }))
      .mockReturnValueOnce(insert)
      .mockReturnValueOnce(queryBuilder({ data: [{ name: 'Bột nở', system: 'project' }], error: null }))

    const res = mockRes()
    await handler(
      mockReq({
        method: 'POST',
        query: { resource: 'kinds' },
        body: { name: 'Bột nở', system: 'project' },
        headers: authHeaders(signToken()),
      }),
      res,
    )

    expect(insert.insert).toHaveBeenCalledWith(expect.objectContaining({ system: 'project', sort_order: 3 }))
    expect(res.body.projects).toEqual(['Bột nở'])
  })

  it('rejects an unknown system', async () => {
    const res = mockRes()
    await handler(
      mockReq({
        method: 'POST',
        query: { resource: 'kinds' },
        body: { name: 'x', system: 'linh tinh' },
        headers: authHeaders(signToken()),
      }),
      res,
    )
    expect(res.statusCode).toBe(400)
  })

  it('rejects a blank name', async () => {
    const res = mockRes()
    await handler(
      mockReq({ method: 'POST', query: { resource: 'kinds' }, body: { name: '   ' }, headers: authHeaders(signToken()) }),
      res,
    )
    expect(res.statusCode).toBe(400)
  })
})

/** The listing every kinds route answers with, as the last mocked call. */
const bothSystems = (kinds: string[], projects: string[]) =>
  queryBuilder({
    data: [
      ...kinds.map((name) => ({ name, system: 'task' })),
      ...projects.map((name) => ({ name, system: 'project' })),
    ],
    error: null,
  })

describe('PATCH /api/hours?resource=kinds — renaming a tag', () => {
  it('carries the activities over before the tag itself', async () => {
    const logs = queryBuilder({ data: null, error: null })
    const tag = queryBuilder({ data: { id: 'tag-1' }, error: null })
    fromMock
      .mockReturnValueOnce(logs)
      .mockReturnValueOnce(tag)
      .mockReturnValueOnce(bothSystems(['đọc', 'ghi chép'], []))

    const res = mockRes()
    await handler(
      mockReq({
        method: 'PATCH',
        query: { resource: 'kinds', name: 'viết', system: 'task' },
        body: { name: 'ghi chép' },
        headers: authHeaders(signToken()),
      }),
      res,
    )

    // The activities move first: a tag pointing at nothing is recoverable,
    // activities pointing at a tag that isn't there are not.
    expect(logs.update).toHaveBeenCalledWith({ kind: 'ghi chép' })
    expect(logs.eq).toHaveBeenCalledWith('kind', 'viết')
    expect(tag.update).toHaveBeenCalledWith({ name: 'ghi chép' })
    expect(res.statusCode).toBe(200)
    expect(res.body.kinds).toEqual(['đọc', 'ghi chép'])
  })

  it('writes the project column when the project system is renamed', async () => {
    const logs = queryBuilder({ data: null, error: null })
    fromMock
      .mockReturnValueOnce(logs)
      .mockReturnValueOnce(queryBuilder({ data: { id: 'tag-2' }, error: null }))
      .mockReturnValueOnce(bothSystems([], ['Cà phê']))

    const res = mockRes()
    await handler(
      mockReq({
        method: 'PATCH',
        query: { resource: 'kinds', name: 'Cà củng', system: 'project' },
        body: { name: 'Cà phê' },
        headers: authHeaders(signToken()),
      }),
      res,
    )

    expect(logs.update).toHaveBeenCalledWith({ project: 'Cà phê' })
    expect(res.body.projects).toEqual(['Cà phê'])
  })

  it('puts the activities back when the tag write fails', async () => {
    const logs = queryBuilder({ data: null, error: null })
    const rollback = queryBuilder({ data: null, error: null })
    fromMock
      .mockReturnValueOnce(logs)
      .mockReturnValueOnce(queryBuilder({ data: null, error: { message: 'nope' } }))
      .mockReturnValueOnce(rollback)

    const res = mockRes()
    await handler(
      mockReq({
        method: 'PATCH',
        query: { resource: 'kinds', name: 'viết', system: 'task' },
        body: { name: 'ghi chép' },
        headers: authHeaders(signToken()),
      }),
      res,
    )

    expect(res.statusCode).toBe(500)
    expect(rollback.update).toHaveBeenCalledWith({ kind: 'viết' })
    expect(rollback.eq).toHaveBeenCalledWith('kind', 'ghi chép')
  })

  it('is a no-op when the name has not changed', async () => {
    fromMock.mockReturnValueOnce(bothSystems(['viết'], []))

    const res = mockRes()
    await handler(
      mockReq({
        method: 'PATCH',
        query: { resource: 'kinds', name: 'viết', system: 'task' },
        body: { name: 'viết' },
        headers: authHeaders(signToken()),
      }),
      res,
    )

    expect(res.statusCode).toBe(200)
    // No update was attempted — only the listing was read.
    expect(fromMock).toHaveBeenCalledTimes(1)
  })

  it('404s on a tag that is not there', async () => {
    fromMock
      .mockReturnValueOnce(queryBuilder({ data: null, error: null }))
      .mockReturnValueOnce(queryBuilder({ data: null, error: null }))
      .mockReturnValueOnce(queryBuilder({ data: null, error: null }))

    const res = mockRes()
    await handler(
      mockReq({
        method: 'PATCH',
        query: { resource: 'kinds', name: 'không có', system: 'task' },
        body: { name: 'mới' },
        headers: authHeaders(signToken()),
      }),
      res,
    )

    expect(res.statusCode).toBe(404)
  })

  it('rejects a blank new name', async () => {
    const res = mockRes()
    await handler(
      mockReq({
        method: 'PATCH',
        query: { resource: 'kinds', name: 'viết', system: 'task' },
        body: { name: '  ' },
        headers: authHeaders(signToken()),
      }),
      res,
    )
    expect(res.statusCode).toBe(400)
    expect(fromMock).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/hours?resource=kinds — deleting a tag', () => {
  it('applies the reassignments, then sweeps the rest into the bucket', async () => {
    const move = queryBuilder({ data: null, error: null })
    const rest = queryBuilder({ data: null, error: null })
    const drop = queryBuilder({ data: null, error: null })
    fromMock
      // The read that tells undo which activities wore the tag.
      .mockReturnValueOnce(queryBuilder({ data: [{ id: 'log-1' }, { id: 'log-9' }], error: null }))
      .mockReturnValueOnce(move)
      .mockReturnValueOnce(rest)
      .mockReturnValueOnce(drop)
      .mockReturnValueOnce(bothSystems(['đọc'], []))

    const res = mockRes()
    await handler(
      mockReq({
        method: 'DELETE',
        query: { resource: 'kinds', name: 'work', system: 'task' },
        body: { moves: [{ to: 'đọc', ids: ['log-1', 'log-2'] }] },
        headers: authHeaders(signToken()),
      }),
      res,
    )

    expect(move.update).toHaveBeenCalledWith({ kind: 'đọc' })
    expect(move.in).toHaveBeenCalledWith('id', ['log-1', 'log-2'])
    // Anything still wearing the tag is unclassified, not deleted.
    expect(rest.update).toHaveBeenCalledWith({ kind: 'khác' })
    expect(rest.eq).toHaveBeenCalledWith('kind', 'work')
    expect(drop.delete).toHaveBeenCalled()
    expect(res.statusCode).toBe(200)
    // Including the one outside the span the screen draws.
    expect(res.body.affected).toEqual(['log-1', 'log-9'])
  })

  it('lets a project fall to no project at all when that is what was asked', async () => {
    const rest = queryBuilder({ data: null, error: null })
    fromMock
      .mockReturnValueOnce(queryBuilder({ data: [], error: null }))
      .mockReturnValueOnce(rest)
      .mockReturnValueOnce(queryBuilder({ data: null, error: null }))
      .mockReturnValueOnce(bothSystems([], []))

    const res = mockRes()
    await handler(
      mockReq({
        method: 'DELETE',
        query: { resource: 'kinds', name: 'Sao đâu', system: 'project' },
        body: { rest: null },
        headers: authHeaders(signToken()),
      }),
      res,
    )

    expect(rest.update).toHaveBeenCalledWith({ project: null })
    expect(res.statusCode).toBe(200)
  })

  it('keeps a task out of NOT NULL even when null was asked for', async () => {
    const rest = queryBuilder({ data: null, error: null })
    fromMock
      .mockReturnValueOnce(queryBuilder({ data: [], error: null }))
      .mockReturnValueOnce(rest)
      .mockReturnValueOnce(queryBuilder({ data: null, error: null }))
      .mockReturnValueOnce(bothSystems([], []))

    const res = mockRes()
    await handler(
      mockReq({
        method: 'DELETE',
        query: { resource: 'kinds', name: 'work', system: 'task' },
        body: { rest: null },
        headers: authHeaders(signToken()),
      }),
      res,
    )

    expect(rest.update).toHaveBeenCalledWith({ kind: 'khác' })
  })

  it('rejects a malformed moves list before touching anything', async () => {
    const res = mockRes()
    await handler(
      mockReq({
        method: 'DELETE',
        query: { resource: 'kinds', name: 'work', system: 'task' },
        body: { moves: [{ to: 'đọc', ids: 'log-1' }] },
        headers: authHeaders(signToken()),
      }),
      res,
    )
    expect(res.statusCode).toBe(400)
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('requires a name', async () => {
    const res = mockRes()
    await handler(
      mockReq({ method: 'DELETE', query: { resource: 'kinds' }, headers: authHeaders(signToken()) }),
      res,
    )
    expect(res.statusCode).toBe(400)
  })
})

describe('PATCH /api/hours?resource=assign — moving activities in bulk', () => {
  it('applies every move and reports how many rows it touched', async () => {
    const first = queryBuilder({ data: null, error: null })
    const second = queryBuilder({ data: null, error: null })
    fromMock.mockReturnValueOnce(first).mockReturnValueOnce(second)

    const res = mockRes()
    await handler(
      mockReq({
        method: 'PATCH',
        query: { resource: 'assign' },
        body: {
          system: 'task',
          moves: [
            { to: 'work', ids: ['a', 'b'] },
            { to: 'đọc', ids: ['c'] },
          ],
        },
        headers: authHeaders(signToken()),
      }),
      res,
    )

    expect(first.update).toHaveBeenCalledWith({ kind: 'work' })
    expect(second.update).toHaveBeenCalledWith({ kind: 'đọc' })
    expect(res.body).toEqual({ moved: 3 })
  })

  it('requires auth like everything else on this route', async () => {
    const res = mockRes()
    await handler(mockReq({ method: 'PATCH', query: { resource: 'assign' } }), res)
    expect(res.statusCode).toBe(401)
    expect(fromMock).not.toHaveBeenCalled()
  })
})
