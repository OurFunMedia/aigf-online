import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @supabase/ssr
const mockGetUser = vi.fn()
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
  }),
}))

describe('Auth Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  function createRequest(urlStr: string) {
    const url = new URL(urlStr, 'http://localhost:3000')
    return {
      nextUrl: Object.assign(url, {
        clone: () => {
          const cloned = new URL(url.href)
          return Object.assign(cloned, {
            clone: () => cloned,
          })
        },
      }),
      cookies: {
        getAll: () => [],
        set: vi.fn(),
      },
    }
  }

  it('redirects to /login when accessing /chat without auth', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const { middleware: mw } = await import('@/middleware')
    const req = createRequest('http://localhost:3000/chat')
    const res = await mw(req as any)

    expect(res?.status).toBe(307)
    expect(res?.headers.get('location')).toContain('/login')
  })

  it('redirects to /login when accessing /gallery without auth', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const { middleware: mw } = await import('@/middleware')
    const req = createRequest('http://localhost:3000/gallery')
    const res = await mw(req as any)

    expect(res?.status).toBe(307)
    expect(res?.headers.get('location')).toContain('/login')
  })

  it('allows access to /chat when authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })

    const { middleware: mw } = await import('@/middleware')
    const req = createRequest('http://localhost:3000/chat')
    const res = await mw(req as any)

    // 200 means no redirect (NextResponse.next)
    expect(res?.status).toBe(200)
  })

  it('allows access to root / when authenticated (character selection)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })

    const { middleware: mw } = await import('@/middleware')
    const req = createRequest('http://localhost:3000/')
    const res = await mw(req as any)

    expect(res?.status).toBe(200)
  })

  it('allows access to root / when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const { middleware: mw } = await import('@/middleware')
    const req = createRequest('http://localhost:3000/')
    const res = await mw(req as any)

    expect(res?.status).toBe(200)
  })

  it('redirects /login to / when authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })

    const { middleware: mw } = await import('@/middleware')
    const req = createRequest('http://localhost:3000/login')
    const res = await mw(req as any)

    expect(res?.status).toBe(307)
    expect(res?.headers.get('location')).toContain('/')
  })
})
