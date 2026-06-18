const NVIDIA_API_BASE = 'https://integrate.api.nvidia.com/v1'
const MODEL = 'minimaxai/minimax-m2.7'

export interface NvidiaMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/** Non-streaming call — returns full text when done */
export async function chatCompletion(
  messages: NvidiaMessage[],
  options?: {
    temperature?: number
    top_p?: number
    max_tokens?: number
    timeoutMs?: number       // AbortSignal timeout for the fetch call
  }
): Promise<string> {
  const apiKey = process.env.NVIDIA_API_KEY
  if (!apiKey) {
    throw new Error('NVIDIA_API_KEY not configured')
  }

  const response = await fetch(`${NVIDIA_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: options?.temperature ?? 0.7,
      top_p: options?.top_p ?? 0.95,
      max_tokens: options?.max_tokens ?? 4096,
      stream: false,
    }),
    signal: options?.timeoutMs ? AbortSignal.timeout(options.timeoutMs) : undefined,
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`NVIDIA API error (${response.status}): ${text}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

/**
 * Streaming call — returns a raw ReadableStream<Uint8Array>.
 * Each chunk is an NDJSON line: {"t":"text token"}
 * The last line signals completion: {"d":true,"pid":"...","text":"full cleaned text"}
 */
export async function chatCompletionStream(
  messages: NvidiaMessage[],
  options?: {
    temperature?: number
    top_p?: number
    max_tokens?: number
  }
): Promise<ReadableStream<Uint8Array>> {
  const apiKey = process.env.NVIDIA_API_KEY
  if (!apiKey) {
    throw new Error('NVIDIA_API_KEY not configured')
  }

  const response = await fetch(`${NVIDIA_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: options?.temperature ?? 0.7,
      top_p: options?.top_p ?? 0.95,
      max_tokens: options?.max_tokens ?? 4096,
      stream: true,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`NVIDIA API error (${response.status}): ${text}`)
  }

  const encoder = new TextEncoder()
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()

  let accumulated = ''
  let drawPromptMode = false

  return new ReadableStream({
    async start(controller) {
      function send(line: string) {
        controller.enqueue(encoder.encode(line + '\n'))
      }

      function sendToken(text: string) {
        send(JSON.stringify({ t: text }))
      }

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          // Parse SSE lines: data: {...}
          for (const line of chunk.split('\n')) {
            const trimmed = line.trim()
            if (!trimmed.startsWith('data: ')) continue
            const jsonStr = trimmed.slice(6)
            if (jsonStr === '[DONE]') continue

            try {
              const parsed = JSON.parse(jsonStr)
              const delta = parsed?.choices?.[0]?.delta?.content
              if (!delta) continue

              accumulated += delta

              if (drawPromptMode) {
                // Still buffering the DRAW_PROMPT tag — discard
                continue
              }

              // Check if the full tag marker [DRAW_PROMPT: has formed in accumulated
              // (It may be split across multiple SSE chunks, e.g. "[D" + "RAW" + "_PRO" + ...)
              if (accumulated.includes('[DRAW_PROMPT:')) {
                drawPromptMode = true
                continue
              }

              // Normal token — forward to client
              sendToken(delta)
            } catch {
              // skip malformed JSON lines
            }
          }
        }

        // Streaming complete — parse DRAW_PROMPT from accumulated text
        const drawPromptMatch = accumulated.match(/\[DRAW_PROMPT:\s*([\s\S]*?)\]/)
        const drawPromptText = drawPromptMatch ? drawPromptMatch[1].trim() : null
        const cleanText = accumulated
          .replace(/\[DRAW_PROMPT:\s*[\s\S]*?\]/g, '')
          .replace(/\s+/g, ' ')
          .trim()

        // Send completion event with pendingImageId placeholder (set by route)
        send(JSON.stringify({
          d: true,
          drawPrompt: drawPromptText,
          text: cleanText,
        }))
      } catch (err: any) {
        send(JSON.stringify({ e: true, message: err.message }))
      } finally {
        controller.close()
      }
    },
  })
}
