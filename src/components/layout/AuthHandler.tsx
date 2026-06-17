'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function OAuthCodeHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const code = searchParams.get('code')
    if (code) {
      router.replace(`/auth/callback?code=${code}`)
    }
  }, [searchParams, router])

  return null
}

export function AuthHandler({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <OAuthCodeHandler />
      {children}
    </Suspense>
  )
}
