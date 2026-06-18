import { createClient } from '@/lib/supabase'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import type { BodyParams, Character } from '@/types/database'

// ── In-memory character cache (60s TTL) ──
const characterCache = new Map<string, { data: Character; expiry: number }>()
const CACHE_TTL = 60_000

function getCached(id: string): Character | null {
  const entry = characterCache.get(id)
  if (entry && entry.expiry > Date.now()) return entry.data
  characterCache.delete(id)
  return null
}

function setCached(id: string, data: Character): void {
  characterCache.set(id, { data, expiry: Date.now() + CACHE_TTL })
}

export async function getCharacters(userId: string): Promise<Character[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('characters')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getCharacter(id: string): Promise<Character | null> {
  const cached = getCached(id)
  if (cached) return cached

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('characters')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // not found
    throw new Error(error.message)
  }

  setCached(id, data)
  return data
}

/**
 * Same as getCharacter() but uses the service-role admin client.
 * Safe to call outside request context (e.g. background image generation).
 * Bypasses RLS — only use server-side for system operations.
 */
export async function getCharacterAdmin(id: string): Promise<Character | null> {
  const cached = getCached(id)
  if (cached) return cached

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('characters')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(error.message)
  }

  setCached(id, data)
  return data
}

export async function createCharacter(
  userId: string,
  input: {
    name: string
    avatar_url?: string
    personality_prompt: string
    visual_template: string
    body_params?: BodyParams
  }
): Promise<Character> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('characters')
    .insert({
      user_id: userId,
      name: input.name,
      avatar_url: input.avatar_url ?? null,
      personality_prompt: input.personality_prompt,
      visual_template: input.visual_template,
      body_params: input.body_params ?? getDefaultBodyParams(),
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateCharacter(
  id: string,
  userId: string,
  input: Partial<{
    name: string
    avatar_url: string
    personality_prompt: string
    visual_template: string
    body_params: BodyParams
  }>
): Promise<Character | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('characters')
    .update(input)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(error.message)
  }

  // Bust cache so next getCharacter() re-fetches
  characterCache.delete(id)
  return data
}

export function getDefaultBodyParams(): BodyParams {
  return {
    age: 22,
    height: 'medium',
    body_type: 'average',
    bust: 'medium',
    waist: 'medium',
    hip_width: 'medium',
    hip_shape: 'round',
    style: 'cute',
    hair_color: 'black',
    hair_style: 'long-straight',
  }
}

export async function deleteCharacter(id: string, userId: string): Promise<boolean> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('characters')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
  return true
}
