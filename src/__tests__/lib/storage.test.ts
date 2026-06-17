import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.fn()
global.fetch = mockFetch

const {
  mockUpload,
  mockGetPublicUrl,
  mockFromImages,
  mockGetSupabaseAdmin,
} = vi.hoisted(() => {
  const mockUpload = vi.fn()
  const mockGetPublicUrl = vi.fn()
  const mockFromImages = vi.fn()
  const mockGetSupabaseAdmin = () => ({
    storage: {
      from: () => ({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      }),
    },
    from: (table: string) => {
      if (table === 'images') {
        return { insert: mockFromImages }
      }
      return { insert: vi.fn() }
    },
  })
  return { mockUpload, mockGetPublicUrl, mockFromImages, mockGetSupabaseAdmin }
})

vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: mockGetSupabaseAdmin,
}))

describe('downloadImage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('downloads image from temp URL', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    })
    const { downloadImage } = await import('@/lib/storage')
    const buffer = await downloadImage('https://agnes.test/img.png')
    expect(buffer.byteLength).toBe(8)
    expect(mockFetch).toHaveBeenCalledWith('https://agnes.test/img.png')
  })

  it('throws on download failure', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404 })
    const { downloadImage } = await import('@/lib/storage')
    await expect(downloadImage('https://agnes.test/img.png')).rejects.toThrow(
      'Failed to download image'
    )
  })
})

describe('uploadToStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://supabase.test/storage/companion-photos/user-1/char-1/123.png' },
    })
  })

  it('uploads buffer and returns public URL', async () => {
    mockUpload.mockResolvedValue({ error: null })
    const { uploadToStorage } = await import('@/lib/storage')
    const url = await uploadToStorage(new ArrayBuffer(8), 'user-1', 'char-1')
    expect(url).toBe('https://supabase.test/storage/companion-photos/user-1/char-1/123.png')
    expect(mockUpload).toHaveBeenCalled()
  })

  it('throws on upload failure', async () => {
    mockUpload.mockResolvedValue({ error: new Error('Storage full') })
    const { uploadToStorage } = await import('@/lib/storage')
    await expect(uploadToStorage(new ArrayBuffer(8), 'user-1', 'char-1')).rejects.toThrow(
      'Storage upload failed'
    )
  })
})

describe('saveImageRecord', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('saves image record to database', async () => {
    mockFromImages.mockResolvedValue({ error: null })
    const { saveImageRecord } = await import('@/lib/storage')
    await saveImageRecord(
      'user-1',
      'char-1',
      'https://supabase.test/storage/img.png',
      'test prompt',
      'a girl in cafe'
    )
    expect(mockFromImages).toHaveBeenCalledWith({
      user_id: 'user-1',
      character_id: 'char-1',
      storage_url: 'https://supabase.test/storage/img.png',
      prompt: 'test prompt',
      scene_description: 'a girl in cafe',
    })
  })

  it('throws on database error', async () => {
    mockFromImages.mockResolvedValue({ error: new Error('DB error') })
    const { saveImageRecord } = await import('@/lib/storage')
    await expect(saveImageRecord('user-1', 'char-1', 'url', 'prompt')).rejects.toThrow(
      'Failed to save image record'
    )
  })
})
