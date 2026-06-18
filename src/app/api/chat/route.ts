import { NextResponse, after } from 'next/server'
import { createClient } from '@/lib/supabase'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { chatCompletion, type NvidiaMessage } from '@/lib/nvidia'
import { buildSystemPrompt, hasDrawPrompt, parseDrawPrompt, stripDrawPrompt } from '@/lib/draw-prompt'
import { createPendingImage } from '@/lib/storage'

/**
 * Async chat generation.
 *
 * 1. Client saves user message via POST /api/chats (separate call)
 * 2. Client calls this endpoint to START chat generation
 * 3. This endpoint fires NVIDIA in background (waitUntil), returns { chat_id } immediately
 * 4. When NVIDIA finishes, result is saved to the `chats` table via admin client
 * 5. Client polls GET /api/chats to detect the new assistant message
 */

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const {
    character_id,
    chat_id,
    messages,
    personality_prompt,
    visual_template,
    body_description,
  } = await request.json()

  if (!character_id || !chat_id || !messages?.length) {
    return NextResponse.json(
      { error: 'Missing required fields: character_id, chat_id, messages' },
      { status: 400 }
    )
  }

  // Schedule background task after response (extends function lifetime)
  after(() => generateAndSaveResponse({
    userId: user.id,
    characterId: character_id,
    chatId: chat_id,
    messages,
    personalityPrompt: personality_prompt ?? '',
    visualTemplate: visual_template ?? '',
    bodyDescription: body_description,
  }))

  // Return immediately — client polls for result
  return NextResponse.json({ chat_id })
}

// ── Background task ─────────────────────────────────────────────────

interface GenerateParams {
  userId: string
  characterId: string
  chatId: string
  messages: { role: string; content: string }[]
  personalityPrompt: string
  visualTemplate: string
  bodyDescription?: string
}

async function generateAndSaveResponse(params: GenerateParams): Promise<void> {
  const { userId, characterId, chatId, messages, personalityPrompt, visualTemplate, bodyDescription } = params

  try {
    // Build system prompt
    const systemPrompt = buildSystemPrompt(personalityPrompt, visualTemplate, bodyDescription)

    // Call NVIDIA
    const fullText = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        ...messages as NvidiaMessage[],
      ],
      { max_tokens: 1024 }
    )

    // Check for [DRAW_PROMPT:...] tag
    let pendingImageId: string | null = null
    if (hasDrawPrompt(fullText)) {
      const drawPrompt = parseDrawPrompt(fullText)
      if (drawPrompt) {
        const sceneDescription = drawPrompt.split(',').slice(0, 3).join(',').trim()
        pendingImageId = await createPendingImage(
          userId,
          characterId,
          drawPrompt,
          sceneDescription
        )
        // Image generation is triggered by client via POST /api/images/generate
        // after polling detects the pending_image_id.
        // Fallback recovery: instrumentation.ts on startup, POST /api/images/retry
      }
    }

    const cleanText = stripDrawPrompt(fullText)

    // Save assistant message to DB using admin client
    const admin = getSupabaseAdmin()
    const { data: chat } = await admin
      .from('chats')
      .select('messages')
      .eq('id', chatId)
      .single()

    if (!chat) {
      console.error(`Chat not found: ${chatId}`)
      return
    }

    const assistantMsg = {
      role: 'assistant',
      content: cleanText,
      timestamp: new Date().toISOString(),
      image_url: undefined,
      pending_image_id: pendingImageId ?? undefined,
    }

    const updatedMessages = [...(chat.messages ?? []), assistantMsg]

    await admin
      .from('chats')
      .update({ messages: updatedMessages })
      .eq('id', chatId)

    console.log(`Background chat gen complete for ${chatId}`)
  } catch (error: any) {
    console.error(`Background chat gen failed for ${chatId}:`, error)
    // Could mark as failed in DB, but for now just log
  }
}
