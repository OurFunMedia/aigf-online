'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Heart,
  ImageIcon,
  Loader2,
  Save,
  Sparkles,
  Upload,
  X,
} from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { BodyParams, Character } from '@/types/database'

// ── Option definitions ──

const HEIGHT_OPTIONS = [
  { value: 'slim' as const, label: '矮細' },
  { value: 'medium' as const, label: '中等' },
  { value: 'tall' as const, label: '高挑' },
]

const BODY_TYPE_OPTIONS = [
  { value: 'slim' as const, label: '纖瘦' },
  { value: 'average' as const, label: '勻稱' },
  { value: 'curvy' as const, label: '豐滿' },
  { value: 'athletic' as const, label: '運動型' },
  { value: 'hourglass' as const, label: '沙漏' },
  { value: 'plump' as const, label: '微肉' },
]

const BUST_OPTIONS = [
  { value: 'flat' as const, label: '微乳' },
  { value: 'medium' as const, label: '中等' },
  { value: 'noticeable' as const, label: '明顯' },
  { value: 'large' as const, label: '暴乳' },
]

const WAIST_OPTIONS = [
  { value: 'thin' as const, label: '細' },
  { value: 'medium' as const, label: '中' },
  { value: 'wide' as const, label: '寬' },
]

const HIP_WIDTH_OPTIONS = [
  { value: 'narrow' as const, label: '窄' },
  { value: 'medium' as const, label: '中' },
  { value: 'wide' as const, label: '寬' },
]

const HIP_SHAPE_OPTIONS = [
  { value: 'flat' as const, label: '平' },
  { value: 'round' as const, label: '翹' },
]

const STYLE_OPTIONS = [
  { value: 'pure' as const, label: '清純', description: '清新脫俗、純真無瑕' },
  { value: 'sexy' as const, label: '性感', description: '嫵媚動人、成熟魅力' },
  { value: 'cute' as const, label: '可愛', description: '活潑俏皮、甜美笑容，充滿青春活力' },
  { value: 'elegant' as const, label: '優雅', description: '高貴典雅、氣質出眾' },
  { value: 'girl-next-door' as const, label: '鄰家', description: '親切自然、平易近人' },
]

const HAIR_COLOR_OPTIONS = [
  { value: 'black' as const, label: '黑色' },
  { value: 'brown' as const, label: '棕色' },
  { value: 'blonde' as const, label: '金色' },
  { value: 'red' as const, label: '紅色' },
  { value: 'pink' as const, label: '粉色' },
  { value: 'silver' as const, label: '銀色' },
  { value: 'blue' as const, label: '藍色' },
  { value: 'purple' as const, label: '紫色' },
  { value: 'white' as const, label: '白色' },
]

const HAIR_STYLE_OPTIONS = [
  { value: 'long-straight' as const, label: '長直髮' },
  { value: 'long-curly' as const, label: '長捲髮' },
  { value: 'medium' as const, label: '中長髮' },
  { value: 'short-straight' as const, label: '短直髮' },
  { value: 'short-curly' as const, label: '短捲髮' },
  { value: 'ponytail' as const, label: '馬尾' },
  { value: 'twin-tails' as const, label: '雙馬尾' },
  { value: 'bob' as const, label: '鮑伯頭' },
  { value: 'braid' as const, label: '辮子' },
  { value: 'bun' as const, label: '包包頭' },
]

// ── Helpers ──

/** Convert structured body params into an English visual prompt for Agnes */
function bodyParamsToVisualTemplate(p: BodyParams): string {
  const hairStyleLabels: Record<string, string> = {
    'long-straight': 'long straight hair',
    'long-curly': 'long curly hair',
    'medium': 'medium-length hair',
    'short-straight': 'short straight hair',
    'short-curly': 'short curly hair',
    'ponytail': 'ponytail hairstyle',
    'twin-tails': 'twin-tail hairstyle',
    'bob': 'bob hairstyle',
    'braid': 'braided hairstyle',
    'bun': 'bun hairstyle',
  }

  const styleLabels: Record<string, string> = {
    pure: 'pure and innocent style',
    sexy: 'sexy and charming style',
    cute: 'cute and lively style',
    elegant: 'elegant and graceful style',
    'girl-next-door': 'girl-next-door style',
  }

  const parts: string[] = [
    `${p.hair_color} ${hairStyleLabels[p.hair_style]}`,
    styleLabels[p.style],
    `${p.age} years old`,
  ]

  if (p.height !== 'medium') {
    parts.push(p.height === 'slim' ? 'petite figure' : 'tall figure')
  }
  if (p.body_type !== 'average') {
    const bodyLabels: Record<string, string> = {
      slim: 'slender build',
      curvy: 'curvy build',
      athletic: 'athletic build',
      hourglass: 'hourglass figure',
      plump: 'plump build',
    }
    parts.push(bodyLabels[p.body_type] ?? p.body_type)
  }

  // Bust / waist / hips for body measurement awareness
  const bustLabels: Record<string, string> = {
    flat: 'flat chest',
    medium: 'medium bust',
    noticeable: 'noticeable bust',
    large: 'large bust',
  }
  parts.push(bustLabels[p.bust] ?? p.bust)

  const waistLabels: Record<string, string> = {
    thin: 'thin waist',
    medium: 'medium waist',
    wide: 'wide waist',
  }
  parts.push(waistLabels[p.waist] ?? p.waist)

  const hipWidthLabels: Record<string, string> = {
    narrow: 'narrow',
    medium: 'medium',
    wide: 'wide',
  }
  const hipShapeLabels: Record<string, string> = {
    flat: 'flat hips',
    round: 'round hips',
  }
  const hipWidth = hipWidthLabels[p.hip_width] ?? p.hip_width
  const hipShape = hipShapeLabels[p.hip_shape] ?? ''
  if (hipWidth === 'medium') {
    parts.push(hipShape || 'medium hips')
  } else {
    parts.push(`${hipWidth} ${hipShape || 'hips'}`)
  }

  return parts.join(', ')
}

/** Build a short Chinese summary for the live preview */
function buildPreviewSummary(p: BodyParams): string {
  const hairColorLabels: Record<string, string> = {
    black: '黑', brown: '棕', blonde: '金', red: '紅',
    pink: '粉', silver: '銀', blue: '藍', purple: '紫', white: '白',
  }
  const hairStyleLabels: Record<string, string> = {
    'long-straight': '長直髮', 'long-curly': '長捲髮', 'medium': '中長髮',
    'short-straight': '短直髮', 'short-curly': '短捲髮', 'ponytail': '馬尾',
    'twin-tails': '雙馬尾', 'bob': '鮑伯頭', 'braid': '辮子', 'bun': '包包頭',
  }
  const styleLabels: Record<string, string> = {
    pure: '清純', sexy: '性感', cute: '可愛',
    elegant: '優雅', 'girl-next-door': '鄰家',
  }

  const bustLabels: Record<string, string> = { flat: '微乳', medium: '中胸', noticeable: '有料', large: '巨乳' }
  const waistLabels: Record<string, string> = { thin: '細腰', medium: '中腰', wide: '寬腰' }
  const hipWidthLabels: Record<string, string> = { narrow: '窄', medium: '中', wide: '寬' }
  const hipShapeLabels: Record<string, string> = { flat: '平臀', round: '翹臀' }
  const bodyDetail = `${bustLabels[p.bust]} · ${waistLabels[p.waist]} · ${hipWidthLabels[p.hip_width]}${hipShapeLabels[p.hip_shape]}`

  return `${hairColorLabels[p.hair_color]}${hairStyleLabels[p.hair_style]} · ${styleLabels[p.style]} · ${p.age}歲 · ${bodyDetail}`
}

const DEFAULT_BODY_PARAMS: BodyParams = {
  age: 22,
  height: 'medium',
  body_type: 'average',
  bust: 'medium',
  waist: 'medium',
  hip_width: 'medium',
  hip_shape: 'round',
  style: 'cute',
  hair_color: 'black',
  hair_style: 'long-straight',
}

// ── Reusable components ──

function ButtonGroup<T extends string>({
  options,
  value,
  onChange,
  size = 'sm',
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  size?: 'sm' | 'xs'
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-lg font-medium transition-all ${
            value === opt.value
              ? 'bg-pink-600 text-white shadow-sm'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
          } ${size === 'xs' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 text-xs text-zinc-400 mb-2"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        {title}
      </button>
      {open && <div className="space-y-4">{children}</div>}
    </div>
  )
}

// ── Page ──

export default function SettingsPage() {
  const params = useParams()
  const router = useRouter()
  const characterId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved')
  const [character, setCharacter] = useState<Character | null>(null)

  // Basic info
  const [name, setName] = useState('')
  const [personalityPrompt, setPersonalityPrompt] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')

  // Body params
  const [bodyParams, setBodyParams] = useState<BodyParams>(DEFAULT_BODY_PARAMS)
  const [uploadingOutfit, setUploadingOutfit] = useState(false)

  // Debounce ref
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function updateBody<T extends keyof BodyParams>(key: T, value: BodyParams[T]) {
    setBodyParams((prev) => ({ ...prev, [key]: value }))
  }

  // ── Auto-save debounce ──
  const doSave = useCallback(async () => {
    if (!name.trim() || !personalityPrompt.trim()) return

    setSaving(false)
    setStatus('saving')

    try {
      const generatedVisual = bodyParamsToVisualTemplate(bodyParams)

      const res = await fetch(`/api/characters/${characterId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          personality_prompt: personalityPrompt.trim(),
          avatar_url: avatarUrl.trim() || null,
          body_params: bodyParams,
          visual_template: generatedVisual,
        }),
      })

      if (!res.ok) throw new Error('儲存失敗')
      setStatus('saved')
    } catch {
      setStatus('unsaved')
    } finally {
      setSaving(false)
    }
  }, [name, personalityPrompt, avatarUrl, bodyParams, characterId])

  // Trigger debounce on any field change
  useEffect(() => {
    if (loading) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setStatus('unsaved')
    debounceRef.current = setTimeout(doSave, 1500)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [name, personalityPrompt, avatarUrl, bodyParams, loading, doSave])

  // ── Avatar upload ──
  async function handleAvatarUpload(file: File) {
    if (!file) return
      setUploading(true)
    setError(null)
    try {
      const reader = new FileReader()
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(new Error('Failed to read file'))
        reader.readAsDataURL(file)
      })
      const res = await fetch('/api/upload/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '上傳失敗')
      setAvatarUrl(data.url)
    } catch (err: any) {
      console.error('Avatar upload error:', err.message)
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleRemoveAvatar() {
    setAvatarUrl('')
  }

  // ── Outfit reference upload ──
  async function handleOutfitUpload(file: File) {
    if (!file) return
    setUploadingOutfit(true)
    setError(null)
    try {
      const reader = new FileReader()
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(new Error('Failed to read file'))
        reader.readAsDataURL(file)
      })
      const res = await fetch('/api/upload/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '上傳失敗')
      updateBody('outfit_ref_url', data.url)
    } catch (err: any) {
      console.error('Outfit upload error:', err.message)
      setError(err.message)
    } finally {
      setUploadingOutfit(false)
    }
  }

  async function handleRemoveOutfit() {
    updateBody('outfit_ref_url', undefined)
  }

  // ── Load character ──
  useEffect(() => {
    async function fetchCharacter() {
      try {
        const res = await fetch(`/api/characters/${characterId}`)
        if (!res.ok) {
          if (res.status === 401) { router.push('/login'); return }
          if (res.status === 404) { router.push('/'); return }
          throw new Error('Failed to load character')
        }
        const data: Character = await res.json()
        setCharacter(data)
        setName(data.name)
        setPersonalityPrompt(data.personality_prompt)
        setAvatarUrl(data.avatar_url ?? '')
        setBodyParams({ ...DEFAULT_BODY_PARAMS, ...data.body_params })
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchCharacter()
  }, [characterId, router])

  // ── Manual save ──
  async function handleManualSave() {
    if (saving) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    await doSave()
  }

  // ── Loading ──
  if (loading) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-2xl px-4 py-8">
          <Skeleton className="mb-6 h-8 w-32" />
          <Skeleton className="mb-4 h-40 w-full rounded-xl" />
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      </AppLayout>
    )
  }

  if (!character) return null

  const previewSummary = buildPreviewSummary(bodyParams)

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="text-zinc-400"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-white">🎀 角色設定</h1>
            <p className="text-xs text-zinc-500">
              編輯「{character.name}」的各項設定
            </p>
          </div>
        </div>

        <div className="space-y-5">
          {/* ── Live Preview Card ── */}
          <Card className="border-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-purple-600 text-lg font-bold text-white shadow-lg shadow-pink-500/20">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={name || '角色'}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    name.charAt(0).toUpperCase() || '?'
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold text-white">
                  {name || '角色名稱'}
                </h3>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-pink-400">
                  <Sparkles className="h-3 w-3" />
                  {previewSummary}
                </p>
                <p className="mt-1 text-[10px] text-zinc-600 leading-relaxed line-clamp-1">
                  {bodyParamsToVisualTemplate(bodyParams)}
                </p>
              </div>
            </div>
          </Card>

          {/* ── Basic Info ── */}
          <Card className="border-zinc-800 bg-zinc-900/50 p-5">
            <h2 className="mb-4 text-sm font-semibold text-white">基本資料</h2>
            <div className="space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400">角色名稱</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如：小艾"
                  className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500"
                />
              </div>

              {/* Personality */}
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400">個性設定</label>
                <textarea
                  value={personalityPrompt}
                  onChange={(e) => setPersonalityPrompt(e.target.value)}
                  placeholder="描述角色的個性、語氣、說話方式..."
                  rows={4}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-ring focus:ring-3 focus:ring-ring/50 outline-none resize-none"
                />
              </div>

              {/* Avatar upload */}
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400">角色外貌參考圖</label>
                <div className="flex items-start gap-4">
                  <div className="shrink-0">
                    {avatarUrl ? (
                      <div className="relative inline-block">
                        <img
                          src={avatarUrl}
                          alt="角色參考圖"
                          className="h-24 w-24 rounded-xl border border-zinc-700 object-cover"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-500"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex h-24 w-24 items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-800/50">
                        <ImageIcon className="h-6 w-6 text-zinc-600" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-zinc-700">
                      {uploading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                      {uploading ? '上傳中...' : '上傳圖片'}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        disabled={uploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleAvatarUpload(file)
                          e.target.value = ''
                        }}
                      />
                    </label>
                    <p className="mt-1.5 text-[11px] text-zinc-600">支援 PNG、JPEG、WebP</p>
                  </div>
                </div>
                {error && (
                  <p className="mt-2 rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-400">
                    {error}
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* ── Appearance ── */}
          <Card className="border-zinc-800 bg-zinc-900/50 p-5">
            <h2 className="mb-4 text-sm font-semibold text-white">外觀設定</h2>
            <div className="space-y-5">
              {/* Hair color */}
              <div className="space-y-2">
                <div className="text-xs text-zinc-400">💇 髮色</div>
                <ButtonGroup
                  options={HAIR_COLOR_OPTIONS}
                  value={bodyParams.hair_color}
                  onChange={(v) => updateBody('hair_color', v)}
                  size="xs"
                />
                <input
                  type="text"
                  value={bodyParams.hair_color}
                  onChange={(e) => updateBody('hair_color', e.target.value)}
                  placeholder="或自訂輸入..."
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-pink-500"
                />
              </div>

              {/* Hair style */}
              <div className="space-y-2">
                <div className="text-xs text-zinc-400">💇 髮型</div>
                <ButtonGroup
                  options={HAIR_STYLE_OPTIONS}
                  value={bodyParams.hair_style}
                  onChange={(v) => updateBody('hair_style', v)}
                  size="xs"
                />
                <input
                  type="text"
                  value={bodyParams.hair_style}
                  onChange={(e) => updateBody('hair_style', e.target.value)}
                  placeholder="或自訂輸入..."
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-pink-500"
                />
              </div>

              {/* Style */}
              <div className="space-y-2">
                <div className="text-xs text-zinc-400">🎭 風格</div>
                <ButtonGroup
                  options={STYLE_OPTIONS}
                  value={bodyParams.style}
                  onChange={(v) => updateBody('style', v)}
                  size="xs"
                />
                {(() => {
                  const s = STYLE_OPTIONS.find((s) => s.value === bodyParams.style)
                  return s ? (
                    <p className="text-[11px] text-zinc-500 mt-1">
                      {s.description}
                    </p>
                  ) : null
                })()}
              </div>

              {/* Outfit reference */}
              <div className="space-y-2">
                <div className="text-xs text-zinc-400">👗 服裝參考圖</div>
                <div className="flex items-start gap-4">
                  <div className="shrink-0">
                    {bodyParams.outfit_ref_url ? (
                      <div className="relative inline-block">
                        <img
                          src={bodyParams.outfit_ref_url}
                          alt="服裝參考圖"
                          className="h-20 w-20 rounded-xl border border-zinc-700 object-cover"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveOutfit}
                          className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-500"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-800/50">
                        <ImageIcon className="h-5 w-5 text-zinc-600" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-zinc-700">
                      {uploadingOutfit ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                      {uploadingOutfit ? '上傳中...' : '上傳圖片'}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        disabled={uploadingOutfit}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleOutfitUpload(file)
                          e.target.value = ''
                        }}
                      />
                    </label>
                    <p className="mt-1 text-[11px] text-zinc-600">
                      作為角色穿著的參考，與外貌參考圖同時使用
                    </p>
                  </div>
                </div>
              </div>

              {/* Age */}
              <div className="space-y-2">
                <div className="text-xs text-zinc-400">🎂 年紀</div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={18}
                    max={60}
                    value={bodyParams.age}
                    onChange={(e) => updateBody('age', Number(e.target.value))}
                    className="h-1.5 w-full max-w-40 cursor-pointer appearance-none rounded-full bg-zinc-700 accent-pink-500"
                  />
                  <span className="min-w-6 text-center text-sm font-medium text-white">
                    {bodyParams.age}
                  </span>
                </div>
              </div>

              {/* ── Body details (collapsible) ── */}
              <CollapsibleSection title="📏 身材細節（進階）">
                <div className="space-y-4 pl-1">
                  {/* Height */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] text-zinc-500">身高</span>
                    <ButtonGroup
                      options={HEIGHT_OPTIONS}
                      value={bodyParams.height}
                      onChange={(v) => updateBody('height', v)}
                      size="xs"
                    />
                  </div>

                  {/* Body type */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] text-zinc-500">體型</span>
                    <ButtonGroup
                      options={BODY_TYPE_OPTIONS}
                      value={bodyParams.body_type}
                      onChange={(v) => updateBody('body_type', v)}
                      size="xs"
                    />
                  </div>

                  {/* Bust */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] text-zinc-500">🍒 胸圍</span>
                    <ButtonGroup
                      options={BUST_OPTIONS}
                      value={bodyParams.bust}
                      onChange={(v) => updateBody('bust', v)}
                      size="xs"
                    />
                  </div>

                  {/* Waist */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] text-zinc-500">🧵 腰圍</span>
                    <ButtonGroup
                      options={WAIST_OPTIONS}
                      value={bodyParams.waist}
                      onChange={(v) => updateBody('waist', v)}
                      size="xs"
                    />
                  </div>

                  {/* Hips */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] text-zinc-500">🍑 臀圍</span>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] text-zinc-600">寬度</span>
                        <ButtonGroup
                          options={HIP_WIDTH_OPTIONS}
                          value={bodyParams.hip_width}
                          onChange={(v) => updateBody('hip_width', v)}
                          size="xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-zinc-600">形狀</span>
                        <ButtonGroup
                          options={HIP_SHAPE_OPTIONS}
                          value={bodyParams.hip_shape}
                          onChange={(v) => updateBody('hip_shape', v)}
                          size="xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CollapsibleSection>
            </div>
          </Card>

          {/* ── Danger Zone ── */}
          <Card className="border-red-900/50 bg-red-950/20 p-5">
            <h2 className="mb-3 text-sm font-semibold text-red-400">⚠️ 危險區域</h2>
            <Button
              variant="outline"
              className="gap-2 border-red-800 text-red-400 hover:bg-red-900/30 hover:text-red-300"
              onClick={async () => {
                if (!confirm('確定要清除所有聊天記錄嗎？此操作無法復原。')) return
                await fetch(`/api/chats?character_id=${characterId}`, { method: 'DELETE' })
              }}
            >
              🗑️ 清除所有聊天記錄
            </Button>
          </Card>
        </div>

        {/* ── Save bar ── */}
        <div className="sticky bottom-0 mt-5 -mx-4 border-t border-zinc-800 bg-zinc-950/95 px-4 py-3 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            {/* Status */}
            <div className="flex items-center gap-2">
              {error && <p className="text-xs text-red-400">{error}</p>}
              {status === 'saving' && (
                <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  自動儲存中...
                </span>
              )}
              {status === 'saved' && (
                <span className="text-xs text-green-500">✓ 已自動儲存</span>
              )}
              {status === 'unsaved' && (
                <span className="text-xs text-amber-400">● 未儲存</span>
              )}
            </div>

            <Button
              onClick={handleManualSave}
              disabled={saving || status === 'saved'}
              size="sm"
              className="gap-1.5 bg-pink-600 text-white hover:bg-pink-700 disabled:opacity-50"
            >
              {status === 'saving' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              手動儲存
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
