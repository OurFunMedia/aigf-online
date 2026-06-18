const DRAW_PROMPT_REGEX = /\[DRAW_PROMPT:\s*([\s\S]*?)\]/g
import type { BodyParams } from '@/types/database'

/** Build Chinese body description from structured body params */
export function buildBodyDescription(bp: BodyParams): string {
  const bustLabels: Record<string, string> = { flat: '平坦', medium: '中等', noticeable: '豐滿', large: '豐滿' }
  const waistLabels: Record<string, string> = { thin: '纖細', medium: '適中', wide: '較寬' }
  const hipWidthLabels: Record<string, string> = { narrow: '較窄', medium: '適中', wide: '較寬' }
  const hipShapeLabels: Record<string, string> = { flat: '平坦', round: '圓潤' }

  return `年齡${bp.age}歲，胸部${bustLabels[bp.bust] ?? bp.bust}，腰圍${waistLabels[bp.waist] ?? bp.waist}，臀部${hipWidthLabels[bp.hip_width] ?? bp.hip_width}、${hipShapeLabels[bp.hip_shape] ?? bp.hip_shape}。`
}

export function parseDrawPrompt(text: string): string | null {
  const match = DRAW_PROMPT_REGEX.exec(text)
  return match ? match[1].trim() : null
}

export function hasDrawPrompt(text: string): boolean {
  DRAW_PROMPT_REGEX.lastIndex = 0
  return DRAW_PROMPT_REGEX.test(text)
}

export function stripDrawPrompt(text: string): string {
  return text.replace(DRAW_PROMPT_REGEX, '').replace(/\s+/g, ' ').trim()
}

export function buildSystemPrompt(
  personality: string,
  visualTemplate: string,
  bodyDescription?: string
): string {
  // Guard against empty/null/"undefined" visual template that could introduce
  // the literal string "undefined" into the generated prompt
  let vt = (visualTemplate ?? '').trim()
  // Strip leading "undefined," prefixes (e.g. "undefined, cute and lively style" → "cute and lively style")
  vt = vt.replace(/^undefined\s*,\s*/i, '').trim()
  const safeVisualTemplate = vt && vt !== 'undefined' && vt !== 'null' && vt !== ',' ? vt : 'a young woman'

  return `
${personality}

${bodyDescription ? `【你的身體數據】${bodyDescription}

` : ''}【重要生圖指令】：
如果用戶在對話中要求你「發送自拍」、「傳照片」、「畫圖」或「給你看你現在的樣子」，請在回覆的最後一行，**嚴格且必須**夾帶以下標籤來觸發生圖引擎：

[DRAW_PROMPT: ${safeVisualTemplate}, <根據對話情境描述她正在做的事，例如：drinking coffee in a cafe, smiling at camera, photorealistic, highly detailed, 4k>]

範例：
「親愛的，這是我現在在圖書館的自拍喔，有沒有想我？[DRAW_PROMPT: ${safeVisualTemplate}, sitting in a sunny library, holding a textbook, soft smile, cinematic lighting, 4k]」
`.trim()
}
