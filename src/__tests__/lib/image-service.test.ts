import { describe, it, expect, vi, beforeEach } from 'vitest'

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
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
  }
  chain.select.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.order.mockResolvedValue(returns)
  return chain
}

describe('getImages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns images for a user', async () => {
    const fakeImages = [
      { id: '1', storage_url: 'https://img.test/1.png', prompt: 'a girl in cafe', user_id: 'u1' },
      { id: '2', storage_url: 'https://img.test/2.png', prompt: 'a girl in park', user_id: 'u1' },
    ]
    mockFrom.mockReturnValue(mockQuery({ data: fakeImages, error: null }))

    const { getImages } = await import('@/lib/services/image-service')
    const result = await getImages('u1')

    expect(result).toEqual(fakeImages)
    expect(mockFrom).toHaveBeenCalledWith('images')
  })

  it('returns empty array when no images', async () => {
    mockFrom.mockReturnValue(mockQuery({ data: [], error: null }))

    const { getImages } = await import('@/lib/services/image-service')
    const result = await getImages('u1')

    expect(result).toEqual([])
  })

  it('throws on query error', async () => {
    mockFrom.mockReturnValue(mockQuery({ data: null, error: new Error('DB error') }))

    const { getImages } = await import('@/lib/services/image-service')
    await expect(getImages('u1')).rejects.toThrow('DB error')
  })
})
