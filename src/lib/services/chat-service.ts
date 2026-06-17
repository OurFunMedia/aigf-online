import { createClient } from '@/lib/supabase'
import type { Chat, ChatMessage } from '@/types/database'

export async function getChatByCharacter(
  characterId: string,
  userId: string
): Promise<Chat | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('chats')
    .select('*')
    .eq('character_id', characterId)
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(error.message)
  }
  return data
}

export async function createChat(
  characterId: string,
  userId: string,
  message: ChatMessage
): Promise<Chat> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('chats')
    .insert({
      character_id: characterId,
      user_id: userId,
      messages: [message],
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function appendMessage(
  chatId: string,
  userId: string,
  message: ChatMessage
): Promise<Chat | null> {
  const supabase = await createClient()

  // Fetch current messages
  const { data: chat, error: fetchError } = await supabase
    .from('chats')
    .select('messages')
    .eq('id', chatId)
    .eq('user_id', userId)
    .single()

  if (fetchError) {
    if (fetchError.code === 'PGRST116') return null
    throw new Error(fetchError.message)
  }

  const messages = [...(chat.messages as ChatMessage[]), message]

  const { data, error } = await supabase
    .from('chats')
    .update({ messages, updated_at: new Date().toISOString() })
    .eq('id', chatId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function getOrCreateChat(
  characterId: string,
  userId: string,
  userMessage: ChatMessage
): Promise<{ chat: Chat; isNew: boolean }> {
  // Try to find existing chat
  const existing = await getChatByCharacter(characterId, userId)

  if (existing) {
    const updated = await appendMessage(existing.id, userId, userMessage)
    return { chat: updated ?? existing, isNew: false }
  }

  const newChat = await createChat(characterId, userId, userMessage)
  return { chat: newChat, isNew: true }
}

export async function deleteMessage(
  chatId: string,
  userId: string,
  timestamp: string
): Promise<Chat | null> {
  const supabase = await createClient()

  // Fetch current messages
  const { data: chat, error: fetchError } = await supabase
    .from('chats')
    .select('messages')
    .eq('id', chatId)
    .eq('user_id', userId)
    .single()

  if (fetchError) {
    if (fetchError.code === 'PGRST116') return null
    throw new Error(fetchError.message)
  }

  const messages = (chat.messages as ChatMessage[]).filter(
    (m) => m.timestamp !== timestamp
  )

  const { data, error } = await supabase
    .from('chats')
    .update({ messages, updated_at: new Date().toISOString() })
    .eq('id', chatId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function deleteChatsByCharacter(
  characterId: string,
  userId: string
): Promise<boolean> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('chats')
    .delete()
    .eq('character_id', characterId)
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
  return true
}
