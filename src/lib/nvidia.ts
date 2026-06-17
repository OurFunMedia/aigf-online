const NVIDIA_API_BASE = 'https://integrate.api.nvidia.com/v1'
const MODEL = 'minimaxai/minimax-m2.7'

export interface NvidiaMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function chatCompletion(
  messages: NvidiaMessage[],
  options?: {
    temperature?: number
    top_p?: number
    max_tokens?: number
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
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`NVIDIA API error (${response.status}): ${text}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}
