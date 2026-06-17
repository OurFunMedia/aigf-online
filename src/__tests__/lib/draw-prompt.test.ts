import { describe, it, expect } from 'vitest'
import { parseDrawPrompt, hasDrawPrompt, stripDrawPrompt, buildSystemPrompt } from '@/lib/draw-prompt'

describe('parseDrawPrompt', () => {
  it('extracts prompt from text with DRAW_PROMPT tag', () => {
    const text = 'Hello [DRAW_PROMPT: 1girl, silver hair, cafe] world'
    expect(parseDrawPrompt(text)).toBe('1girl, silver hair, cafe')
  })

  it('returns null when no DRAW_PROMPT tag', () => {
    expect(parseDrawPrompt('Just a normal message')).toBeNull()
  })

  it('extracts multi-line prompts', () => {
    const text = `Hi [DRAW_PROMPT: 1girl,
silver hair,
smiling at camera] there`
    expect(parseDrawPrompt(text)).toBe('1girl,\nsilver hair,\nsmiling at camera')
  })

  it('returns null for empty string', () => {
    expect(parseDrawPrompt('')).toBeNull()
  })
})

describe('hasDrawPrompt', () => {
  it('returns true when tag present', () => {
    expect(hasDrawPrompt('x [DRAW_PROMPT: test] y')).toBe(true)
  })

  it('returns false when no tag', () => {
    expect(hasDrawPrompt('just text')).toBe(false)
  })
})

describe('stripDrawPrompt', () => {
  it('removes DRAW_PROMPT tag from text', () => {
    const result = stripDrawPrompt('Hello [DRAW_PROMPT: test] world')
    expect(result).toBe('Hello world')
  })

  it('returns same text when no tag', () => {
    const text = 'Just a message'
    expect(stripDrawPrompt(text)).toBe(text)
  })
})

describe('buildSystemPrompt', () => {
  const VISUAL_TEMPLATE = 'black long hair, cute style, 22 years old, medium bust, thin waist, round hips'
  const PERSONALITY = '你是小艾，一個可愛溫柔的女生。'

  it('includes 【你的身體數據】 section when body description provided', () => {
    const result = buildSystemPrompt(PERSONALITY, VISUAL_TEMPLATE, '年齡22歲，胸部中等，腰圍纖細，臀部適中、圓潤。')
    expect(result).toContain('【你的身體數據】')
    expect(result).toContain('年齡22歲')
    expect(result).toContain('胸部中等')
    expect(result).toContain('腰圍纖細')
  })

  it('omits 【你的身體數據】 when body description is not provided', () => {
    const result = buildSystemPrompt(PERSONALITY, VISUAL_TEMPLATE)
    expect(result).not.toContain('【你的身體數據】')
  })

  it('includes 【你的身體數據】 before 【重要生圖指令】', () => {
    const result = buildSystemPrompt(PERSONALITY, VISUAL_TEMPLATE, '年齡22歲，胸部中等，腰圍纖細，臀部適中、圓潤。')
    const bodyIdx = result.indexOf('【你的身體數據】')
    const drawPromptIdx = result.indexOf('【重要生圖指令】')
    expect(bodyIdx).toBeGreaterThan(-1)
    expect(drawPromptIdx).toBeGreaterThan(-1)
    expect(bodyIdx).toBeLessThan(drawPromptIdx)
  })

  it('includes visual template inside DRAW_PROMPT examples', () => {
    const result = buildSystemPrompt(PERSONALITY, VISUAL_TEMPLATE)
    expect(result).toContain(`[DRAW_PROMPT: ${VISUAL_TEMPLATE}, <`)
    expect(result).toContain(`[DRAW_PROMPT: ${VISUAL_TEMPLATE}, sitting`)
  })

  it('includes personality text', () => {
    const result = buildSystemPrompt(PERSONALITY, VISUAL_TEMPLATE)
    expect(result).toContain(PERSONALITY)
  })

  it('body measurement keywords appear in the prompt', () => {
    const result = buildSystemPrompt(PERSONALITY, VISUAL_TEMPLATE)
    expect(result).toContain('medium bust')
    expect(result).toContain('thin waist')
    expect(result).toContain('round hips')
  })
})
