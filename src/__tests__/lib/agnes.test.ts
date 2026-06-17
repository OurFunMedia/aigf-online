import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.fn()
global.fetch = mockFetch

describe('generateImage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('AGNES_API_KEY', 'test-key')
  })

  it('returns base64 string on success', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [{ b64_json: 'abc123' }],
        }),
    })

    const { generateImage } = await import('@/lib/agnes')
    const result = await generateImage('test prompt')

    expect(result).toBe('abc123')
    expect(mockFetch).toHaveBeenCalledWith(
      'https://apihub.agnes-ai.com/v1/images/generations',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key',
        }),
      })
    )
  })

  it('throws on missing API key', async () => {
    vi.stubEnv('AGNES_API_KEY', '')

    const { generateImage } = await import('@/lib/agnes')
    await expect(generateImage('test')).rejects.toThrow('AGNES_API_KEY')
  })

  it('throws on API error', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      text: () => Promise.resolve('Bad request'),
    })

    const { generateImage } = await import('@/lib/agnes')
    await expect(generateImage('test')).rejects.toThrow('Agnes API error (400)')
  })

  it('sends single referenceImage via extra_body.image', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [{ b64_json: 'abc123' }],
        }),
    })

    const { generateImage } = await import('@/lib/agnes')
    await generateImage('test prompt', {
      referenceImage: 'https://example.com/face.png',
    })

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(callBody.extra_body.image).toEqual(['https://example.com/face.png'])
    expect(callBody.extra_body.response_format).toBe('b64_json')
    expect(callBody.prompt).toContain("Keep the character's face")
  })

  it('sends multiple referenceImages via extra_body.image', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [{ b64_json: 'abc123' }],
        }),
    })

    const { generateImage } = await import('@/lib/agnes')
    await generateImage('test prompt', {
      referenceImages: [
        'https://example.com/face.png',
        'https://example.com/outfit.png',
      ],
    })

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(callBody.extra_body.image).toEqual([
      'https://example.com/face.png',
      'https://example.com/outfit.png',
    ])
    expect(callBody.extra_body.response_format).toBe('b64_json')
    expect(callBody.prompt).toContain("Keep the character's face")
  })

  it('prefers referenceImages over referenceImage', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [{ b64_json: 'abc123' }],
        }),
    })

    const { generateImage } = await import('@/lib/agnes')
    await generateImage('test prompt', {
      referenceImage: 'https://example.com/old.png',
      referenceImages: ['https://example.com/new.png'],
    })

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(callBody.extra_body.image).toEqual(['https://example.com/new.png'])
    expect(callBody.extra_body.response_format).toBe('b64_json')
  })

  it('accepts url response in image-to-image mode', async () => {
    mockFetch
      // First call: generate image → returns URL
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [{ url: 'https://agnes.example.com/img.png', revised_prompt: '...' }],
          }),
      })
      // Second call: fetch the URL → returns 403
      .mockResolvedValueOnce({ ok: false, status: 403 })
      // Third call: retry without auth → returns raw bytes
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(Buffer.from('fake-image-bytes')),
      })

    const { generateImage } = await import('@/lib/agnes')
    const result = await generateImage('test prompt', {
      referenceImages: ['https://example.com/ref.png'],
    })

    expect(typeof result).toBe('string')
    expect(result).toBe(Buffer.from('fake-image-bytes').toString('base64'))
  })

  it('throws with response preview when no image data found', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ foo: 'bar' }),
    })

    const { generateImage } = await import('@/lib/agnes')
    await expect(generateImage('test')).rejects.toThrow('Agnes API returned no image data')
    await expect(generateImage('test')).rejects.toThrow('{"foo":"bar"}')
  })

  it('sends return_base64 true in request body', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [{ b64_json: 'abc123' }],
        }),
    })

    const { generateImage } = await import('@/lib/agnes')
    await generateImage('test prompt', { size: '1024x1536', seed: 42 })

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(callBody.model).toBe('agnes-image-2.1-flash')
    expect(callBody.prompt).toBe('test prompt')
    expect(callBody.size).toBe('1024x1536')
    expect(callBody.seed).toBe(42)
    expect(callBody.return_base64).toBe(true)
  })
})
