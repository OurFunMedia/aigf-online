import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { chatCompletion } from '@/lib/nvidia'
import { buildSystemPrompt, parseDrawPrompt, stripDrawPrompt } from '@/lib/draw-prompt'
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

    // Call NVIDIA MiniMax M2.7
    const assistantMessage = await chatCompletion([
      { role: 'system', content: systemPrompt },
      ...messages,
    ])

    // Check for DRAW_PROMPT tag
    const drawPromptText = parseDrawPrompt(assistantMessage)
    const cleanMessage = stripDrawPrompt(assistantMessage)

    let pendingImageId: string | null = null

    if (drawPromptText) {
      const sceneDescription = drawPromptText.split(',').slice(0, 3).join(',').trim()

      // Create a pending image record — do NOT wait for generation
      pendingImageId = await createPendingImage(
        user.id,
        character_id,
        drawPromptText,
        sceneDescription
      )

      // Fire off background generation (does not block the response)
      processPendingImageGeneration(
        pendingImageId,
        character_id,
        user.id,
        drawPromptText
      )
    }

    return NextResponse.json({
      text: cleanMessage,
      pendingImageId,
      hasPendingImage: !!pendingImageId,
    })
  } catch (error: any) {
    console.error('chat error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
