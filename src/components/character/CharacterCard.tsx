'use client'

import { Heart, MessageCircle, Pencil, Sparkles } from 'lucide-react'
import type { Character } from '@/types/database'

interface CharacterCardProps {
  character: Character
  onClick?: () => void
  onEdit?: () => void
}

export function CharacterCard({ character, onClick, onEdit }: CharacterCardProps) {
  const initial = character.name.charAt(0).toUpperCase()
  const preview =
    character.personality_prompt.length > 80
      ? character.personality_prompt.slice(0, 80) + '…'
      : character.personality_prompt

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.() } }}
      className="group relative flex cursor-pointer flex-col items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 text-center transition-all hover:border-pink-500/50 hover:bg-zinc-900 hover:shadow-lg hover:shadow-pink-500/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/50"
    >
      {/* Edit button */}
      {onEdit && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onEdit()
          }}
          className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-zinc-800 text-zinc-500 transition-all hover:bg-zinc-700 hover:text-pink-400 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/50"
          title="編輯角色"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
      {/* Avatar */}
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-purple-600 text-2xl font-bold text-white shadow-lg shadow-pink-500/20">
        {character.avatar_url ? (
          <img
            src={character.avatar_url}
            alt={character.name}
            className="h-full w-full rounded-full object-cover"
          />
        ) : (
          initial
        )}
      </div>

      {/* Name */}
      <h3 className="text-lg font-semibold text-white">{character.name}</h3>

      {/* Personality preview */}
      <p className="line-clamp-2 text-sm leading-relaxed text-zinc-400">{preview}</p>

      {/* Footer stats */}
      <div className="mt-auto flex w-full items-center justify-center gap-4 border-t border-zinc-800 pt-3 text-xs text-zinc-500">
        <span className="flex items-center gap-1">
          <Heart className="h-3.5 w-3.5 text-pink-400" />
          {character.relation_points}
        </span>
        <span className="flex items-center gap-1">
          <MessageCircle className="h-3.5 w-3.5 text-blue-400" />
          聊天
        </span>
        <span className="flex items-center gap-1">
          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          AI
        </span>
      </div>
    </div>
  )
}
