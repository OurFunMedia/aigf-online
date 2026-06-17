import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase client
const mockFrom = vi.fn()
const mockGetUser = vi.fn()

vi.mock('@/lib/supabase', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

function mockQuery(returns: any) {
  const chain: any = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    single: vi.fn(() => chain),
    order: vi.fn(() => chain),
  }

  chain.select.mockReturnValue(chain)
  chain.insert.mockReturnValue(chain)
  chain.update.mockReturnValue(chain)
  chain.delete.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.single.mockResolvedValue(returns)
  chain.order.mockReturnValue(chain)

  return chain
}

describe('Characters API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/characters', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })

      const { GET } = await import('@/app/api/characters/route')
      const res = await GET()
      const json = await res.json()

      expect(res.status).toBe(401)
      expect(json.error).toBe('Unauthorized')
    })
  })

  describe('POST /api/characters', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })

      const { POST } = await import('@/app/api/characters/route')
      const req = new Request('http://localhost:3000/api/characters', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test' }),
      })
      const res = await POST(req)
      const json = await res.json()

      expect(res.status).toBe(401)
      expect(json.error).toBe('Unauthorized')
    })

    it('returns 400 when required fields missing', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })

      const { POST } = await import('@/app/api/characters/route')
      const req = new Request('http://localhost:3000/api/characters', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test' }),
      })
      const res = await POST(req)
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json.error).toContain('Missing required fields')
    })
  })

  describe('GET /api/characters/[id]', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })

      const { GET } = await import('@/app/api/characters/[id]/route')
      const req = new Request('http://localhost:3000/api/characters/123')
      const res = await GET(req, { params: Promise.resolve({ id: '123' }) })
      const json = await res.json()

      expect(res.status).toBe(401)
      expect(json.error).toBe('Unauthorized')
    })
  })

  describe('PUT /api/characters/[id]', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })

      const { PUT } = await import('@/app/api/characters/[id]/route')
      const req = new Request('http://localhost:3000/api/characters/123', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated' }),
      })
      const res = await PUT(req, { params: Promise.resolve({ id: '123' }) })
      const json = await res.json()

      expect(res.status).toBe(401)
      expect(json.error).toBe('Unauthorized')
    })
  })

  describe('DELETE /api/characters/[id]', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })

      const { DELETE } = await import('@/app/api/characters/[id]/route')
      const req = new Request('http://localhost:3000/api/characters/123', {
        method: 'DELETE',
      })
      const res = await DELETE(req, { params: Promise.resolve({ id: '123' }) })
      const json = await res.json()

      expect(res.status).toBe(401)
      expect(json.error).toBe('Unauthorized')
    })
  })
})
