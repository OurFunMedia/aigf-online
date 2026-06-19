import sharp from 'sharp'
import { generateImage } from '@/lib/agnes'
import { getCharacterAdmin } from '@/lib/services/character-service'
import { uploadToStorage, updateImageStatus } from '@/lib/storage'

/** Clean a drawPrompt that starts with "undefined," */
function sanitizePrompt(prompt: string): string {
  return prompt.replace(/^undefined\s*,\s*/i, '').trim()
}

/**
 * Retry wrapper — backs off 1s / 3s / 5s, only for transient errors.
 * A transient error = network/5xx. Permanent errors (4xx) are NOT retried.
 */
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn()
    } catch (err: any) {
      if (attempt >= maxRetries) throw err

      // Only retry on network errors, timeouts, or 5xx
      const msg = String(err.message ?? '')
      const isTransient =
        msg.includes('fetch failed') ||
        msg.includes('ETIMEDOUT') ||
        msg.includes('ECONNREFUSED') ||
        msg.includes('ECONNRESET') ||
        msg.includes('TimeoutError') ||
        msg.includes('The operation was aborted') ||
        msg.includes('503') ||
        msg.includes('502') ||
        msg.includes('500')

      if (!isTransient) throw err

      const delays = [1000, 3000, 5000]
      await new Promise((r) => setTimeout(r, delays[attempt] ?? 5000))
    }
  }
}

/**
 * Process a pending image generation with auto-retry.
 * Called after the API response is sent to the client.
 *
 * Steps:
 * 1. Sanitize prompt
 * 2. Mark as processing in DB
 * 3. Load character (for reference images)
 * 4. Call Agnes AI to generate image (base64)
 * 5. Upload to Supabase Storage
 * 6. Update image record to 'completed' with the storage URL
 */
/**
 * @returns The storage URL of the generated image, or throws on failure.
 */
export async function processPendingImageGeneration(
  imageId: string,
  characterId: string,
  userId: string,
  drawPrompt: string
): Promise<string> {
  try {
    const cleanPrompt = sanitizePrompt(drawPrompt)

    // Mark as processing
    await withRetry(() => updateImageStatus(imageId, 'processing'))

    // Load character for reference images (admin client — no request context needed)
    const character = await getCharacterAdmin(characterId)
    if (!character) {
      throw new Error(`Character not found: ${characterId}`)
    }

    // Collect reference images
    const refImages: string[] = []
    if (character.avatar_url) refImages.push(character.avatar_url)
    const outfitUrl = character.body_params?.outfit_ref_url
    if (outfitUrl && typeof outfitUrl === 'string') refImages.push(outfitUrl)

    // Call Agnes AI (with retry for transient failures)
    const b64 = await withRetry(() =>
      generateImage(cleanPrompt, {
        size: '1024x1536',
        referenceImages: refImages.length > 0 ? refImages : undefined,
      })
    )

    // Upload original to Supabase Storage
    const buf = Buffer.from(b64, 'base64')
    // Generate once so thumbnail uses the exact same timestamp as original
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    const h = String(now.getHours()).padStart(2, '0')
    const min = String(now.getMinutes()).padStart(2, '0')
    const s = String(now.getSeconds()).padStart(2, '0')
    const ts = `${y}${m}${d}-${h}${min}${s}`

    const storageUrl = await withRetry(() =>
      uploadToStorage(
        buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
        userId,
        characterId,
        { timestamp: ts }
      )
    )

    // Generate + upload thumbnail (400px WebP, ~30-50 KB vs 2-5 MB original)
    let thumbnailUrl: string | undefined
    try {
      const thumbBuf = await sharp(buf)
        .resize(400, undefined, { fit: 'cover', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer()

      const thumbArrayBuf = thumbBuf.buffer.slice(thumbBuf.byteOffset, thumbBuf.byteOffset + thumbBuf.byteLength) as ArrayBuffer
      thumbnailUrl = await withRetry(() =>
        uploadToStorage(
          thumbArrayBuf,
          userId,
          characterId,
          { prefix: 'thumb', contentType: 'image/webp', timestamp: ts }
        )
      )
    } catch (thumbErr) {
      console.warn(`Thumbnail generation failed for ${imageId}, continuing without:`, thumbErr)
    }

    // Mark as completed
    await withRetry(() =>
      updateImageStatus(imageId, 'completed', {
        storage_url: storageUrl,
        ...(thumbnailUrl && { thumbnail_url: thumbnailUrl }),
      })
    )

    return storageUrl
  } catch (error: any) {
    console.error(`Image generation failed for ${imageId}:`, error)
    // Best-effort: mark as failed
    try {
      await updateImageStatus(imageId, 'failed', {
        error_message: error.message || 'Unknown error during image generation',
      })
    } catch (innerErr) {
      console.error(`FATAL: could not update image ${imageId} to failed:`, innerErr)
    }
    // Return empty string so caller knows image gen failed
    return ''
  }
}
