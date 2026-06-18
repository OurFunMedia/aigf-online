import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

/**
 * GET /api/login-as?email=tobyyip.work@gmail.com
 *
 * Creates an authenticated session for the given user via service_role key,
 * then redirects to the app. Sets auth cookies using the response object.
 *
 * ⚠️ DEV ONLY — never expose in production.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')

  if (!email) {
    return NextResponse.json({ error: 'email query param required' }, { status: 400 })
  }

  try {
    const admin = getSupabaseAdmin()
    const testPass = 'TempLogin' + Date.now()

    // 1. Set a temporary password
    const { error: updateErr } = await admin.auth.admin.updateUserById(
      'b30bc6e7-2d80-4261-9655-0aa482af5e67',
      { password: testPass }
    )

    if (updateErr) {
      return NextResponse.json({ error: 'Password update failed: ' + updateErr.message }, { status: 500 })
    }

    // 2. Sign in with password via anon-key client
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data, error: signInErr } = await anonClient.auth.signInWithPassword({
      email,
      password: testPass,
    })

    if (signInErr || !data.session) {
      return NextResponse.json({ error: signInErr?.message || 'Sign in failed' }, { status: 500 })
    }

    const { access_token, refresh_token, expires_at } = data.session

    // 3. Build redirect response with auth cookie
    const redirectUrl = new URL('/', request.url)
    const response = NextResponse.redirect(redirectUrl)

    // @supabase/ssr cookie format: base64url-encoded JSON of the session
    const cookiePayload = JSON.stringify({
      access_token,
      refresh_token,
      expires_in: 3600,
      expires_at,
      token_type: 'bearer',
    })

    // @supabase/ssr stores with "base64-" prefix + base64url encoding
    const b64 = Buffer.from(cookiePayload).toString('base64')
    const b64url = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    const encodedCookieValue = 'base64-' + b64url

    const cookieName = 'sb-biqkkoulyycsnfjmjmkz-auth-token'
    const cookieOpts = { path: '/', maxAge: 3600, sameSite: 'lax' as const, httpOnly: false }

    response.cookies.set(cookieName, encodedCookieValue, cookieOpts)

    return response
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
