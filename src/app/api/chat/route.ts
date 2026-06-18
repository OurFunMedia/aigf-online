import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { chatCompletion } from '@/lib/nvidia'
import { buildSystemPrompt, hasDrawPrompt, parseDrawPrompt, stripDrawPrompt } from '@/lib/draw-prompt'
import { createPendingImage } from '@/lib/storage'
import { getCharacter } from '@/lib/services/character-service'
import { processPendingImageGeneration } from '@/lib/image-generator'
import type { BodyParams } from '@/types/database'

/** Build Chinese body description from structured body params */
function buildBodyDescription(bp: BodyParams): string {
  const bustLabels: Record<string, string> = { flat: '平坦', medium: '中等', noticeable: '豐滿', large: '豐滿' }
  const waistLabels: Record<string, string> = { thin: '纖細', medium: '適中', wide: '較寬' }
  const hipWidthLabels: Record<string, string> = { narrow: '較窄', medium: '適中', wide: '較寬' }
  const hipShapeLabels: Record<string, string> = { flat: '平坦', round: '圓潤' }

  return `年齡${bp.age}歲，胸部${bustLabels[bp.bust] ?? bp.bust}，腰圍${waistLabels[bp.waist] ?? bp.waist}，臀部${hipWidthLabels[bp.hip_width] ?? bp.hip_width}、${hipShapeLabels[bp.hip_shape] ?? bp.hip_shape}。`
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { character_id, messages } = await request.json()

    if (!character_id || !messages?.length) {
      return NextResponse.json(
        { error: 'Missing required fields: character_id, messages' },
        { status: 400 }
      )
    }

    // Load character for personality and visual template
    const character = await getCharacter(character_id)
    if (!character || character.user_id !== user.id) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 })
    }

    // Build system prompt with visual consistency constraints
    const systemPrompt = buildSystemPrompt(
      character.personality_prompt,
      character.visual_template,
      character.body_params ? buildBodyDescription(character.body_params) : undefined
    )

    // Call NVIDIA non-streaming with a short server-side timeout (8s).
    // Vercel free-tier Serverless has 10s maxDuration, so we leave ~2s buffer.
    const fullText = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      {
        max_tokens: 512,        // keep response short for speed
        timeoutMs: 8_000,       // server-side timeout
      }
    )

    // Check for [DRAW_PROMPT:...] tag in the response
    let pendingImageId: string | null = null
    if (hasDrawPrompt(fullText)) {
      const drawPrompt = parseDrawPrompt(fullText)
      if (drawPrompt) {
        const sceneDescription = drawPrompt.split(',').slice(0, 3).join(',').trim()
        pendingImageId = await createPendingImage(
          user.id,
          character_id,
          drawPrompt,
          sceneDescription
        )
        // Fire background image generation (non-blocking)
        processPendingImageGeneration(
          pendingImageId,
          character_id,
          user.id,
          drawPrompt
        )
      }
    }

    // Strip the [DRAW_PROMPT] tag before sending to client
    const cleanText = stripDrawPrompt(fullText)

    return NextResponse.json({
      text: cleanText,
      pendingImageId,
    })
  } catch (error: any) {
    console.error('chat error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
