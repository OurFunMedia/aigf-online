import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { getChatByCharacter, getOrCreateChat, appendMessage, deleteMessage, deleteChatsByCharacter } from '@/lib/services/chat-service'
import { getCharacter } from '@/lib/services/character-service'
import type { Chat, ChatMessage } from '@/types/database'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const characterId = searchParams.get('character_id')

  if (!characterId) {
    return NextResponse.json(
      { error: 'character_id query parameter is required' },
      { status: 400 }
    )
  }

  try {
    const chat = await getChatByCharacter(characterId, user.id)
    return NextResponse.json(chat ?? { messages: [] })
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
    const { character_id, content } = body

    if (!character_id || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: character_id, content' },
        { status: 400 }
      )
    }

    // Verify character exists and belongs to user
    const character = await getCharacter(character_id)
    if (!character || character.user_id !== user.id) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 })
    }

    const userMessage: ChatMessage = {
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    }

    const { chat } = await getOrCreateChat(character_id, user.id, userMessage)
    return NextResponse.json(chat)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { chat_id, message, delete_timestamp } = body

    if (!chat_id) {
      return NextResponse.json(
        { error: 'Missing required field: chat_id' },
        { status: 400 }
      )
    }

    let updated: Chat | null

    if (delete_timestamp) {
      updated = await deleteMessage(chat_id, user.id, delete_timestamp)
    } else if (message) {
      updated = await appendMessage(chat_id, user.id, message)
    } else {
      return NextResponse.json(
        { error: 'Missing required field: message or delete_timestamp' },
        { status: 400 }
      )
    }

    if (!updated) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
    }

    return NextResponse.json(updated)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const characterId = searchParams.get('character_id')

  if (!characterId) {
    return NextResponse.json(
      { error: 'character_id query parameter is required' },
      { status: 400 }
    )
  }

  try {
    await deleteChatsByCharacter(characterId, user.id)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
