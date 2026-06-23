import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'

/**
 * GET /api/test-session?email=tobyyip.work@gmail.com
 *
 * Returns a valid Supabase session for the given user.
 * Uses service_role to generate a magiclink, extracts the hash,
 * then exchanges it for a full session.
 *
 * ⚠️ DEV ONLY — never expose in production.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')

  if (!email) {
    return NextResponse.json({ error: 'email query param required' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  // 1. Generate a magic link (does not send email in admin API)
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })

  if (linkErr || !linkData) {
    return NextResponse.json({ error: linkErr?.message || 'Failed to generate link', linkData }, { status: 500 })
  }

  // 2. Extract the hash fragment from the action link
  const actionLink = linkData.properties?.action_link
  if (!actionLink) {
    return NextResponse.json({ error: 'No action_link in response', properties: linkData.properties }, { status: 500 })
  }

  const hashFragment = actionLink.split('#')[1]
  if (!hashFragment) {
    return NextResponse.json({ error: 'No hash fragment in action_link', actionLink }, { status: 500 })
  }

  // 3. Exchange the hash params for a session via regular auth endpoint
  const params = new URLSearchParams(hashFragment)
  const accessToken = params.get('access_token')
  const refreshToken = params.get('refresh_token')

  if (!accessToken) {
    return NextResponse.json({ error: 'No access_token in hash' }, { status: 500 })
  }

  // 4. Use anon client to set the session
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: sessionData, error: sessionErr } = await anonClient.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken ?? '',
  })

  if (sessionErr || !sessionData.session) {
    return NextResponse.json({ error: sessionErr?.message || 'Failed to set session' }, { status: 500 })
  }

  // Return the full session and user info
  return NextResponse.json({
    access_token: sessionData.session.access_token,
    refresh_token: sessionData.session.refresh_token,
    user: {
      id: sessionData.user?.id,
      email: sessionData.user?.email,
    },
    expires_at: sessionData.session.expires_at,
  })
}
