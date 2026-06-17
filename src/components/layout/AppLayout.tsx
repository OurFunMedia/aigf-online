'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ImageIcon } from 'lucide-react'
import { Navbar } from './Navbar'
import { Sidebar } from './Sidebar'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex flex-1 flex-col lg:pl-64">
        <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 pt-14">
          {children}
        </main>

        {/* Gallery entry */}
        <button
          onClick={() => router.push('/gallery')}
          className="fixed bottom-6 left-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-pink-600 text-white shadow-lg transition-all hover:bg-pink-700 hover:scale-105 active:scale-95 lg:left-[17rem]"
          title="寫真畫廊"
        >
          <ImageIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
