'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ImageIcon, Plus, MessageCircle, Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface SidebarCharacter {
  id: string
  name: string
  avatar_url: string | null
}

interface SidebarProps {
  open?: boolean
  onClose?: () => void
}

export function Sidebar({ open = true, onClose }: SidebarProps) {
  const router = useRouter()
  const params = useParams()
  const [characters, setCharacters] = useState<SidebarCharacter[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/characters')
        if (res.ok) {
          const data = await res.json()
          setCharacters(data)
        }
      } catch {
        // Silently fail - will show empty state
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const currentCharacterId = params?.characterId as string | undefined

  return (
    <aside
      className={cn(
        'fixed top-14 left-0 z-40 h-[calc(100vh-3.5rem)] w-64 border-r border-border bg-background transition-transform duration-200 lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-medium text-muted-foreground">我的角色</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => router.push('/chat')}
          >
            <Plus className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>

        <ScrollArea className="flex-1 px-2 py-2">
          {loading ? (
            <div className="space-y-2 px-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <Skeleton className="h-10 w-10 rounded-full bg-muted" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-24 bg-muted" />
                    <Skeleton className="h-3 w-16 bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : characters.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <MessageCircle className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground mb-2">尚無角色</p>
              <p className="text-xs text-muted-foreground/60 mb-4">
                點擊上方 + 建立你的第一個 AI 伴侶
              </p>
              <Button
                variant="outline"
                size="sm"
                className="border-border text-muted-foreground hover:text-foreground"
                onClick={() => router.push('/chat')}
              >
                創建角色
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              {characters.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    router.push(`/chat/${c.id}`)
                    onClose?.()
                  }}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
                    currentCharacterId === c.id
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={c.avatar_url ?? undefined} alt={c.name} />
                    <AvatarFallback className="bg-muted text-xs text-muted-foreground">
                      {c.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{c.name}</span>
                  <Heart className="ml-auto h-3.5 w-3.5 text-pink-400/60" />
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Gallery entry */}
        <button
          onClick={() => {
            router.push('/gallery')
            onClose?.()
          }}
          className="flex w-full items-center gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ImageIcon className="h-5 w-5" />
          <span>寫真畫廊</span>
        </button>
      </div>
    </aside>
  )
}
