import { getSupabaseAdmin } from '@/lib/supabase-admin'
import type { ImageStatus } from '@/types/database'

export async function createPendingImage(
  userId: string,
  characterId: string,
  prompt: string,
  sceneDescription?: string
): Promise<string> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('images')
    .insert({
      user_id: userId,
      character_id: characterId,
      storage_url: '',
      prompt,
      scene_description: sceneDescription ?? null,
      status: 'pending',
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(`Failed to create pending image: ${error.message}`)
  }
  return data.id
}

export async function updateImageStatus(
  imageId: string,
  status: ImageStatus,
  updates: {
    storage_url?: string
    error_message?: string
  } = {}
): Promise<void> {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('images')
    .update({
      status,
      ...(updates.storage_url !== undefined && { storage_url: updates.storage_url }),
      ...(updates.error_message !== undefined && { error_message: updates.error_message }),
    })
    .eq('id', imageId)

  if (error) {
    throw new Error(`Failed to update image status: ${error.message}`)
  }
}

export async function downloadImage(tempUrl: string): Promise<ArrayBuffer> {
  const response = await fetch(tempUrl)
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`)
  }
  return response.arrayBuffer()
}

export async function uploadToStorage(
  buffer: ArrayBuffer,
  userId: string,
  characterId: string
): Promise<string> {
  const supabase = getSupabaseAdmin()
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const h = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  const s = String(now.getSeconds()).padStart(2, '0')
  const timestamp = `${y}${m}${d}-${h}${min}${s}`
  const filePath = `${userId}/${characterId}/${timestamp}.png`

  const { error } = await supabase.storage
    .from('companion-photos')
    .upload(filePath, buffer, {
      contentType: 'image/png',
      upsert: false,
    })

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`)
  }

  const { data: publicUrl } = supabase.storage
    .from('companion-photos')
    .getPublicUrl(filePath)

  return publicUrl.publicUrl
}

export async function saveImageRecord(
  userId: string,
  characterId: string,
  storageUrl: string,
  prompt: string,
  sceneDescription?: string
): Promise<void> {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase.from('images').insert({
    user_id: userId,
    character_id: characterId,
    storage_url: storageUrl,
    prompt,
    scene_description: sceneDescription ?? null,
  })

  if (error) {
    throw new Error(`Failed to save image record: ${error.message}`)
  }
}

export async function persistImage(
  tempUrl: string,
  userId: string,
  characterId: string,
  prompt: string,
  sceneDescription?: string
): Promise<string> {
  // 1. Download from Agnes temp URL
  const buffer = await downloadImage(tempUrl)

  // 2. Upload to Supabase Storage
  const permanentUrl = await uploadToStorage(buffer, userId, characterId)

  // 3. Save record to images table
  await saveImageRecord(userId, characterId, permanentUrl, prompt, sceneDescription)

  return permanentUrl
}
