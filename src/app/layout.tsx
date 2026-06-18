import type { Metadata } from 'next'
import { Geist_Mono } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { AuthHandler } from '@/components/layout/AuthHandler'
import '@fontsource/chiron-goround-tc/400.css'
import '@fontsource/chiron-goround-tc/500.css'
import '@fontsource/chiron-goround-tc/600.css'
import '@fontsource/chiron-goround-tc/700.css'
import './globals.css'

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'AI 伴侶 - 你的專屬虛擬伴侶',
  description: '與 AI 伴侶聊天、生成專屬寫真照片',
  icons: {
    icon: '/icon.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="zh-TW"
      className={`${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthHandler>{children}</AuthHandler>
        </ThemeProvider>
      </body>
    </html>
  )
}
