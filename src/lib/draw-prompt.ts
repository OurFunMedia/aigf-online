const DRAW_PROMPT_REGEX = /\[DRAW_PROMPT:\s*([\s\S]*?)\]/g

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
