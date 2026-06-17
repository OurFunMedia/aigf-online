import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.fn()
global.fetch = mockFetch

describe('chatCompletion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('NVIDIA_API_KEY', 'test-nvidia-key')
  })

  it('returns chat response on success', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: 'Hello! How can I help?' } }],
        }),
    })

    const { chatCompletion } = await import('@/lib/nvidia')
    const result = await chatCompletion([
      { role: 'system', content: 'You are helpful' },
      { role: 'user', content: 'Hi' },
    ])

    expect(result).toBe('Hello! How can I help?')
  })

  it('throws on missing API key', async () => {
    vi.stubEnv('NVIDIA_API_KEY', '')

    const { chatCompletion } = await import('@/lib/nvidia')
    await expect(chatCompletion([{ role: 'user', content: 'Hi' }])).rejects.toThrow(
      'NVIDIA_API_KEY'
    )
  })

  it('throws on API error', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve('Invalid key'),
    })

    const { chatCompletion } = await import('@/lib/nvidia')
    await expect(chatCompletion([{ role: 'user', content: 'Hi' }])).rejects.toThrow(
      'NVIDIA API error (401)'
    )
  })

  it('sends correct request to NVIDIA endpoint', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: 'OK' } }],
        }),
    })

    const { chatCompletion } = await import('@/lib/nvidia')
    await chatCompletion([{ role: 'user', content: 'Hello' }], {
      temperature: 0.7,
      max_tokens: 2048,
    })

    expect(mockFetch).toHaveBeenCalledWith(
      'https://integrate.api.nvidia.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-nvidia-key',
        }),
      })
    )

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(callBody.model).toBe('minimaxai/minimax-m2.7')
    expect(callBody.temperature).toBe(0.7)
    expect(callBody.max_tokens).toBe(2048)
  })
})
