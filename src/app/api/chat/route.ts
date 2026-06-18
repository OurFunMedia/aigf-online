import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { chatCompletionStream } from '@/lib/nvidia'
import { buildSystemPrompt } from '@/lib/draw-prompt'
import { getCharacter } from '@/lib/services/character-service'
import type { BodyParams } from '@/types/database'

// Edge Runtime — Vercel free-tier Edge has ~30s timeout vs Serverless 10s
export const runtime = 'edge'

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

    // Load character for personality and visual template (cached)
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

    // Get streaming NDJSON from NVIDIA — return directly to client.
    // chatCompletionStream handles DRAW_PROMPT tag detection and stripping internally.
    const stream = await chatCompletionStream([
      { role: 'system', content: systemPrompt },
      ...messages,
    ])

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error: any) {
    console.error('chat error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
