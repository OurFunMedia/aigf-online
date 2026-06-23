'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowDownUp,
  Heart,
  ImageIcon,
  Loader2,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { Image } from '@/types/database'

export default function GalleryPage() {
  const router = useRouter()
  const [images, setImages] = useState<Image[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [clearing, setClearing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<Image | null>(null)
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')

  const fetchImages = useCallback(async (sort: 'desc' | 'asc') => {
    try {
      const res = await fetch(`/api/images?sort=${sort}`)
      if (!res.ok) {
        if (res.status === 401) { router.push('/login'); return }
        throw new Error('載入失敗')
      }
      const data = await res.json()
      setImages(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchImages(sortOrder)
  }, [sortOrder, fetchImages])

  // Re-fetch on focus to pick up newly completed images
  useEffect(() => {
    function onFocus() { fetchImages(sortOrder) }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [sortOrder, fetchImages])

  const totalCount = images.length

  // ── Toggle sort ──
  function toggleSort() {
    setLoading(true)
    setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))
  }

  // ── Delete single image ──
  async function handleDelete(id: string) {
    setDeleting(id)
    setError(null)
    try {
      const res = await fetch(`/api/images/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '刪除失敗')
      setImages((prev) => prev.filter((img) => img.id !== id))
      if (selectedImage?.id === id) setSelectedImage(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setDeleting(null)
    }
  }

  // ── Clear all images ──
  async function handleClearAll() {
    if (!confirm('確定要刪除所有照片嗎？此操作無法復原。')) return
    setClearing(true)
    setError(null)
    try {
      const res = await fetch('/api/images', { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '清空失敗')
      setImages([])
      setSelectedImage(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setClearing(false)
    }
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="text-zinc-400"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white">寫真畫廊</h1>
              <p className="mt-1 text-sm text-zinc-400">
                {totalCount > 0
                  ? `共 ${totalCount} 張照片`
                  : '你的 AI 伴侶為你生成的所有照片'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {images.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSort}
                className="gap-1.5 border-zinc-700 text-xs text-zinc-400"
              >
                <ArrowDownUp className="h-3.5 w-3.5" />
                {sortOrder === 'desc' ? '最新優先' : '最舊優先'}
              </Button>
            )}
            {images.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                disabled={clearing}
                className="gap-1.5 border-red-800 text-xs text-red-400 hover:bg-red-900/30"
              >
                {clearing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                清空全部
              </Button>
            )}
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] overflow-hidden rounded-xl">
                <Skeleton className="h-full w-full" />
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="mb-4 rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-2.5 text-xs text-red-400">
            {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && images.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800">
              <ImageIcon className="h-8 w-8 text-zinc-500" />
            </div>
            <h2 className="text-xl font-semibold text-white">還沒有照片</h2>
            <p className="mt-2 max-w-sm text-sm text-zinc-400">
              和你的 AI 伴侶聊天時，要求發送照片即可自動生成
            </p>
            <Button
              variant="default"
              className="mt-6 gap-2 bg-pink-600 text-white hover:bg-pink-700"
              onClick={() => router.push('/')}
            >
              <Heart className="h-4 w-4" />
              選擇角色開始聊天
            </Button>
          </div>
        )}

        {/* Image grid */}
        {!loading && images.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {images.map((img) => (
              <div
                key={img.id}
                className="group relative aspect-[2/3] overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900"
              >
                <button
                  onClick={() => setSelectedImage(img)}
                  className="block h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/50"
                >
                  {(img.thumbnail_url ?? img.storage_url) ? (
                    <img
                      src={img.thumbnail_url ?? img.storage_url}
                      alt={img.prompt}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-zinc-600" />
                    </div>
                  )}
                </button>

                {/* Hover overlay */}
                <div className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 via-transparent to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                  <p className="line-clamp-2 text-xs leading-relaxed text-white">
                    {img.prompt}
                  </p>
                  <p className="mt-1 text-[10px] text-zinc-400">
                    {new Date(img.created_at).toLocaleDateString('zh-TW')}
                  </p>
                </div>

                {/* Delete button on hover */}
                <button
                  onClick={() => handleDelete(img.id)}
                  disabled={deleting === img.id}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-zinc-400 opacity-0 transition-all hover:bg-red-600 hover:text-white group-hover:opacity-100 disabled:opacity-50"
                >
                  {deleting === img.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <X className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Lightbox */}
        {selectedImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            onClick={() => setSelectedImage(null)}
          >
            <div
              className="relative flex max-h-[90vh] max-w-[90vw] flex-col overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-zinc-300 hover:bg-red-600 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Image - 2:3 portrait */}
              {selectedImage.storage_url && (
                <img
                  src={selectedImage.storage_url}
                  alt={selectedImage.prompt}
                  className="max-h-[75vh] w-auto object-contain"
                />
              )}

              {/* Info bar */}
              <div className="flex items-center justify-between border-t border-zinc-800 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-zinc-200">
                    {selectedImage.prompt}
                  </p>
                  {selectedImage.scene_description && (
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {selectedImage.scene_description}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-zinc-600">
                    {new Date(selectedImage.created_at).toLocaleDateString('zh-TW', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                {/* Delete in lightbox */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(selectedImage.id)}
                  disabled={deleting === selectedImage.id}
                  className="ml-4 shrink-0 gap-1.5 border-red-800 text-xs text-red-400 hover:bg-red-900/30"
                >
                  {deleting === selectedImage.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  刪除
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
