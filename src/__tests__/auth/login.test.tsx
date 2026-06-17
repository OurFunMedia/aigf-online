import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// Mock Supabase client
const mockSignInWithOAuth = vi.fn()
vi.mock('@/lib/supabase-client', () => ({
  createBrowserSupabaseClient: () => ({
    auth: {
      signInWithOAuth: mockSignInWithOAuth,
    },
  }),
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders Google sign-in button', async () => {
    const { default: LoginPage } = await import('@/app/login/page')
    render(<LoginPage />)
    expect(screen.getByText('使用 Google 帳號登入')).toBeDefined()
  })

  it('shows loading state when sign-in is triggered', async () => {
    // Make signInWithOAuth hang so loading stays true
    mockSignInWithOAuth.mockImplementation(() => new Promise(() => {}))

    const { default: LoginPage } = await import('@/app/login/page')
    render(<LoginPage />)

    const button = screen.getByText('使用 Google 帳號登入')
    fireEvent.click(button)

    expect(await screen.findByText('正在跳轉...')).toBeDefined()
  })

  it('disables button during loading', async () => {
    mockSignInWithOAuth.mockImplementation(() => new Promise(() => {}))

    const { default: LoginPage } = await import('@/app/login/page')
    render(<LoginPage />)

    const button = screen.getByText('使用 Google 帳號登入')
    fireEvent.click(button)

    expect(await screen.findByRole('button')).toBeDisabled()
  })

  it('displays error on OAuth failure', async () => {
    mockSignInWithOAuth.mockResolvedValue({
      error: new Error('Popup closed'),
    })

    const { default: LoginPage } = await import('@/app/login/page')
    render(<LoginPage />)

    const button = screen.getByText('使用 Google 帳號登入')
    fireEvent.click(button)

    expect(await screen.findByText(/登入失敗/)).toBeDefined()
  })
})
