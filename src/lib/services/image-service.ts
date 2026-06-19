import { createClient } from '@/lib/supabase'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import type { Image } from '@/types/database'

/** Extract Storage file path from a Supabase public URL */
function storageUrlToPath(storageUrl: string): string {
  const prefix = '/object/public/companion-photos/'
  const idx = storageUrl.indexOf(prefix)
  if (idx === -1) throw new Error(`Cannot parse storage URL: ${storageUrl}`)
  return storageUrl.slice(idx + prefix.length)
}

export async function getImages(
  userId: string,
  order: 'asc' | 'desc' = 'desc',
  /** 'completed' (default) | 'any' — filter by status */
  statusFilter: 'completed' | 'any' = 'completed'
): Promise<Image[]> {
  const supabase = await createClient()
  const query = supabase
    .from('images')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: order === 'asc' })

  if (statusFilter === 'completed') {
    query.eq('status', 'completed')
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function deleteImage(id: string, userId: string): Promise<void> {
  const supabase = await createClient()

  // Fetch the record first to get the storage URL
  const { data: image, error: fetchError } = await supabase
    .from('images')
    .select('storage_url')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (fetchError) {
    if (fetchError.code === 'PGRST116') return // not found, nothing to do
    throw new Error(fetchError.message)
  }

  // Delete from Storage
  if (image?.storage_url) {
    const admin = getSupabaseAdmin()
    const filePath = storageUrlToPath(image.storage_url)
    await admin.storage.from('companion-photos').remove([filePath])
  }

  // Delete from DB
  const { error: deleteError } = await supabase
    .from('images')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (deleteError) throw new Error(deleteError.message)
}

export async function clearAllImages(userId: string): Promise<void> {
  const supabase = await createClient()

  // Fetch all image storage URLs for this user
  const { data: images, error: fetchError } = await supabase
    .from('images')
    .select('storage_url')
    .eq('user_id', userId)

  if (fetchError) throw new Error(fetchError.message)

  // Delete from Storage (all at once)
  if (images?.length) {
    const admin = getSupabaseAdmin()
    const filePaths = images
      .map((img) => {
        try {
          return img.storage_url ? storageUrlToPath(img.storage_url) : null
        } catch {
          return null
        }
      })
      .filter((p): p is string => p !== null)

    if (filePaths.length > 0) {
      await admin.storage.from('companion-photos').remove(filePaths)
    }
  }

  // Delete all records from DB
  const { error: deleteError } = await supabase
    .from('images')
    .delete()
    .eq('user_id', userId)

  if (deleteError) throw new Error(deleteError.message)
}
