import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockPush = vi.fn()

// Mock next/navigation completely
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: vi.fn() }),
  useParams: () => ({}),
  usePathname: () => '/',
}))

// Mock AppLayout to avoid Sidebar/Navbar dependency chain
vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-layout">{children}</div>
  ),
}))

// Mock the new create dialog (tested separately)
vi.mock('@/components/character/CreateCharacterDialog', () => ({
  CreateCharacterDialog: ({ open, onOpenChange }: any) => (
    open ? <div data-testid="create-dialog">Dialog</div> : null
  ),
}))

// Mock lucide-react with all exports
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
    XIcon: MockIcon,
    Pencil: MockIcon,
    Upload: MockIcon,
    X: MockIcon,
    ChevronDown: MockIcon,
    ChevronRight: MockIcon,
  }
})

const mockFetch = vi.fn()
global.fetch = mockFetch

beforeEach(() => {
  vi.clearAllMocks()
})

describe('HomePage (character selection)', () => {
  it('renders title initially', async () => {
    mockFetch.mockImplementation(() => new Promise(() => {}))

    const { default: HomePage } = await import('@/app/page')
    render(<HomePage />)

    expect(screen.getByText('你的 AI 伴侶')).toBeDefined()
  })

  it('renders characters when loaded', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve([
          {
            id: 'char-1',
            name: '小美',
            avatar_url: null,
            personality_prompt: '溫柔體貼的台灣女孩',
            visual_template: 'asian girl',
            relation_points: 42,
            user_id: 'user-1',
            created_at: '2026-01-01T00:00:00.000Z',
          },
          {
            id: 'char-2',
            name: '小艾',
            avatar_url: null,
            personality_prompt: '活潑開朗的運動系女孩',
            visual_template: 'sporty girl',
            relation_points: 10,
            user_id: 'user-1',
            created_at: '2026-01-02T00:00:00.000Z',
          },
        ]),
    })

    const { default: HomePage } = await import('@/app/page')
    render(<HomePage />)

    await waitFor(() => {
      expect(screen.getByText('小美')).toBeDefined()
    })
    expect(screen.getByText('小艾')).toBeDefined()
  })

  it('shows empty state when no characters', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve([]),
    })

    const { default: HomePage } = await import('@/app/page')
    render(<HomePage />)

    await waitFor(() => {
      expect(screen.getByText('還沒有角色')).toBeDefined()
    })
  })

  it('shows error state on fetch failure', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    })

    const { default: HomePage } = await import('@/app/page')
    render(<HomePage />)

    await waitFor(() => {
      expect(screen.getByText(/載入失敗/)).toBeDefined()
    })
  })

  it('redirects to login on 401', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
    })

    const { default: HomePage } = await import('@/app/page')
    render(<HomePage />)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })

  it('navigates to chat on character click', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve([
          {
            id: 'char-1',
            name: '小美',
            avatar_url: null,
            personality_prompt: '溫柔',
            visual_template: 'asian girl',
            relation_points: 42,
            user_id: 'user-1',
            created_at: '2026-01-01T00:00:00.000Z',
          },
        ]),
    })

    const { default: HomePage } = await import('@/app/page')
    render(<HomePage />)

    await waitFor(() => {
      expect(screen.getByText('小美')).toBeDefined()
    })

    await userEvent.click(screen.getByText('小美'))
    expect(mockPush).toHaveBeenCalledWith('/chat/char-1')
  })
})
