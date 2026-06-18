import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { chatCompletion } from '@/lib/nvidia'
import { buildSystemPrompt, hasDrawPrompt, parseDrawPrompt, stripDrawPrompt } from '@/lib/draw-prompt'
import { createPendingImage } from '@/lib/storage'
import { processPendingImageGeneration } from '@/lib/image-generator'

// Serverless λ — free-tier has 10s maxDuration
// Client now sends character context directly to avoid DB queries eating into the 10s budget.

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let t0 = 0

  try {
    const {
      messages,
      character_id,
      personality_prompt,
      visual_template,
      body_description,
    } = await request.json()

    if (!character_id || !messages?.length) {
      return NextResponse.json(
        { error: 'Missing required fields: character_id, messages' },
        { status: 400 }
      )
    }

    // Build system prompt on the server (pure function, fast)
    const systemPrompt = buildSystemPrompt(
      personality_prompt ?? '',
      visual_template ?? '',
      body_description
    )

    // Call NVIDIA non-streaming with aggressive timeout (9.9s)
    t0 = Date.now()
    const fullText = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      {
        max_tokens: 256,
        timeoutMs: 9_900,
      }
    )
    console.log(`chat: NVIDIA responded in ${Date.now() - t0}ms`)

    // Check for [DRAW_PROMPT:...] tag
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
        processPendingImageGeneration(
          pendingImageId,
          character_id,
          user.id,
          drawPrompt
        )
      }
    }

    const cleanText = stripDrawPrompt(fullText)

    return NextResponse.json({
      text: cleanText,
      pendingImageId,
    })
  } catch (error: any) {
    console.error(`chat error after ${Date.now() - t0}ms:`, error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
