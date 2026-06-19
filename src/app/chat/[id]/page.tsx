'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Heart,
  ImageIcon,
  Loader2,
  Send,
  Sparkles,
  Trash2,
  User,
} from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { createBrowserSupabaseClient } from '@/lib/supabase-client'
import { buildBodyDescription } from '@/lib/draw-prompt'
import type { Character, Chat, ChatMessage, Image as ImageRecord } from '@/types/database'

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const characterId = params.id as string

  const [character, setCharacter] = useState<Character | null>(null)
  const [chat, setChat] = useState<Chat | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingTimestamp, setDeletingTimestamp] = useState<string | null>(null)
  const [typingContent, setTypingContent] = useState<Record<string, string>>({})
  const typingTimersRef = useRef<Record<string, NodeJS.Timeout>>({})
  const sessionStartTime = useRef<string>(new Date().toISOString())
  const [imageGenStatus, setImageGenStatus] = useState<Record<string, string>>({})
  const inputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollViewportRef = useRef<HTMLDivElement>(null)
  const userScrolledUpRef = useRef(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Auto-focus input after sending completes
  useEffect(() => {
    if (!sending) {
      inputRef.current?.focus()
    }
  }, [sending])

  // Scroll to bottom only if user hasn't manually scrolled up
  useEffect(() => {
    if (!userScrolledUpRef.current) {
      bottomRef.current?.scrollIntoView?.()
    }
  }, [messages, typingContent])

  // Track whether user has scrolled up from the bottom
  useEffect(() => {
    const el = scrollViewportRef.current
    if (!el) return

    const handleScroll = () => {
      const threshold = 100
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold
      userScrolledUpRef.current = !atBottom
    }

    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [])

  // Clean up poll + typing timers on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      Object.values(typingTimersRef.current).forEach(clearInterval)
    }
  }, [])

  // Typing animation: reveals text character by character for new messages
  useEffect(() => {
    const timers = typingTimersRef.current
    const sessionStart = sessionStartTime.current
    messages.forEach((msg) => {
      if (msg.role !== 'assistant' || !msg.content) return
      // Only animate messages received during this session, not history
      if (msg.timestamp <= sessionStart) {
        setTypingContent((prev) => ({ ...prev, [msg.timestamp]: msg.content }))
        return
      }
      if (typingContent[msg.timestamp] !== undefined) return // already handled
      if (timers[msg.timestamp]) return // timer already running
      if (msg.content.length < 3) {
        // Short messages: show immediately
        setTypingContent((prev) => ({ ...prev, [msg.timestamp]: msg.content }))
        return
      }

      let idx = 0
      const SPEED = 25 // ms per character
      timers[msg.timestamp] = setInterval(() => {
        idx++
        setTypingContent((prev) => ({ ...prev, [msg.timestamp]: msg.content.slice(0, idx) }))
        if (idx >= msg.content.length) {
          clearInterval(timers[msg.timestamp])
          delete timers[msg.timestamp]
        }
      }, SPEED)
    })
  }, [messages, typingContent])

  // Fetch character + existing chat on mount
  useEffect(() => {
    async function init() {
      try {
        const [charRes, chatRes] = await Promise.all([
          fetch(`/api/characters`),
          fetch(`/api/chats?character_id=${characterId}`),
        ])

        if (!charRes.ok || !chatRes.ok) {
          if (charRes.status === 401 || chatRes.status === 401) {
            router.push('/login')
            return
          }
          throw new Error('Failed to load')
        }

        const characters: Character[] = await charRes.json()
        const character = characters.find((c) => c.id === characterId) ?? null
        setCharacter(character)

        if (!character) {
          router.push('/')
          return
        }

        const chatData = await chatRes.json()
        const resolvedMessages: ChatMessage[] = chatData?.messages ?? []

        // Fetch completed images via API (uses server-side auth, avoids RLS issues)
        const imgRes = await fetch(`/api/images`)
        const allImages: any[] = imgRes.ok ? await imgRes.json() : []
        const completedImages = allImages.filter(
          (img: any) => img.character_id === characterId && img.status === 'completed'
        )
        const pendingImageMap = Object.fromEntries(
          completedImages.map((img: any) => [img.id, img])
        )

        // Step 1: Resolve messages with pending_image_id
        for (let i = 0; i < resolvedMessages.length; i++) {
          const msg = resolvedMessages[i]
          if (!msg.pending_image_id) continue
          const img = pendingImageMap[msg.pending_image_id]
          if (!img) continue
          resolvedMessages[i] = {
            ...msg,
            image_url: img.storage_url || undefined,
            pending_image_id: undefined,
          }
        }

        // Step 2: Fallback — if the last assistant message still has no image,
        // associate the most recent completed image (created after the message)
        const usedImageIds = new Set(
          resolvedMessages
            .filter((m) => m.image_url)
            .map((m) => m.image_url)
        )
        for (let i = resolvedMessages.length - 1; i >= 0; i--) {
          const msg = resolvedMessages[i]
          if (msg.role !== 'assistant') continue
          if (msg.image_url) continue // already has an image

          const msgTime = new Date(msg.timestamp).getTime()
          const match = completedImages.find((img: any) => {
            if (usedImageIds.has(img.storage_url)) return false
            const imgTime = new Date(img.created_at).getTime()
            return imgTime >= msgTime
          })
          if (match) {
            resolvedMessages[i] = { ...msg, image_url: match.storage_url || undefined }
            usedImageIds.add(match.storage_url)
            break // only the most recent assistant message gets this treatment
          }
        }

        setChat(chatData)
        setMessages(resolvedMessages)

        // Set initial imageGenStatus for any unresolved pending images
        resolvedMessages.forEach((msg) => {
          if (msg.pending_image_id) {
            setImageGenStatus((prev) => {
              if (prev[msg.pending_image_id!]) return prev // already set via Realtime
              return { ...prev, [msg.pending_image_id!]: 'pending' }
            })
          }
        })
      } catch (err) {
        console.error('Chat init error:', err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [characterId, router])

  // ── Supabase Realtime: track image generation progress ──
  useEffect(() => {
    if (!characterId) return

    const supabase = createBrowserSupabaseClient()

    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let subscribed = false

    const setupChannel = () => {
      const channel = supabase
        .channel(`chat-image-updates-${characterId}`)
        .on<ImageRecord>(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'images',
            filter: `character_id=eq.${characterId}`,
          },
          (payload) => {
            const image = payload.new as ImageRecord
            setImageGenStatus((prev) => ({ ...prev, [image.id]: image.status }))
          }
        )
        .on<ImageRecord>(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'images',
            filter: `character_id=eq.${characterId}`,
          },
          (payload) => {
            const image = payload.new as ImageRecord
            setImageGenStatus((prev) => ({ ...prev, [image.id]: image.status }))

            if (image.status === 'completed' || image.status === 'failed') {
              setMessages((prev) =>
                prev.map((msg) => {
                  if (msg.pending_image_id === image.id) {
                    return {
                      ...msg,
                      image_url: image.storage_url || undefined,
                      pending_image_id: image.status === 'completed' ? undefined : msg.pending_image_id,
                    }
                  }
                  return msg
                })
              )
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            subscribed = true
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            // Reconnect after a delay
            if (reconnectTimer) clearTimeout(reconnectTimer)
            reconnectTimer = setTimeout(setupChannel, 3_000)
          }
        })

      return channel
    }

    let channel = setupChannel()

    return () => {
      subscribed = false
      if (reconnectTimer) clearTimeout(reconnectTimer)
      supabase.removeChannel(channel)
    }
  }, [characterId])

  // ── Polling fallback: poll /api/images when any image is pending ──
  useEffect(() => {
    const pendingIds = Object.entries(imageGenStatus)
      .filter(([, status]) => status === 'pending')
      .map(([id]) => id)

    if (pendingIds.length === 0) return

    const interval = setInterval(async () => {
      try {
        // Use status=any to get all images (not just completed ones)
        const res = await fetch('/api/images?status=any')
        if (!res.ok) return

        const images: ImageRecord[] = await res.json()
        const imageMap = new Map(images.map((img) => [img.id, img]))

        for (const imgId of pendingIds) {
          const img = imageMap.get(imgId)
          if (!img) continue

          // Update status only if it changed since this effect snapshot
          setImageGenStatus((prev) => {
            if (prev[imgId] === img.status) return prev
            return { ...prev, [imgId]: img.status }
          })

          if (img.status === 'completed' || img.status === 'failed') {
            setMessages((prev) =>
              prev.map((msg) => {
                if (msg.pending_image_id === imgId) {
                  return {
                    ...msg,
                    image_url: img.status === 'completed' ? (img.storage_url || undefined) : undefined,
                    pending_image_id: img.status === 'completed' ? undefined : msg.pending_image_id,
                  }
                }
                return msg
              })
            )
          }
        }
      } catch {
        // Ignore poll errors
      }
    }, 3_000)

    return () => clearInterval(interval)
  }, [imageGenStatus])

  // ── Send message (async — client polls for result) ──
  async function handleSend() {
    const content = input.trim()
    if (!content || sending) return

    setInput('')
    setSending(true)
    setError(null)

    // Clean up any existing poll
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }

    // Optimistic user message
    const userMsg: ChatMessage = {
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    }
    const assistantTs = new Date().toISOString()
    setMessages((prev) => [...prev, userMsg])

    try {
      // Step 1: Save user message
      const saveRes = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: characterId,
          content: userMsg.content,
        }),
      })

      if (!saveRes.ok) {
        const errData = await saveRes.json()
        throw new Error(errData.error || `儲存失敗 (${saveRes.status})`)
      }
      const savedChat = await saveRes.json()
      setChat(savedChat)

      // Step 2: Start chat generation (returns immediately)
      const genRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: characterId,
          chat_id: savedChat.id,
          messages: messages.concat(userMsg).map((m) => ({
            role: m.role,
            content: m.content,
          })),
          personality_prompt: character?.personality_prompt ?? '',
          visual_template: character?.visual_template ?? '',
          body_description: character?.body_params ? buildBodyDescription(character.body_params) : undefined,
        }),
        signal: AbortSignal.timeout(30_000),
      })

      if (!genRes.ok) {
        const errData = await genRes.json()
        // If it failed, still try polling (generation may have started in background)
        console.warn('Chat generation start returned error:', errData)
      }

      // Show placeholder assistant message
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '', timestamp: assistantTs } as ChatMessage,
      ])

      // Step 3: Poll for result
      const userTs = userMsg.timestamp
      const maxPollTime = 60_000
      const pollStart = Date.now()
      let retriesLeft = 2

      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/chats?character_id=${characterId}`)
          if (!res.ok) return

          const chatData = await res.json()
          const allMsgs: ChatMessage[] = chatData?.messages ?? []

          // Find assistant messages after our user message
          const newMsgs = allMsgs.filter(
            (m) => m.role === 'assistant' && m.timestamp > userTs && m.content
          )

          if (newMsgs.length > 0) {
            // Found the response
            const latest = newMsgs[newMsgs.length - 1]

            if (pollRef.current) {
              clearInterval(pollRef.current)
              pollRef.current = null
            }

            setChat(chatData)
            setMessages((prev) => {
              const updated = [...prev]
              const last = updated[updated.length - 1]
              if (last.role === 'assistant' && last.timestamp === assistantTs) {
                updated[updated.length - 1] = latest
              }
              return updated
            })
            setSending(false)

            // Track image generation progress
            if (latest.pending_image_id) {
              setImageGenStatus((prev) => ({ ...prev, [latest.pending_image_id!]: 'pending' }))

              // Trigger image generation in its own request context
              fetch('/api/images/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image_id: latest.pending_image_id }),
              }).catch(() => {
                // Best-effort — image will be retried via /api/images/retry
              })
            }

            return
          }

          // Timeout check — retry generation before giving up
          if (Date.now() - pollStart > maxPollTime) {
            if (retriesLeft > 0) {
              retriesLeft--
              // Retry: call POST /api/chat again (warm instance might be faster)
              try {
                await fetch('/api/chat', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    character_id: characterId,
                    chat_id: savedChat.id,
                    messages: messages.concat(userMsg).map((m) => ({
                      role: m.role,
                      content: m.content,
                    })),
                    personality_prompt: character?.personality_prompt ?? '',
                    visual_template: character?.visual_template ?? '',
                    body_description: character?.body_params ? buildBodyDescription(character.body_params) : undefined,
                  }),
        signal: AbortSignal.timeout(30_000),
                })
              } catch {
                // retry failed, continue polling
              }
              return
            }
            if (pollRef.current) {
              clearInterval(pollRef.current)
              pollRef.current = null
            }
            setError('伺服器忙碌中，請稍後再試')
            setMessages((prev) => prev.filter((m) => m !== userMsg && m.timestamp !== assistantTs))
            setSending(false)
          }
        } catch {
          // Ignore poll errors — just retry
        }
      }, 2_000)
    } catch (err: any) {
      console.error('Send error:', err)
      setError(err.name === 'TimeoutError' ? '伺服器忙碌中，請稍後再試' : err.message)
      setMessages((prev) =>
        prev.filter((m) => m !== userMsg)
      )
      setSending(false)
    }
  }

  async function handleDelete(timestamp: string) {
    if (!chat?.id || deletingTimestamp) return
    if (!window.confirm('確定刪除此訊息？')) return

    setDeletingTimestamp(timestamp)
    setError(null)

    try {
      const res = await fetch('/api/chats', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chat.id,
          delete_timestamp: timestamp,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '刪除失敗')
      }

      const updatedChat = await res.json()
      setChat(updatedChat)
      setMessages(updatedChat.messages)
    } catch (err: any) {
      console.error('Delete error:', err)
      setError(err.message)
    } finally {
      setDeletingTimestamp(null)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Loading state
  if (loading) {
    return (
      <AppLayout>
        <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
        </div>
      </AppLayout>
    )
  }

  // Character not found
  if (!character) {
    return null
  }

  return (
    <AppLayout>
      <div className="flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden">
        {/* Chat header */}
        <div className="flex shrink-0 items-center gap-3 border-b border-zinc-800 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/')}
            className="text-zinc-400"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-pink-500 to-purple-600 text-sm font-bold text-white">
            {character.avatar_url ? (
              <img src={character.avatar_url} alt={character.name} className="h-full w-full object-cover" />
            ) : (
              character.name.charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-white">
              {character.name}
            </h2>
            <span className="flex items-center gap-1 text-xs text-zinc-500">
              <Sparkles className="h-3 w-3 text-amber-400" />
              AI 伴侶
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-zinc-400"
            onClick={() => router.push('/gallery')}
          >
            <ImageIcon className="h-5 w-5" />
          </Button>
        </div>

        {/* Messages area */}
        <ScrollArea className="min-h-0 flex-1 px-4 py-4" viewportRef={scrollViewportRef}>
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800">
                <Heart className="h-8 w-8 text-pink-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">
                開始與 {character.name} 聊天
              </h3>
              <p className="mt-1 max-w-sm text-sm text-zinc-400">
                發送一條訊息，開始你們的對話
              </p>
            </div>
          )}

          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div
                key={msg.timestamp ?? i}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-bold ${
                    msg.role === 'user'
                      ? 'bg-zinc-700 text-zinc-300'
                      : 'bg-gradient-to-br from-pink-500 to-purple-600 text-white'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <User className="h-4 w-4" />
                  ) : character.avatar_url ? (
                    <img src={character.avatar_url} alt={character.name} className="h-full w-full object-cover" />
                  ) : (
                    character.name.charAt(0).toUpperCase()
                  )}
                </div>

                {/* Message bubble + delete button */}
                <div className="group flex max-w-[80%] items-start gap-1">
                  <div className="min-w-0 space-y-2">
                    <div
                      className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-pink-600 text-white'
                          : 'bg-zinc-800 text-zinc-200'
                      }`}
                    >
                      {msg.role === 'assistant' && typingContent[msg.timestamp] != null
                        ? typingContent[msg.timestamp]
                        : msg.content}
                      {msg.role === 'assistant' &&
                        typingContent[msg.timestamp] != null &&
                        typingContent[msg.timestamp] !== msg.content && (
                          <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-pink-400 align-text-bottom" />
                        )}
                    </div>

                    {/* Image attachment — completed */}
                    {msg.image_url && (
                      <a
                        href={msg.image_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block max-w-xs overflow-hidden rounded-xl border border-zinc-700 transition-opacity hover:opacity-90"
                      >
                        <img
                          src={msg.image_url}
                          alt="Generated photo"
                          className="w-full object-cover"
                          onLoad={() => {
                            if (!userScrolledUpRef.current) bottomRef.current?.scrollIntoView?.()
                          }}
                          onError={() => {
                            if (!userScrolledUpRef.current) bottomRef.current?.scrollIntoView?.()
                          }}
                        />
                      </a>
                    )}

                    {/* Pending state — image being generated */}
                    {msg.pending_image_id && !msg.image_url && (
                      <div className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-xs">
                        {(() => {
                          const status = imageGenStatus[msg.pending_image_id!]
                          if (status === 'completed') return null
                          if (status === 'failed')
                            return (
                              <>
                                <span className="text-red-400">❌</span>
                                <span className="text-red-400">生成失敗</span>
                              </>
                            )
                          if (status === 'processing')
                            return (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />
                                <span className="text-amber-300">正在生成照片 (約需 60 秒)...</span>
                              </>
                            )
                          // 'pending' or unknown
                          return (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-pink-400" />
                              <span className="text-zinc-400">正在排隊生成...</span>
                            </>
                          )
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Delete button */}
                  {chat?.id && (
                    <button
                      onClick={() => handleDelete(msg.timestamp)}
                      disabled={deletingTimestamp === msg.timestamp}
                      className={`mt-1 shrink-0 rounded-md p-1.5 text-zinc-500 transition-all hover:bg-zinc-700 hover:text-red-400 active:bg-red-700 active:text-white sm:opacity-0 sm:group-hover:opacity-100 ${msg.role === 'user' ? 'order-first' : ''}`}
                      title="刪除此訊息"
                    >
                      {deletingTimestamp === msg.timestamp ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-pink-500 to-purple-600 text-xs font-bold text-white">
                {character.avatar_url ? (
                  <img src={character.avatar_url} alt={character.name} className="h-full w-full object-cover" />
                ) : (
                  character.name.charAt(0).toUpperCase()
                )}
              </div>
                <div className="flex items-center gap-1 rounded-2xl bg-zinc-800 px-4 py-2.5">
                  <div className="flex gap-0.5">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-500 [animation-delay:0ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-500 [animation-delay:150ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-500 [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        {/* Error display */}
        {error && (
          <div className="shrink-0 border-t border-red-900/50 bg-red-950/20 px-4 py-2">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        {/* Input area */}
        <div className="shrink-0 border-t border-zinc-800 bg-zinc-950 px-4 py-3">
          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`對 ${character.name} 說些什麼...`}
              disabled={sending}
              className="flex-1 border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-500"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              size="icon"
              className="bg-pink-600 text-white hover:bg-pink-700 disabled:opacity-50"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
