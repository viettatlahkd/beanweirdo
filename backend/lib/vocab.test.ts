import { describe, expect, it, vi } from 'vitest'
import { queryBuilder, mockReq, mockRes } from './test-helpers.js'
import { handleNodes, nodeColumns } from './vocab.js'

describe('nodeColumns', () => {
  it('checks status and blocks, and turns an empty optional field into null', () => {
    expect(nodeColumns({ status: 'archived' }, 'blog')).toEqual({ status: 'archived' })
    expect(nodeColumns({ status: 'private' }, 'blog')).toBeTypeOf('string')
    expect(nodeColumns({ blocks: {} }, 'port')).toBeTypeOf('string')
    expect(nodeColumns({ look: '', parent_id: '' }, 'port')).toEqual({ look: null, parent_id: null })
  })

  it('keeps root words and the sites’ own prefixes away from port pages only', () => {
    // A port page's old address is /<slug>, and a bean page's is /bean/<slug>; these belong to other pages.
    for (const slug of ['about', 'portfolio', 'post', 'muc-luc', 'practice', 'ad-post', 'biz', 'bean', 'personal-blog', 'details']) {
      expect(nodeColumns({ slug }, 'port'), slug).toBeTypeOf('string')
      expect(nodeColumns({ slug }, 'blog'), slug).toEqual({ slug })
    }
    expect(nodeColumns({ slug: 'roasting' }, 'port')).toEqual({ slug: 'roasting' })
  })
})

describe('POST nodes', () => {
  it('takes the slug as id, or prefixes the site when another site has it', async () => {
    const insert = queryBuilder({ data: { id: 'port-ca-phe' }, error: null })
    const from = vi
      .fn()
      .mockReturnValueOnce(queryBuilder({ data: [{ sort_order: 2 }], error: null }))
      .mockReturnValueOnce(queryBuilder({ data: null, error: null, count: 1 }))
      .mockReturnValueOnce(insert)
    const res = mockRes()
    await handleNodes(mockReq({ method: 'POST', body: { site: 'port', title: 'Cà phê' } }), res, { from } as never)
    expect(res.statusCode).toBe(201)
    expect(insert.insert).toHaveBeenCalledWith(expect.objectContaining({ id: 'port-ca-phe', slug: 'ca-phe', site: 'port', sort_order: 3 }))
  })

  it('needs a known site', async () => {
    const res = mockRes()
    await handleNodes(mockReq({ method: 'POST', body: { site: 'shop', title: 'x' } }), res, { from: vi.fn() } as never)
    expect(res.statusCode).toBe(400)
  })
})
