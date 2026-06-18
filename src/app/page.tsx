'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, Plus, Loader2 } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { CharacterCard } from '@/components/character/CharacterCard'
import { CreateCharacterDialog } from '@/components/character/CreateCharacterDialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { Character } from '@/types/database'

export default function HomePage() {
  const router = useRouter()
  const [characters, setCharacters] = useState<Character[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  async function fetchCharacters() {
    try {
      const res = await fetch('/api/characters')
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login')
          return
        }
        throw new Error('Failed to load characters')
      }
      const data = await res.json()
      setCharacters(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCharacters()
  }, [router])

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">你的 AI 伴侶</h1>
            <p className="mt-1 text-sm text-zinc-400">
              選擇一個角色開始聊天，或創建新的伴侶
            </p>
          </div>
          <Button
            variant="default"
            className="gap-2 bg-pink-600 text-white hover:bg-pink-700"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            創建角色
          </Button>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6"
              >
                <Skeleton className="h-20 w-20 rounded-full" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-red-400">載入失敗：{error}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              重新載入
            </Button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && characters.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800">
              <Heart className="h-8 w-8 text-pink-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">還沒有角色</h2>
            <p className="mt-2 max-w-sm text-sm text-zinc-400">
              創建你的第一個 AI 伴侶，開始專屬的聊天與寫真體驗
            </p>
            <Button
              variant="default"
              className="mt-6 gap-2 bg-pink-600 text-white hover:bg-pink-700"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
              創建角色
            </Button>
          </div>
        )}

        {/* Character grid */}
        {!loading && !error && characters.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {characters.map((character) => (
              <CharacterCard
                key={character.id}
                character={character}
                onClick={() => router.push(`/chat/${character.id}`)}
                onEdit={() => router.push(`/settings/${character.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      <CreateCharacterDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={fetchCharacters}
      />
    </AppLayout>
  )
}
