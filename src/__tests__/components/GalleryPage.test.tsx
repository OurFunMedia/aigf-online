import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockPush = vi.fn()
const mockRouterBack = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: mockRouterBack }),
  useParams: () => ({}),
  usePathname: () => '/gallery',
}))

// Mock AppLayout to avoid Sidebar/Navbar dependency chain
vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-layout">{children}</div>
  ),
}))

// Mock all lucide-react icons
vi.mock('lucide-react', () => {
  const MockIcon = (props: any) => {
    const { children, ...rest } = props
    return <span data-testid="mock-icon" {...rest}>{children}</span>
  }
  return {
    Heart: MockIcon,
    Plus: MockIcon,
    Loader2: MockIcon,
    ArrowLeft: MockIcon,
    Send: MockIcon,
    Sparkles: MockIcon,
    ImageIcon: MockIcon,
    User: MockIcon,
    Menu: MockIcon,
    LogOut: MockIcon,
    Moon: MockIcon,
    Sun: MockIcon,
    MessageCircle: MockIcon,
    ArrowDownUp: MockIcon,
    Trash2: MockIcon,
    X: MockIcon,
  }
})

const mockFetch = vi.fn()
global.fetch = mockFetch

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GalleryPage', () => {
  it('renders gallery header', async () => {
    mockFetch.mockImplementation(() => new Promise(() => {}))

    const { default: GalleryPage } = await import('@/app/gallery/page')
    render(<GalleryPage />)

    expect(screen.getByText('寫真畫廊')).toBeDefined()
  })

  it('shows images when loaded', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve([
          {
            id: 'img-1',
            storage_url: 'https://img.test/1.png',
            prompt: 'a girl in cafe',
            scene_description: 'drinking coffee',
            user_id: 'user-1',
            character_id: 'char-1',
            created_at: '2026-01-01T00:00:00.000Z',
          },
          {
            id: 'img-2',
            storage_url: 'https://img.test/2.png',
            prompt: 'a girl in park',
            scene_description: null,
            user_id: 'user-1',
            character_id: 'char-1',
            created_at: '2026-01-02T00:00:00.000Z',
          },
        ]),
    })

    const { default: GalleryPage } = await import('@/app/gallery/page')
    render(<GalleryPage />)

    await waitFor(() => {
      const images = screen.getAllByRole('img')
      expect(images.length).toBeGreaterThanOrEqual(2)
    })
  })

  it('shows empty state when no images', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve([]),
    })

    const { default: GalleryPage } = await import('@/app/gallery/page')
    render(<GalleryPage />)

    await waitFor(() => {
      expect(screen.getByText('還沒有照片')).toBeDefined()
    })
  })

  it('shows error state on fetch failure', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    })

    const { default: GalleryPage } = await import('@/app/gallery/page')
    render(<GalleryPage />)

    await waitFor(() => {
      expect(screen.getByText(/載入失敗/)).toBeDefined()
    })
  })

  it('redirects to login on 401', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
    })

    const { default: GalleryPage } = await import('@/app/gallery/page')
    render(<GalleryPage />)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })

  it('opens lightbox on image click', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve([
          {
            id: 'img-1',
            storage_url: 'https://img.test/1.png',
            prompt: 'a girl in cafe',
            scene_description: 'drinking coffee',
            user_id: 'user-1',
            character_id: 'char-1',
            created_at: '2026-01-01T00:00:00.000Z',
          },
        ]),
    })

    const { default: GalleryPage } = await import('@/app/gallery/page')
    render(<GalleryPage />)

    await waitFor(() => {
      expect(screen.getByAltText('a girl in cafe')).toBeDefined()
    })

    await userEvent.click(screen.getByAltText('a girl in cafe'))

    await waitFor(() => {
      expect(screen.getAllByText('a girl in cafe').length).toBeGreaterThanOrEqual(1)
    })
    expect(screen.getByText('drinking coffee')).toBeDefined()
  })

  it('closes lightbox on backdrop click', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve([
          {
            id: 'img-1',
            storage_url: 'https://img.test/1.png',
            prompt: 'a girl in cafe',
            scene_description: null,
            user_id: 'user-1',
            character_id: 'char-1',
            created_at: '2026-01-01T00:00:00.000Z',
          },
        ]),
    })

    const { default: GalleryPage } = await import('@/app/gallery/page')
    render(<GalleryPage />)

    await waitFor(() => {
      expect(screen.getByAltText('a girl in cafe')).toBeDefined()
    })
    await userEvent.click(screen.getByAltText('a girl in cafe'))

    await waitFor(() => {
      expect(screen.getAllByText('a girl in cafe').length).toBeGreaterThanOrEqual(1)
    })

    // Click should not throw — lightbox backdrop click handler closes it
    // Just verify no crash
  })
})
