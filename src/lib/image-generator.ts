import { generateImage } from '@/lib/agnes'
import { getCharacter } from '@/lib/services/character-service'
import { uploadToStorage, updateImageStatus } from '@/lib/storage'
import { buildSystemPrompt, parseDrawPrompt } from '@/lib/draw-prompt'

/** Build Chinese body description from structured body params */
function buildBodyDescription(bp: any): string {
  const bustLabels: Record<string, string> = { flat: '平坦', medium: '中等', noticeable: '豐滿', large: '豐滿' }
  const waistLabels: Record<string, string> = { thin: '纖細', medium: '適中', wide: '較寬' }
  const hipWidthLabels: Record<string, string> = { narrow: '較窄', medium: '適中', wide: '較寬' }
  const hipShapeLabels: Record<string, string> = { flat: '平坦', round: '圓潤' }

  return `年齡${bp.age}歲，胸部${bustLabels[bp.bust] ?? bp.bust}，腰圍${waistLabels[bp.waist] ?? bp.waist}，臀部${hipWidthLabels[bp.hip_width] ?? bp.hip_width}、${hipShapeLabels[bp.hip_shape] ?? bp.hip_shape}。`
}

/**
 * Process a pending image generation in the background.
 * Called after the API response is sent to the client.
 *
 * Steps:
 * 1. Load character (for reference images)
 * 2. Call Agnes AI to generate image (base64)
 * 3. Upload to Supabase Storage
 * 4. Update image record to 'completed' with the storage URL
 */
export async function processPendingImageGeneration(
  imageId: string,
  characterId: string,
  userId: string,
  drawPrompt: string
): Promise<void> {
  try {
    // 1. Mark as processing
    await updateImageStatus(imageId, 'processing')

    // 2. Load character for reference images
    const character = await getCharacter(characterId)
    if (!character) {
      throw new Error(`Character not found: ${characterId}`)
    }

    // 3. Collect reference images
    const refImages: string[] = []
    if (character.avatar_url) refImages.push(character.avatar_url)
    const outfitUrl = character.body_params?.outfit_ref_url
    if (outfitUrl && typeof outfitUrl === 'string') refImages.push(outfitUrl)

    // 4. Call Agnes AI
    const b64 = await generateImage(drawPrompt, {
      size: '1024x1536',
      referenceImages: refImages.length > 0 ? refImages : undefined,
    })

    // 5. Upload to Supabase Storage
    const buf = Buffer.from(b64, 'base64')
    const storageUrl = await uploadToStorage(
      buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
      userId,
      characterId
    )

    // 6. Mark as completed with the storage URL
    await updateImageStatus(imageId, 'completed', { storage_url: storageUrl })
  } catch (error: any) {
    console.error(`Background image generation failed for ${imageId}:`, error)
    await updateImageStatus(imageId, 'failed', {
      error_message: error.message || 'Unknown error during image generation',
    })
  }
}
