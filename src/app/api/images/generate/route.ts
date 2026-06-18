import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { processPendingImageGeneration } from '@/lib/image-generator'

/**
 * POST /api/images/generate
 *
 * Trigger image generation for a specific pending image record.
 * Called by the client after polling detects a pending_image_id.
 *
 * This runs in its own request context — NOT inside after() —
 * so it has a full timeout budget independent of the chat API.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { image_id } = await request.json()

    if (!image_id) {
      return NextResponse.json({ error: 'Missing required field: image_id' }, { status: 400 })
    }

    // Fetch image record (admin client — need to read before auth gate)
    const admin = getSupabaseAdmin()
    const { data: image, error: fetchError } = await admin
      .from('images')
      .select('id, character_id, user_id, prompt, status')
      .eq('id', image_id)
      .single()

    if (fetchError || !image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 })
    }

    // Verify ownership
    if (image.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Skip if already completed
    if (image.status === 'completed') {
      return NextResponse.json({ status: 'skipped', reason: 'already_completed' })
    }

    // Fire background generation (non-blocking — but inside a fresh request context)
    processPendingImageGeneration(
      image.id,
      image.character_id,
      image.user_id,
      image.prompt
    )

    return NextResponse.json({ status: 'started', image_id: image.id })
  } catch (error: any) {
    console.error('Image generate error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
