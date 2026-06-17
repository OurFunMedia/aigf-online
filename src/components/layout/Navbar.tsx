'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, Home, LogOut, Menu, User } from 'lucide-react'
import { createBrowserSupabaseClient } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface NavbarProps {
  onMenuClick?: () => void
}

export function Navbar({ onMenuClick }: NavbarProps) {
  const router = useRouter()
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  const handleLogout = async () => {
    const supabase = createBrowserSupabaseClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between border-b border-border bg-background/80 backdrop-blur-sm px-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
          <Menu className="h-5 w-5 text-muted-foreground" />
        </Button>
        <div className="flex items-center gap-2">
          <Heart className="h-6 w-6 text-pink-500" />
          <span className="text-lg font-semibold text-foreground">AI 伴侶</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => router.push('/')}
        >
          <Home className="h-5 w-5 text-muted-foreground" />
        </Button>
      </div>

      <div className="flex items-center gap-2">

        <DropdownMenu>
          <DropdownMenuTrigger>
            <Avatar className="h-8 w-8 cursor-pointer">
              <AvatarImage src={avatarUrl ?? undefined} alt="用戶" />
              <AvatarFallback className="bg-muted text-muted-foreground">
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-48 bg-popover text-popover-foreground border-border"
          >
            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer hover:bg-accent focus:bg-accent"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>登出</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
