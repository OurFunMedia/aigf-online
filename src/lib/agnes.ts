const AGNES_API_BASE = 'https://apihub.agnes-ai.com/v1'
const MODEL = 'agnes-image-2.1-flash'

export interface GenerateImageOptions {
  size?: string
  aspect_ratio?: string
  seed?: number
  /** Reference image URL for character-consistent generation */
  referenceImage?: string
  /** Multiple reference image URLs (e.g. character face + outfit) */
  referenceImages?: string[]
}

export async function generateImage(
  prompt: string,
  options?: GenerateImageOptions
): Promise<string> {
  const apiKey = process.env.AGNES_API_KEY
  if (!apiKey) {
    throw new Error('AGNES_API_KEY not configured')
  }

  const body: Record<string, unknown> = {
    model: MODEL,
    prompt,
    size: options?.size ?? '1024x1536',
    return_base64: true,
  }

  if (options?.seed) {
    body.seed = options.seed
  }

  // Pass reference images for character consistency
  const refImages = options?.referenceImages ?? (options?.referenceImage ? [options.referenceImage] : undefined)
  if (refImages?.length) {
    body.prompt = `Keep the character's face and body shape exactly the same. ${prompt}`
    body.extra_body = {
      image: refImages,
      response_format: 'b64_json',
    }
  }

  const response = await fetch(`${AGNES_API_BASE}/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Agnes API error (${response.status}): ${text}`)
  }

  const data = await response.json()
  const img = data.data?.[0]

  // Text-to-image mode → b64_json; image-to-image mode → url fallback
  if (img?.b64_json) return img.b64_json
  if (img?.url) {
    // Fetch the URL and return as base64 buffer
    const imgRes = await fetch(img.url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!imgRes.ok) {
      // Try without auth header (public URL)
      const retry = await fetch(img.url)
      if (!retry.ok) {
        throw new Error(`Failed to fetch generated image (${imgRes.status}, retry ${retry.status}): URL may be invalid or expired`)
      }
      const arrayBuf = await retry.arrayBuffer()
      return Buffer.from(arrayBuf).toString('base64')
    }
    const arrayBuf = await imgRes.arrayBuffer()
    return Buffer.from(arrayBuf).toString('base64')
  }

  throw new Error(`Agnes API returned no image data. Response: ${JSON.stringify(data).slice(0, 500)}`)
}
