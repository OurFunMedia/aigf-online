import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { processPendingImageGeneration } from '@/lib/image-generator'

/**
 * POST /api/images/generate
 *
 * Phase 2: Generate image for a pending record.
 * Called by the client after the assistant text is already displayed.
 *
 * Steps:
 * 1. Run the full Agnes + Storage pipeline
 * 2. On success, update the assistant message in the chat with image_url
 * 3. On failure, the image record is already marked 'failed' by
 *    processPendingImageGeneration internally
 */

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { chat_id, pending_image_id, character_id, draw_prompt } = await request.json()

  if (!pending_image_id || !character_id || !draw_prompt) {
    return NextResponse.json(
      { error: 'Missing required fields: pending_image_id, character_id, draw_prompt' },
      { status: 400 }
    )
  }

  try {
    // Run the full image generation pipeline (Agnes + Storage upload)
    const storageUrl = await processPendingImageGeneration(
      pending_image_id,
      character_id,
      user.id,
      draw_prompt
    )

    if (storageUrl) {
      // Update the assistant message in the chat to include image_url
      const admin = getSupabaseAdmin()
      const { data: chat } = await admin
        .from('chats')
        .select('messages')
        .eq('id', chat_id)
        .single()

      if (chat) {
        const messages = (chat.messages as Record<string, unknown>[]) ?? []
        const updatedMessages = messages.map((msg) => {
          if (msg.role === 'assistant' && msg.pending_image_id === pending_image_id) {
            return { ...msg, image_url: storageUrl, pending_image_id: undefined }
          }
          return msg
        })
        await admin
          .from('chats')
          .update({ messages: updatedMessages, updated_at: new Date().toISOString() })
          .eq('id', chat_id)
      }

      return NextResponse.json({ image_url: storageUrl })
    }

    // processPendingImageGeneration returned empty string → it failed internally
    return NextResponse.json(
      { error: 'Image generation failed' },
      { status: 500 }
    )
  } catch (error: any) {
    console.error('Image generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Image generation failed' },
      { status: 500 }
    )
  }
}
