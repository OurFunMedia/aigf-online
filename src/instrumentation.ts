import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { processPendingImageGeneration } from '@/lib/image-generator'

/**
 * Startup auto-recovery for stuck image generation tasks.
 *
 * On dev server restart, any images in 'processing' or 'pending' status
 * are orphaned (the background promise was lost). This hook:
 * 1. Resets 'processing' → 'pending' (so they become eligible for retry)
 * 2. Fires processPendingImageGeneration() for each stuck image
 *
 * Safe to run repeatedly — only affects non-completed images.
 */
export async function register() {
  // Skip during build — only retry at actual runtime
  if (process.env.NEXT_PHASE === 'phase-production-build') return

  // Give the server a moment to fully initialize
  await new Promise((r) => setTimeout(r, 2000))

  try {
    const supabase = getSupabaseAdmin()

    // Reset processing → pending (orphaned from a prior server crash)
    const { error: resetErr } = await supabase
      .from('images')
      .update({ status: 'pending', error_message: null })
      .eq('status', 'processing')

    if (resetErr) {
      console.warn('[auto-recovery] Failed to reset processing images:', resetErr.message)
    }

    // Fetch all pending images
    const { data: images, error: fetchErr } = await supabase
      .from('images')
      .select('id, user_id, character_id, prompt')
      .eq('status', 'pending')
      .limit(20)

    if (fetchErr) {
      console.warn('[auto-recovery] Failed to fetch pending images:', fetchErr.message)
      return
    }

    if (!images?.length) {
      return // nothing to recover
    }

    console.log(`[auto-recovery] Retrying ${images.length} stuck image(s)...`)

    for (const img of images) {
      // Fire-and-forget — each runs independently in the background
      processPendingImageGeneration(img.id, img.character_id, img.user_id, img.prompt)
    }
  } catch (err: any) {
    console.warn('[auto-recovery] Error:', err.message)
  }
}
