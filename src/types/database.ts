// Supabase database types for the AI Companion app

export interface Character {
  id: string
  user_id: string
  name: string
  avatar_url: string | null
  personality_prompt: string
  visual_template: string
  relation_points: number
  created_at: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  image_url?: string
  timestamp: string
}

export interface Chat {
  id: string
  character_id: string
  user_id: string
  messages: ChatMessage[]
  updated_at: string
}

export interface Image {
  id: string
  character_id: string
  user_id: string
  prompt: string
  storage_url: string
  scene_description: string | null
  created_at: string
}

export interface UserProfile {
  id: string
  email?: string
  avatar_url?: string
  name?: string
}

// API response types
export interface ChatWithImageResponse {
  text: string
  tempImageUrl: string | null
  hasImage: boolean
}

export interface ApiError {
  error: string
  status?: number
}
