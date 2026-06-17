import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: vi.fn() }),
  useParams: () => ({ id: 'char-1' }),
  usePathname: () => '/chat/char-1',
}))

// Mock AppLayout to avoid Sidebar/Navbar dependency chain
vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-layout">{children}</div>
  ),
}))

// Mock supabase client to prevent env var requirement
vi.mock('@/lib/supabase-client', () => ({
  createBrowserSupabaseClient: () => ({
    channel: () => ({
      on: () => ({ subscribe: () => ({ unsubscribe: vi.fn() }) }),
    }),
    removeChannel: vi.fn(),
  }),
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
    Trash2: MockIcon,
  }
})

const mockFetch = vi.fn()
global.fetch = mockFetch

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ChatPage', () => {
  it('renders character name and empty chat state', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url === '/api/characters') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve([
              {
                id: 'char-1',
                name: '小美',
                avatar_url: null,
                personality_prompt: '溫柔體貼',
                visual_template: 'asian girl',
                relation_points: 42,
                user_id: 'user-1',
                created_at: '2026-01-01T00:00:00.000Z',
              },
            ]),
        })
      }
      if (url === '/api/chats?character_id=char-1') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(null),
        })
      }
      return Promise.reject(new Error('unknown url'))
    })

    const { default: ChatPage } = await import('@/app/chat/[id]/page')
    render(<ChatPage />)

    await waitFor(() => {
      expect(screen.getByText('小美')).toBeDefined()
    })
    expect(screen.getByText(/開始與/)).toBeDefined()
  })

  it('displays existing messages', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url === '/api/characters') {
        return Promise.resolve({
          ok: true,
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
      }
      if (url === '/api/chats?character_id=char-1') {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              id: 'chat-1',
              messages: [
                { role: 'user', content: '你好', timestamp: '2026-01-01T00:00:00.000Z' },
                {
                  role: 'assistant',
                  content: '嗨～今天過得好嗎？',
                  timestamp: '2026-01-01T00:00:00.000Z',
                },
              ],
            }),
        })
      }
      return Promise.reject(new Error('unknown url'))
    })

    const { default: ChatPage } = await import('@/app/chat/[id]/page')
    render(<ChatPage />)

    await waitFor(() => {
      expect(screen.getByText('你好')).toBeDefined()
    })
    expect(screen.getByText('嗨～今天過得好嗎？')).toBeDefined()
  })

  it('redirects to / if character not found', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url === '/api/characters') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        })
      }
      if (url === '/api/chats?character_id=char-1') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(null),
        })
      }
      return Promise.reject(new Error('unknown url'))
    })

    const { default: ChatPage } = await import('@/app/chat/[id]/page')
    render(<ChatPage />)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })

  it('renders input and send button', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url === '/api/characters') {
        return Promise.resolve({
          ok: true,
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
      }
      if (url === '/api/chats?character_id=char-1') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(null),
        })
      }
      return Promise.reject(new Error('unknown url'))
    })

    const { default: ChatPage } = await import('@/app/chat/[id]/page')
    render(<ChatPage />)

    await waitFor(() => {
      expect(screen.getByText('小美')).toBeDefined()
    })

    // Verify input and send button exist
    expect(screen.getByPlaceholderText('對 小美 說些什麼...')).toBeDefined()
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThanOrEqual(2) // back, gallery, send
  })
})
