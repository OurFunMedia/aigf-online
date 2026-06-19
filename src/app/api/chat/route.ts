import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { chatCompletion, type NvidiaMessage } from '@/lib/nvidia'
import { buildSystemPrompt, hasDrawPrompt, parseDrawPrompt, stripDrawPrompt, isPhotoRequest, buildFallbackDrawPrompt } from '@/lib/draw-prompt'
import { createPendingImage } from '@/lib/storage'
import { processPendingImageGeneration } from '@/lib/image-generator'

/**
 * Synchronous chat + image generation.
 *
 * 1. Client saves user message via POST /api/chats (separate call)
 * 2. Client calls this endpoint — we await the FULL pipeline:
 *    NVIDIA → (if draw prompt) Agnes image gen → Storage upload
 * 3. Assistant message (with image_url if applicable) is saved to DB
 * 4. Return full result: { chat_id, text, image_url? }
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
    const result = await generateAndSaveResponse({
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
      image_url: result.imageUrl ?? null,
    })
  } catch (error: any) {
    console.error(`Chat generation failed for ${chat_id}:`, error)
    return NextResponse.json(
      { error: error.message || 'Chat generation failed' },
      { status: 500 }
    )
  }
}

// ── Synchronous pipeline ────────────────────────────────────────────

interface GenerateParams {
  userId: string
  characterId: string
  chatId: string
  messages: { role: string; content: string }[]
  personalityPrompt: string
  visualTemplate: string
  bodyDescription?: string
}

interface GenerateResult {
  text: string
  imageUrl?: string
}

async function generateAndSaveResponse(params: GenerateParams): Promise<GenerateResult> {
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
  let imageUrl: string | undefined

  // Generate image synchronously if draw prompt was requested
  if (drawPrompt) {
    const sceneDescription = drawPrompt.split(',').slice(0, 3).join(',').trim()

    try {
      const pendingImageId = await createPendingImage(
        userId,
        characterId,
        drawPrompt,
        sceneDescription
      )

      // Await the full image generation pipeline (Agnes + Storage)
      const storageUrl = await processPendingImageGeneration(
        pendingImageId,
        characterId,
        userId,
        drawPrompt
      )

      if (storageUrl) {
        imageUrl = storageUrl
      }
    } catch (imgErr) {
      console.error(`Image generation failed for chat ${chatId}, continuing without image:`, imgErr)
    }
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
  if (imageUrl) {
    assistantMsg.image_url = imageUrl
  }

  await admin
    .from('chats')
    .update({ messages: [...(chat.messages ?? []), assistantMsg] })
    .eq('id', chatId)

  console.log(`Chat gen complete for ${chatId}${imageUrl ? ' (with image)' : ''}`)

  return { text: cleanText, imageUrl }
}
