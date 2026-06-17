'use client'

import { useState, useRef } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Heart,
  Loader2,
  Upload,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog'
import type { BodyParams } from '@/types/database'

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

const STYLE_OPTIONS: { value: BodyParams['style']; label: string; description: string }[] = [
  { value: 'pure', label: '清純', description: '清新脫俗、純真無瑕' },
  { value: 'sexy', label: '性感', description: '嫵媚動人、成熟魅力' },
  { value: 'cute', label: '可愛', description: '活潑俏皮、甜美笑容，充滿青春活力' },
  { value: 'elegant', label: '優雅', description: '高貴典雅、氣質出眾' },
  { value: 'girl-next-door', label: '鄰家', description: '親切自然、平易近人' },
]

const HAIR_COLOR_OPTIONS: { value: BodyParams['hair_color']; label: string }[] = [
  { value: 'black', label: '黑色' },
  { value: 'brown', label: '棕色' },
  { value: 'blonde', label: '金色' },
  { value: 'red', label: '紅色' },
  { value: 'pink', label: '粉色' },
  { value: 'silver', label: '銀色' },
  { value: 'blue', label: '藍色' },
  { value: 'purple', label: '紫色' },
  { value: 'white', label: '白色' },
]

const HAIR_STYLE_OPTIONS: { value: BodyParams['hair_style']; label: string }[] = [
  { value: 'long-straight', label: '長直髮' },
  { value: 'long-curly', label: '長捲髮' },
  { value: 'medium', label: '中長髮' },
  { value: 'short-straight', label: '短直髮' },
  { value: 'short-curly', label: '短捲髮' },
  { value: 'ponytail', label: '馬尾' },
  { value: 'twin-tails', label: '雙馬尾' },
  { value: 'bob', label: '鮑伯頭' },
  { value: 'braid', label: '辮子' },
  { value: 'bun', label: '包包頭' },
]

// ── Helpers ──

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
    parts.push(p.height === 'slim' ? 'slim figure' : 'tall figure')
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

  const bustLabels: Record<string, string> = {
    flat: 'flat chest', medium: 'medium bust', noticeable: 'noticeable bust', large: 'large bust',
  }
  parts.push(bustLabels[p.bust] ?? p.bust)

  const waistLabels: Record<string, string> = { thin: 'thin waist', medium: 'medium waist', wide: 'wide waist' }
  parts.push(waistLabels[p.waist] ?? p.waist)

  const hipWidthLabels: Record<string, string> = { narrow: 'narrow', medium: 'medium', wide: 'wide' }
  const hipShapeLabels: Record<string, string> = { flat: 'flat hips', round: 'round hips' }
  const hipWidth = hipWidthLabels[p.hip_width] ?? p.hip_width
  const hipShape = hipShapeLabels[p.hip_shape] ?? ''
  parts.push(hipWidth === 'medium' ? (hipShape || 'medium hips') : `${hipWidth} ${hipShape || 'hips'}`)

  return parts.join(', ')
}

function buildSummary(p: BodyParams): string {
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
    pure: '清純', sexy: '性感', cute: '可愛', elegant: '優雅', 'girl-next-door': '鄰家',
  }
  const bustLabels: Record<string, string> = { flat: '微乳', medium: '中胸', noticeable: '有料', large: '巨乳' }
  const waistLabels: Record<string, string> = { thin: '細腰', medium: '中腰', wide: '寬腰' }
  const hipWidthLabels: Record<string, string> = { narrow: '窄', medium: '中', wide: '寬' }
  const hipShapeLabels: Record<string, string> = { flat: '平臀', round: '翹臀' }

  const detail = `${bustLabels[p.bust]} · ${waistLabels[p.waist]} · ${hipWidthLabels[p.hip_width]}${hipShapeLabels[p.hip_shape]}`
  return `${hairColorLabels[p.hair_color]}${hairStyleLabels[p.hair_style]} · ${styleLabels[p.style]} · ${p.age}歲 · ${detail}`
}

const DEFAULT_BODY_PARAMS: BodyParams = {
  age: 22, height: 'medium', body_type: 'average',
  bust: 'medium', waist: 'medium', hip_width: 'medium', hip_shape: 'round',
  style: 'cute', hair_color: 'black', hair_style: 'long-straight',
}

// ── Reusable sub-components ──

function ButtonGroup<T extends string>({
  options, value, onChange, size = 'sm',
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
  title, defaultOpen = false, children,
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

// ── Props ──

interface CreateCharacterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: () => void
}

// ── Component ──

export function CreateCharacterDialog({ open, onOpenChange, onCreated }: CreateCharacterDialogProps) {
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  // Form fields
  const [name, setName] = useState('')
  const [personality, setPersonality] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [bodyParams, setBodyParams] = useState<BodyParams>(DEFAULT_BODY_PARAMS)
  const fileRef = useRef<HTMLInputElement>(null)

  const generatedTemplate = bodyParamsToVisualTemplate(bodyParams)

  function updateBody<T extends keyof BodyParams>(key: T, value: BodyParams[T]) {
    setBodyParams((prev) => ({ ...prev, [key]: value }))
  }

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
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleCreate() {
    if (!name.trim() || !personality.trim()) {
      setError('請填寫名稱與性格提示')
      return
    }

    setCreating(true)
    setError(null)

    try {
      const res = await fetch('/api/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          personality_prompt: personality.trim(),
          visual_template: generatedTemplate,
          body_params: bodyParams,
          avatar_url: avatarUrl || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '創建失敗')
      }

      // Reset form
      setName('')
      setPersonality('')
      setAvatarUrl('')
      setBodyParams(DEFAULT_BODY_PARAMS)
      onOpenChange(false)
      onCreated?.()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const isValid = name.trim() && personality.trim()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col bg-zinc-900 border-zinc-800 text-white sm:max-w-lg">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-lg text-white">創建 AI 伴侶</DialogTitle>
          <DialogDescription className="text-zinc-400 text-sm">
            設定角色名稱、性格與外觀，開始你們的專屬對話
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-5 overflow-y-auto pr-1">
          {/* ── Avatar ── */}
          <div className="flex flex-col items-center gap-3 py-2">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-pink-500 to-purple-600 text-2xl font-bold text-white shadow-lg shadow-pink-500/20">
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="h-full w-full rounded-full object-cover" />
              ) : name ? (
                name.charAt(0).toUpperCase()
              ) : (
                <Heart className="h-8 w-8 text-white/70" />
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="gap-1.5 border-zinc-700 text-xs text-zinc-400"
              >
                {uploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
                上傳頭像
              </Button>
              {avatarUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAvatarUrl('')}
                  className="text-xs text-zinc-500"
                >
                  <X className="mr-1 h-3 w-3" />
                  移除
                </Button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleAvatarUpload(file)
                e.target.value = ''
              }}
            />
          </div>

          {/* ── Basic info ── */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">角色名稱</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：小美"
                className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">性格與背景</label>
              <textarea
                value={personality}
                onChange={(e) => setPersonality(e.target.value)}
                placeholder="描述角色的性格、說話方式、背景故事⋯⋯"
                rows={3}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-ring focus:ring-3 focus:ring-ring/50 outline-none resize-none"
              />
            </div>
          </div>

          {/* ── Appearance ── */}
          <div>
            <h4 className="mb-3 text-xs font-medium text-zinc-300">外觀設定</h4>
            <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              {/* Age */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-zinc-500">年齡</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={18}
                    max={40}
                    value={bodyParams.age}
                    onChange={(e) => updateBody('age', Number(e.target.value))}
                    className="flex-1 accent-pink-500"
                  />
                  <span className="w-8 text-center text-sm font-medium text-zinc-200">{bodyParams.age}</span>
                </div>
              </div>

              {/* Hair */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-zinc-500">髮色</label>
                <ButtonGroup options={HAIR_COLOR_OPTIONS} value={bodyParams.hair_color} onChange={(v) => updateBody('hair_color', v)} size="xs" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] text-zinc-500">髮型</label>
                <ButtonGroup options={HAIR_STYLE_OPTIONS} value={bodyParams.hair_style} onChange={(v) => updateBody('hair_style', v)} size="xs" />
              </div>

              {/* Style */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-zinc-500">風格</label>
                <div className="flex flex-wrap gap-1.5">
                  {STYLE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateBody('style', opt.value)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                        bodyParams.style === opt.value
                          ? 'bg-pink-600 text-white shadow-sm'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                      }`}
                      title={opt.description}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Body shape */}
              <CollapsibleSection title="身材細節 (選填)" defaultOpen={false}>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-zinc-500">身高</label>
                    <ButtonGroup options={HEIGHT_OPTIONS} value={bodyParams.height} onChange={(v) => updateBody('height', v)} size="xs" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-zinc-500">體型</label>
                    <ButtonGroup options={BODY_TYPE_OPTIONS} value={bodyParams.body_type} onChange={(v) => updateBody('body_type', v)} size="xs" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-zinc-500">胸部</label>
                      <ButtonGroup options={BUST_OPTIONS} value={bodyParams.bust} onChange={(v) => updateBody('bust', v)} size="xs" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-zinc-500">腰圍</label>
                      <ButtonGroup options={WAIST_OPTIONS} value={bodyParams.waist} onChange={(v) => updateBody('waist', v)} size="xs" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-zinc-500">臀部</label>
                      <div className="space-y-1">
                        <ButtonGroup options={HIP_WIDTH_OPTIONS} value={bodyParams.hip_width} onChange={(v) => updateBody('hip_width', v)} size="xs" />
                        <ButtonGroup options={HIP_SHAPE_OPTIONS} value={bodyParams.hip_shape} onChange={(v) => updateBody('hip_shape', v)} size="xs" />
                      </div>
                    </div>
                  </div>
                </div>
              </CollapsibleSection>
            </div>
          </div>

          {/* ── Preview ── */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
            <p className="text-[11px] text-zinc-500 mb-1">產物預覽</p>
            <p className="text-xs text-zinc-300 leading-relaxed">{buildSummary(bodyParams)}</p>
            <p className="mt-1.5 text-[10px] text-zinc-600 leading-relaxed break-all">{generatedTemplate}</p>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-zinc-800 pt-4">
          <DialogClose
            render={<Button variant="ghost" className="text-zinc-400" />}
          >
            取消
          </DialogClose>
          <Button
            onClick={handleCreate}
            disabled={!isValid || creating}
            className="gap-2 bg-pink-600 text-white hover:bg-pink-700 disabled:opacity-50"
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Heart className="h-4 w-4" />
            )}
            創建伴侶
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
