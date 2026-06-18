import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { chatCompletionStream } from '@/lib/nvidia'
import { buildSystemPrompt } from '@/lib/draw-prompt'
import { createPendingImage } from '@/lib/storage'
import { getCharacter } from '@/lib/services/character-service'
import { processPendingImageGeneration } from '@/lib/image-generator'
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

    // Get streaming NDJSON from NVIDIA (handles DRAW_PROMPT tag detection internally)
    const nvidiaStream = await chatCompletionStream([
      { role: 'system', content: systemPrompt },
      ...messages,
    ])

    const reader = nvidiaStream.getReader()
    const decoder = new TextDecoder()

    // Wrap stream to intercept the final d:true event and create pending image
    const outputStream = new ReadableStream({
      async start(controller) {
        const encoder2 = new TextEncoder()

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) {
              controller.close()
              return
            }

            const text = decoder.decode(value)
            // Check if this is the final event (has "d":true)
            if (text.includes('"d":true')) {
              try {
                const parsed = JSON.parse(text.trim())
                const drawPrompt = parsed.drawPrompt || null

                let pendingImageId: string | null = null
                if (drawPrompt) {
                  const sceneDescription = drawPrompt.split(',').slice(0, 3).join(',').trim()
                  pendingImageId = await createPendingImage(
                    user.id,
                    character_id,
                    drawPrompt,
                    sceneDescription
                  )
                  // Fire background image generation
                  processPendingImageGeneration(
                    pendingImageId,
                    character_id,
                    user.id,
                    drawPrompt
                  )
                }

                // Send final event with pendingImageId to client
                const finalEvent = JSON.stringify({
                  d: true,
                  pid: pendingImageId,
                  text: parsed.text || '',
                })
                controller.enqueue(encoder2.encode(finalEvent + '\n'))
              } catch {
                // If parsing fails, forward the original chunk
                controller.enqueue(encoder2.encode(text))
              }
            } else {
              controller.enqueue(encoder2.encode(text))
            }
          }
        } catch (err: any) {
          controller.enqueue(encoder2.encode(JSON.stringify({ e: true, message: err.message }) + '\n'))
          controller.close()
        }
      },
    })

    return new Response(outputStream, {
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
