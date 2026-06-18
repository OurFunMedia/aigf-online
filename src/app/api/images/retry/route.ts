import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { processPendingImageGeneration } from '@/lib/image-generator'

/**
 * POST /api/images/retry
 *
 * Retry ALL images with status 'pending' or 'failed'.
 * Resets stuck 'processing' images back to 'pending' first.
 *
 * This is safe to call repeatedly — images that succeed on a previous
 * call will already be 'completed' and won't match.
 */
export async function POST() {
  const supabase = getSupabaseAdmin()

  try {
    // 1. Reset stuck processing → pending
    const { error: resetError } = await supabase
      .from('images')
      .update({ status: 'pending', error_message: null })
      .eq('status', 'processing')

    if (resetError) {
      console.error('Failed to reset processing images:', resetError)
    }

    // 2. Fetch all pending + failed images
    const { data: images, error: fetchError } = await supabase
      .from('images')
      .select('id, user_id, character_id, prompt, status')
      .or('status.eq.pending,status.eq.failed')
      .limit(20)

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!images?.length) {
      return NextResponse.json({ retried: 0, message: 'No images to retry' })
    }

    // 3. Fire background processing for each (non-blocking)
    const results = await Promise.allSettled(
      images.map((img) => {
        // Reset to pending before retry
        return supabase
          .from('images')
          .update({ status: 'pending', error_message: null })
          .eq('id', img.id)
          .then(() => {
            processPendingImageGeneration(img.id, img.character_id, img.user_id, img.prompt)
          })
      })
    )

    const succeeded = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.filter((r) => r.status === 'rejected').length

    return NextResponse.json({
      retried: images.length,
      succeeded,
      failed,
      imageIds: images.map((img) => img.id),
    })
  } catch (error: any) {
    console.error('Retry error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
