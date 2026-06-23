import { getSupabaseAdmin } from '@/lib/supabase-admin'

const TARGET_W = 1024
const TARGET_H = 1536

/**
 * Download one or more reference images, pad each to exactly 1024×1536 (2:3)
 * **without stretching**, upload the padded versions to Supabase Storage,
 * and return an array of public URLs.
 *
 * Why: Agnes API receives reference images alongside a fixed `size` parameter.
 * If a reference image has a different aspect ratio (e.g. a square avatar),
 * the model may stretch/warp the character to fill the target canvas.
 * Pre-padding eliminates this ambiguity.
 *
 * This module imports `sharp` (a native Node addon) and is deliberately kept
 * separate from `image-generator.ts` so Edge bundles stay clean.
 */
export async function prepareRefImages(urls: string[]): Promise<string[]> {
  if (!urls.length) return []

  // Dynamic import so Turbopack/Edge bundler never sees sharp
  const sharpMod = await import('sharp')
  const sharp = sharpMod.default
  const supabase = getSupabaseAdmin()

  const results = await Promise.allSettled(
    urls.map(async (url) => {
      // 1. Download
      const resp = await fetch(url)
      if (!resp.ok) throw new Error(`Download failed (${resp.status})`)
      const buf = Buffer.from(await resp.arrayBuffer())

      // 2. Determine original dimensions & scale to fit inside target
      const meta = await sharp(buf).metadata()
      const scale = Math.min(TARGET_W / meta.width!, TARGET_H / meta.height!)
      const rw = Math.round(meta.width! * scale)
      const rh = Math.round(meta.height! * scale)

      // 3. Centre on a 1024×1536 canvas (solid black padding)
      const padded = await sharp(buf)
        .resize(rw, rh, { fit: 'inside', withoutEnlargement: false })
        .extend({
          top: Math.floor((TARGET_H - rh) / 2),
          bottom: Math.ceil((TARGET_H - rh) / 2),
          left: Math.floor((TARGET_W - rw) / 2),
          right: Math.ceil((TARGET_W - rw) / 2),
          background: { r: 0, g: 0, b: 0, alpha: 1 },
        })
        .png()
        .toBuffer()

      // 4. Upload to Storage as a temp reference
      const fp = `temp-refs/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`
      const { error } = await supabase.storage
        .from('companion-photos')
        .upload(fp, padded, { contentType: 'image/png' })
      if (error) throw new Error(`Storage upload: ${error.message}`)

      const { data: { publicUrl } } = supabase.storage
        .from('companion-photos')
        .getPublicUrl(fp)

      return publicUrl
    })
  )

  const padded: string[] = []
  for (const r of results) {
    if (r.status === 'fulfilled') padded.push(r.value)
    else console.warn('[prepare-ref-images] Failed to pad reference, skipping:', r.reason)
  }
  return padded
}
