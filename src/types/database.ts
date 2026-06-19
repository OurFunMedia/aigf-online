// Supabase database types for the AI Companion app

export interface BodyParams {
  age: number
  height: 'slim' | 'medium' | 'tall'
  body_type: 'slim' | 'average' | 'curvy' | 'athletic' | 'hourglass' | 'plump'
  bust: 'flat' | 'medium' | 'noticeable' | 'large'
  waist: 'thin' | 'medium' | 'wide'
  hip_width: 'narrow' | 'medium' | 'wide'
  hip_shape: 'flat' | 'round'
  style: 'pure' | 'sexy' | 'cute' | 'elegant' | 'girl-next-door'
  hair_color: 'black' | 'brown' | 'blonde' | 'red' | 'pink' | 'silver' | 'blue' | 'purple' | 'white' | (string & {})
  hair_style: 'long-straight' | 'long-curly' | 'medium' | 'short-straight' | 'short-curly' | 'ponytail' | 'twin-tails' | 'bob' | 'braid' | 'bun' | (string & {})
  /** 服裝參考圖 URL */
  outfit_ref_url?: string
}

export interface Character {
  id: string
  user_id: string
  name: string
  avatar_url: string | null
  personality_prompt: string
  visual_template: string
  body_params: BodyParams
  relation_points: number
  created_at: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  /** URL of a generated image attached to this message */
  image_url?: string
  /** Legacy: ID of a pending image record (pre-simplification). Kept for backward compat. */
  pending_image_id?: string
  timestamp: string
}

export interface Chat {
  id: string
  character_id: string
  user_id: string
  messages: ChatMessage[]
  updated_at: string
}

export type ImageStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface Image {
  id: string
  character_id: string
  user_id: string
  prompt: string
  storage_url: string
  scene_description: string | null
  status: ImageStatus
  error_message: string | null
  created_at: string
}

export interface UserProfile {
  id: string
  email?: string
  avatar_url?: string
  name?: string
}

// API response types
export interface ChatResponse {
  text: string
  /** Non-null when the assistant triggered image generation (now async) */
  pendingImageId: string | null
  hasPendingImage: boolean
}

export interface ChatWithImageResponse {
  text: string
  tempImageUrl: string | null
  hasImage: boolean
}

export interface ApiError {
  error: string
  status?: number
}
