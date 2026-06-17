import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError) {
    return NextResponse.json({ error: `驗證失敗：${authError.message}` }, { status: 401 })
  }

  if (!user) {
    return NextResponse.json({ error: '請先登入' }, { status: 401 })
  }

  try {
    const { image } = await request.json()

    if (!image || typeof image !== 'string') {
      return NextResponse.json({ error: '缺少圖片資料' }, { status: 400 })
    }

    // Extract base64 from data URI
    const matches = image.match(/^data:image\/(\w+);base64,(.+)$/)
    if (!matches) {
      return NextResponse.json({ error: '不支援的圖片格式，請使用 PNG 或 JPEG' }, { status: 400 })
    }

    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1]
    if (!['png', 'jpg', 'webp', 'gif'].includes(ext)) {
      return NextResponse.json({ error: `不支援的圖片格式：.${ext}，請使用 PNG 或 JPEG` }, { status: 400 })
    }

    const buffer = Buffer.from(matches[2], 'base64')

    // Upload via admin client (bypasses RLS)
    const admin = getSupabaseAdmin()
    const timestamp = Date.now()
    const filePath = `avatars/${user.id}/${timestamp}.${ext}`

    const { error: uploadError } = await admin.storage
      .from('companion-photos')
      .upload(filePath, buffer, {
        contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json({ error: `上傳至儲存空間失敗：${uploadError.message}` }, { status: 500 })
    }

    const { data: publicUrl } = admin.storage
      .from('companion-photos')
      .getPublicUrl(filePath)

    return NextResponse.json({ url: publicUrl.publicUrl })
  } catch (error: any) {
    return NextResponse.json({ error: `伺服器錯誤：${error.message}` }, { status: 500 })
  }
}
