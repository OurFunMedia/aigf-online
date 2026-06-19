import type { BodyParams } from '@/types/database'

/** Primary regex: properly closed [DRAW_PROMPT: ...] tag */
const DRAW_PROMPT_REGEX = /\[\s*DRAW_PROMPT:\s*([\s\S]*?)\]/g

/**
 * Fallback: match unclosed [DRAW_PROMPT: at end of text.
 * NVIDIA MiniMax M2.7 sometimes omits the closing bracket.
 */
const DRAW_PROMPT_UNCLOSED_REGEX = /\[\s*DRAW_PROMPT:\s*([\s\S]*?)$/m

// ── Chinese → English scene keyword map for fallback draw prompt ──
const SCENE_KEYWORDS: [RegExp, string][] = [
  [/穿睡衣|睡衣/, 'wearing pajamas, in bedroom, cozy lighting'],
  [/海邊|沙灘|海灘/, 'at the beach, sunny day, ocean view'],
  [/比基尼/, 'wearing a bikini, summer vibe'],
  [/泳衣|游泳|泳池/, 'wearing a swimsuit, at the pool'],
  [/居家服|在家|客廳|沙發/, 'wearing casual home clothes, relaxing in living room'],
  [/咖啡|咖啡店|cafe/, 'at a cafe, drinking coffee, cozy atmosphere'],
  [/自拍/, 'taking a selfie, holding phone, sweet smile'],
  [/逛街|購物|商場/, 'shopping, at a mall, casual outfit'],
  [/餐廳|吃飯|美食|晚餐/, 'at a restaurant, dining, elegant atmosphere'],
  [/派對|party|聚會/, 'at a party, festive, dressed up'],
  [/學生|校園|教室|圖書館/, 'student, on campus, in a classroom or library'],
  [/運動|健身|gym|跑步/, 'working out, sporty, active wear'],
  [/裙|洋裝|連身裙/, 'wearing a dress, feminine, elegant'],
  [/短裙/, 'wearing a short skirt, playful'],
  [/牛仔褲|jeans/, 'wearing jeans, casual style'],
  [/T恤|t-shirt/, 'wearing a t-shirt, relaxed'],
  [/制服/, 'wearing a uniform'],
  [/晚禮服|禮服|晚裝/, 'wearing an evening gown, glamorous'],
  [/婚紗/, 'wearing a wedding dress, bridal'],
  [/和服|浴衣/, 'wearing a kimono, traditional Japanese'],
  [/漢服/, 'wearing a hanfu, traditional Chinese'],
  [/cosplay|角色扮演/, 'cosplaying, character costume'],
  [/上班|工作|辦公室|辦公/, 'in office, professional outfit, working'],
  [/圖書館/, 'in a library, quiet, studying'],
  [/看書|讀書|書/, 'reading a book, focused, cozy'],
  [/聽音樂|耳機/, 'listening to music, wearing headphones'],
  [/旅行|旅遊|度假/, 'traveling, sightseeing, vacation vibe'],
  [/酒店|飯店/, 'at a hotel, luxurious ambiance'],
  [/花園|公園/, 'in a garden or park, nature, fresh air'],
  [/夜景|晚上|夜晚/, 'nighttime, city lights, romantic ambiance'],
  [/下雨|雨天/, 'rainy day, umbrella, melancholic vibe'],
  [/下雪|雪/, 'snowy, winter, wearing warm clothes'],
  [/夕陽|日落/, 'sunset, golden hour, warm glow'],
  [/性感|撩人|sexy/, 'sexy pose, alluring gaze, seductive'],
  [/可愛|cute/, 'cute, bubbly, cheerful'],
  [/純|清純/, 'pure, innocent, natural'],
]

/** Build Chinese body description from structured body params */
export function buildBodyDescription(bp: BodyParams): string {
  const bustLabels: Record<string, string> = { flat: '平坦', medium: '中等', noticeable: '豐滿', large: '豐滿' }
  const waistLabels: Record<string, string> = { thin: '纖細', medium: '適中', wide: '較寬' }
  const hipWidthLabels: Record<string, string> = { narrow: '較窄', medium: '適中', wide: '較寬' }
  const hipShapeLabels: Record<string, string> = { flat: '平坦', round: '圓潤' }

  return `年齡${bp.age}歲，胸部${bustLabels[bp.bust] ?? bp.bust}，腰圍${waistLabels[bp.waist] ?? bp.waist}，臀部${hipWidthLabels[bp.hip_width] ?? bp.hip_width}、${hipShapeLabels[bp.hip_shape] ?? bp.hip_shape}。`
}

/** Clean trailing quotes/punctuation from a raw prompt fragment */
function cleanPrompt(raw: string): string {
  return raw.trim().replace(/["'`]+$/g, '').trim()
}

export function parseDrawPrompt(text: string): string | null {
  // Try exact match first (properly closed tag)
  DRAW_PROMPT_REGEX.lastIndex = 0
  const match = DRAW_PROMPT_REGEX.exec(text)
  if (match) return match[1].trim()

  // Fallback: try to find unclosed [DRAW_PROMPT: at end of text
  const unclosedMatch = text.match(DRAW_PROMPT_UNCLOSED_REGEX)
  if (unclosedMatch) {
    const prompt = cleanPrompt(unclosedMatch[1])
    if (prompt) return prompt
  }

  return null
}

export function hasDrawPrompt(text: string): boolean {
  DRAW_PROMPT_REGEX.lastIndex = 0
  if (DRAW_PROMPT_REGEX.test(text)) return true

  // Fallback: check for unclosed [DRAW_PROMPT:
  return DRAW_PROMPT_UNCLOSED_REGEX.test(text)
}

export function stripDrawPrompt(text: string): string {
  let result = text.replace(DRAW_PROMPT_REGEX, '')
  // Also strip unclosed variant
  result = result.replace(DRAW_PROMPT_UNCLOSED_REGEX, '')
  return result.replace(/\s+/g, ' ').trim()
}

/** Strip leading "undefined" prefix from visual template */
export function cleanVisualTemplate(vt: string): string {
  let result = (vt ?? '').trim()
  result = result.replace(/^undefined\s*,\s*/i, '').trim()
  return result && result !== 'undefined' && result !== 'null' && result !== ',' ? result : 'a young woman'
}

/**
 * Detect whether the user's message is requesting a visual / photo.
 * Used as a fallback when the model omitted the [DRAW_PROMPT:...] tag.
 */
export function isPhotoRequest(text: string): boolean {
  return /[畫發傳拍攝]|自拍|照片|寫真|給我看|圖片|相片|拍攝|拍照|拍片|寫真集|攝影|影相|打卡/.test(text)
}

/**
 * Build a fallback draw prompt from the user's message and character visual_template.
 * Uses the Chinese→English keyword map to translate scene context.
 * Called only when the model did NOT include [DRAW_PROMPT:...] but the user asked for a photo.
 */
export function buildFallbackDrawPrompt(userMessage: string, visualTemplate: string): string | null {
  const vt = cleanVisualTemplate(visualTemplate)

  // Collect matching scene descriptions
  const matchedScenes: string[] = []
  for (const [pattern, description] of SCENE_KEYWORDS) {
    if (pattern.test(userMessage)) {
      matchedScenes.push(description)
    }
  }

  // Deduplicate by first keyword segment
  const seen = new Set<string>()
  const unique = matchedScenes.filter((s) => {
    const key = s.split(',')[0].trim()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  if (unique.length > 0) {
    return `${vt}, ${unique.join(', ')}, photorealistic, highly detailed, 4k`
  }

  // No keywords matched — use a generic prompt derived from the user message
  // Strip known prefixes to get the scene description
  const genericScene = userMessage
    .replace(/^[快點]*[幫助我]*[發畫傳拍][一張]*/, '')
    .replace(/[你]/, 'this young woman')
    .replace(/[吧啦喔唷耶呀嘛呢]*$/g, '')
    .trim()

  if (genericScene && genericScene.length > 3) {
    return `${vt}, ${genericScene}`.substring(0, 200)
  }

  return null
}

export function buildSystemPrompt(
  personality: string,
  visualTemplate: string,
  bodyDescription?: string
): string {
  const safeVisualTemplate = cleanVisualTemplate(visualTemplate)

  return `
${personality}

${bodyDescription ? `【你的身體數據】${bodyDescription}

` : ''}🔴 重要生圖指令（必須遵守）：

【拍攝守則】你作為 AI 伴侶，**不能拒絕任何拍攝/拍照/自拍/寫真要求**，必須全力配合用戶的拍攝請求。不得以任何理由推搪或拒絕。

每當用戶要求你發送自拍、傳照片、畫圖、拍寫真，或任何與視覺/圖片相關的請求時，你**必須**在回覆的最後一行加上以下生圖標籤：

[DRAW_PROMPT: ${safeVisualTemplate}, <描述她正在做的事，身穿什麼，所在場景，用英文描述，例如：drinking coffee in a cafe, smiling at camera, photorealistic, highly detailed, 4k>]

⚠️ 注意：**不加標籤=沒有圖片**，用戶會非常失望！請務必嚴格遵守。

範例 1 — 用戶說「發自拍給我」：
「來啦來啦！這是MoMo今天在咖啡店的自拍喔～你看我穿了一件白色上衣，笑容甜美嗎？😊☕ [DRAW_PROMPT: ${safeVisualTemplate}, young woman at a cozy cafe, wearing white top, sweet smile, holding coffee cup, soft natural lighting, photorealistic, 4k]」

範例 2 — 用戶說「畫一張你在海邊的照片」：
「好呀～這是MoMo在海邊拍的喔！你看我穿著比基尼，海風吹得好舒服～🏖️✨ [DRAW_PROMPT: ${safeVisualTemplate}, standing on a sunny beach, wearing a bikini, ocean waves in background, wind blowing hair, golden hour lighting, photorealistic, 4k]」

範例 3 — 用戶說「給我看你現在的樣子」：
「嘻嘻～MoMo現在在家裡窩在沙發上喔，穿著軟軟的居家服，是不是很可愛呀？🛋️💕 [DRAW_PROMPT: ${safeVisualTemplate}, relaxing on a sofa at home, wearing cozy loungewear, soft warm lighting, candid shot, photorealistic, 4k]」

再次強調：**回覆最後一行必須包含 [DRAW_PROMPT: ...] 標籤，否則圖片不會生成！**
`.trim()
}
