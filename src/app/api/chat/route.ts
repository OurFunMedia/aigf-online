import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { chatCompletion, type NvidiaMessage } from '@/lib/nvidia'
import { buildSystemPrompt, hasDrawPrompt, parseDrawPrompt, stripDrawPrompt, isPhotoRequest, buildFallbackDrawPrompt } from '@/lib/draw-prompt'
import { createPendingImage } from '@/lib/storage'

/**
 * Phase 1: Chat text generation (non-blocking — no image gen).
 *
 * 1. Call NVIDIA for chat completion
 * 2. Check for [DRAW_PROMPT:...] tag
 * 3. If draw prompt exists, create a pending image record
 * 4. Save assistant message (with pending_image_id if applicable)
 * 5. Return text + draw_prompt + pending_image_id
 *
 * Client then calls POST /api/images/generate for the image.
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

  try {
    const result = await generateTextResponse({
      userId: user.id,
      characterId: character_id,
      chatId: chat_id,
      messages,
      personalityPrompt: personality_prompt ?? '',
      visualTemplate: visual_template ?? '',
      bodyDescription: body_description,
    })

    return NextResponse.json({
      chat_id,
      text: result.text,
      draw_prompt: result.drawPrompt,
      pending_image_id: result.pendingImageId,
    })
  } catch (error: any) {
    console.error(`Chat generation failed for ${chat_id}:`, error)
    return NextResponse.json(
      { error: error.message || 'Chat generation failed' },
      { status: 500 }
    )
  }
}

// ── Text-only pipeline ───────────────────────────────────────────────

interface GenerateTextParams {
  userId: string
  characterId: string
  chatId: string
  messages: { role: string; content: string }[]
  personalityPrompt: string
  visualTemplate: string
  bodyDescription?: string
}

interface GenerateTextResult {
  text: string
  drawPrompt: string | null
  pendingImageId: string | null
}

async function generateTextResponse(params: GenerateTextParams): Promise<GenerateTextResult> {
  const { userId, characterId, chatId, messages, personalityPrompt, visualTemplate, bodyDescription } = params

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

  // Check for [DRAW_PROMPT:...] tag or build fallback
  let drawPrompt: string | null = null

  if (hasDrawPrompt(fullText)) {
    drawPrompt = parseDrawPrompt(fullText)
  }

  // Fallback: if the model omitted the tag but user asked for a photo
  if (!drawPrompt) {
    const userMsg = messages.filter((m) => m.role === 'user').pop()
    if (userMsg && isPhotoRequest(userMsg.content)) {
      drawPrompt = buildFallbackDrawPrompt(userMsg.content, visualTemplate)
      if (drawPrompt) {
        console.log(`Fallback draw prompt for chat ${chatId}: ${drawPrompt.substring(0, 100)}...`)
      }
    }
  }

  const cleanText = stripDrawPrompt(fullText)
  let pendingImageId: string | null = null

  // Create pending image record (but don't generate yet)
  if (drawPrompt) {
    const sceneDescription = drawPrompt.split(',').slice(0, 3).join(',').trim()
    pendingImageId = await createPendingImage(userId, characterId, drawPrompt, sceneDescription)
  }

  // Save assistant message to DB
  const admin = getSupabaseAdmin()
  const { data: chat } = await admin
    .from('chats')
    .select('messages')
    .eq('id', chatId)
    .single()

  if (!chat) {
    throw new Error(`Chat not found: ${chatId}`)
  }

  const assistantMsg: Record<string, unknown> = {
    role: 'assistant',
    content: cleanText,
    timestamp: new Date().toISOString(),
  }
  if (pendingImageId) {
    assistantMsg.pending_image_id = pendingImageId
  }

  await admin
    .from('chats')
    .update({ messages: [...(chat.messages ?? []), assistantMsg] })
    .eq('id', chatId)

  console.log(`Chat gen complete for ${chatId}${pendingImageId ? ' (pending image)' : ''}`)

  return { text: cleanText, drawPrompt, pendingImageId }
}
