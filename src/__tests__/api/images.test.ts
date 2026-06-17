import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockStorageRemove = vi.fn().mockResolvedValue({ error: null })

vi.mock('@/lib/supabase', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: vi.fn(() => ({
    storage: {
      from: vi.fn(() => ({
        remove: mockStorageRemove,
      })),
    },
  })),
}))

function mockQuery(returns: any) {
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    single: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    then: (resolve: (v: any) => void) => Promise.resolve(returns).then(resolve),
  }
  chain.select.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.order.mockReturnValue(chain)
  chain.single.mockReturnValue(chain)
  chain.delete.mockReturnValue(chain)
  return chain
}

describe('Images API — GET /api/images', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const { GET } = await import('@/app/api/images/route')
    const req = new Request('http://localhost/api/images')
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toBe('Unauthorized')
  })

  it('returns images when authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const fakeImages = [
      { id: '1', storage_url: 'https://img.test/1.png', prompt: 'test', user_id: 'user-1' },
    ]
    mockFrom.mockReturnValue(mockQuery({ data: fakeImages, error: null }))

    const { GET } = await import('@/app/api/images/route')
    const req = new Request('http://localhost/api/images?sort=desc')
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual(fakeImages)
  })

  it('returns 500 on service error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockFrom.mockReturnValue(mockQuery({ data: null, error: new Error('DB error') }))

    const { GET } = await import('@/app/api/images/route')
    const req = new Request('http://localhost/api/images')
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json.error).toContain('DB error')
  })
})

describe('Images API — DELETE /api/images (clear all)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const { DELETE } = await import('@/app/api/images/route')
    const req = new Request('http://localhost/api/images', { method: 'DELETE' })
    const res = await DELETE(req)
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toBe('Unauthorized')
  })

  it('clears all images when authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockFrom.mockReturnValue(mockQuery({ data: [], error: null }))

    const { DELETE } = await import('@/app/api/images/route')
    const req = new Request('http://localhost/api/images', { method: 'DELETE' })
    const res = await DELETE(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
  })
})

describe('Images API — DELETE /api/images/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const { DELETE } = await import('@/app/api/images/[id]/route')
    const res = await DELETE(new Request('http://localhost/api/images/1'), {
      params: Promise.resolve({ id: '1' }),
    })
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toBe('Unauthorized')
  })

  it('deletes single image when authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockFrom.mockReturnValue(mockQuery({
      data: { storage_url: 'https://biqkkoulyycsnfjmjmkz.supabase.co/storage/v1/object/public/companion-photos/user-1/char-1/123.png' },
      error: null,
    }))

    const { DELETE } = await import('@/app/api/images/[id]/route')
    const res = await DELETE(new Request('http://localhost/api/images/1'), {
      params: Promise.resolve({ id: '1' }),
    })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
  })
})
