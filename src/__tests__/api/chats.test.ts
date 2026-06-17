import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()
const mockGetUser = vi.fn()

vi.mock('@/lib/supabase', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

vi.mock('@/lib/services/character-service', () => ({
  getCharacter: vi.fn(),
}))

function mockQuery(returns: any) {
  const chain: any = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    single: vi.fn(() => chain),
    order: vi.fn(() => chain),
  }

  chain.select.mockReturnValue(chain)
  chain.insert.mockReturnValue(chain)
  chain.update.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.single.mockResolvedValue(returns)
  chain.order.mockReturnValue(chain)

  return chain
}

describe('Chats API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/chats', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })

      const { GET } = await import('@/app/api/chats/route')
      const req = new Request('http://localhost:3000/api/chats?character_id=123')
      const res = await GET(req)
      const json = await res.json()

      expect(res.status).toBe(401)
      expect(json.error).toBe('Unauthorized')
    })
  })

  describe('POST /api/chats', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })

      const { POST } = await import('@/app/api/chats/route')
      const req = new Request('http://localhost:3000/api/chats', {
        method: 'POST',
        body: JSON.stringify({ character_id: '123', content: 'Hello' }),
      })
      const res = await POST(req)
      const json = await res.json()

      expect(res.status).toBe(401)
      expect(json.error).toBe('Unauthorized')
    })
  })

  describe('PATCH /api/chats', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })

      const { PATCH } = await import('@/app/api/chats/route')
      const req = new Request('http://localhost:3000/api/chats', {
        method: 'PATCH',
        body: JSON.stringify({ chat_id: '123', message: { role: 'user', content: 'Hi' } }),
      })
      const res = await PATCH(req)
      const json = await res.json()

      expect(res.status).toBe(401)
      expect(json.error).toBe('Unauthorized')
    })
  })
})
