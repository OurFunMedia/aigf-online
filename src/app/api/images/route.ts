import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { getImages, clearAllImages } from '@/lib/services/image-service'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const sort = url.searchParams.get('sort') ?? 'desc'
  const statusFilter = url.searchParams.get('status') ?? 'completed'

  try {
    const images = await getImages(
      user.id,
      sort === 'asc' ? 'asc' : 'desc',
      statusFilter === 'any' ? 'any' : 'completed'
    )
    return NextResponse.json(images)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await clearAllImages(user.id)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
