import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      const redirectUrl = isLocalEnv
        ? `${origin}${next}`
        : forwardedHost
          ? `https://${forwardedHost}${next}`
          : `${origin}${next}`

      const response = NextResponse.redirect(redirectUrl)

      // Forward Supabase auth cookies to the redirect response
      const supabaseCookies = request.cookies.getAll()
      for (const cookie of supabaseCookies) {
        if (cookie.name.startsWith('sb-')) {
          response.cookies.set(cookie.name, cookie.value, {
            path: '/',
            httpOnly: true,
            secure: !isLocalEnv,
            sameSite: 'lax',
          })
        }
      }

      return response
    }
  }

  return NextResponse.redirect(`${origin}/login?error=认证失败`)
}
