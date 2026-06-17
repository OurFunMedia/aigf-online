import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { getCharacters, createCharacter } from '@/lib/services/character-service'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const characters = await getCharacters(user.id)
    return NextResponse.json(characters)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()

    // Validate required fields
    if (!body.name || !body.personality_prompt || !body.visual_template) {
      return NextResponse.json(
        { error: 'Missing required fields: name, personality_prompt, visual_template' },
        { status: 400 }
      )
    }

    const character = await createCharacter(user.id, body)
    return NextResponse.json(character, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
