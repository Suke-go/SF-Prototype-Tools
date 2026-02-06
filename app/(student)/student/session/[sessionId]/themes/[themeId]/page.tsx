'use client'

import { useEffect, useState } from 'react'
import { Button, Card, CardContent, LoadingSpinner } from '@/components/ui'

type ThemeDetail = {
  id: string
  title: string
  description: string | null
  imageUrl?: string | null
  questions: { id: string; questionText: string; order: number }[]
}

export default function ThemeMainPage({
  params,
}: {
  params: { sessionId: string; themeId: string }
}) {
  const { sessionId, themeId } = params
  const [theme, setTheme] = useState<ThemeDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/themes/${themeId}`, { cache: 'no-store' })
        const ct = res.headers.get('content-type') || ''
        if (!ct.includes('application/json')) throw new Error('サーバーエラー')
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error?.message || 'テーマの取得に失敗しました')
        if (!cancelled) setTheme(json.data.theme)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'テーマの取得に失敗しました')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [themeId])

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </main>
    )
  }

  if (error || !theme) {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <Card>
          <CardContent>
            <p className="text-student-text-primary">{error || 'テーマが見つかりません'}</p>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-4xl p-6 md:p-10">
      {/* 背景（テーマ画像があれば使用） */}
      {theme.imageUrl && (
        <div className="relative mb-10 overflow-hidden rounded-2xl border border-student-border-primary">
          <div className="absolute inset-0">
            <img src={theme.imageUrl} alt="" className="h-full w-full object-cover opacity-55 grayscale" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/55 to-black/85" />
            <div className="absolute inset-0 opacity-[0.18] mix-blend-overlay bg-[linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:24px_24px]" />
          </div>
          <div className="relative p-8 md:p-10">
            <div className="text-xs text-white/60 font-mono">MAIN PAGE</div>
            <h1 className="mt-2 font-heading text-4xl font-bold leading-tight text-white">{theme.title}</h1>
            {theme.description && (
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/70 line-clamp-4">
                {theme.description}
              </p>
            )}
          </div>
        </div>
      )}

      {/* テーマタイトル */}
      {!theme.imageUrl && (
        <div className="mb-10">
          <h1 className="font-heading text-4xl font-bold leading-tight text-student-text-primary">
            {theme.title}
          </h1>
        </div>
      )}

      {/* テーマ概要 */}
      {theme.description && !theme.imageUrl && (
        <section className="mb-10">
          <div className="prose-invert max-w-none text-lg leading-[1.9] text-student-text-secondary">
            {theme.description.split('\n').map((p, i) => (
              <p key={i} className="mb-4">{p}</p>
            ))}
          </div>
        </section>
      )}

      {/* 関連情報セクション（将来的にSF作品引用、研究紹介を追加） */}
      <section className="mb-10 rounded-lg border-l-4 border-student-border-primary bg-student-bg-secondary p-6">
        <p className="text-sm italic text-student-text-tertiary">
          「未来社会の可能性を想像してみてください。あなたの直感が大切です。」
        </p>
      </section>

      {/* 質問数の案内 */}
      <section className="mb-8 rounded-lg border border-student-border-secondary bg-student-bg-tertiary p-4">
        <p className="text-sm text-student-text-secondary">
          このテーマに関連する <span className="font-bold text-student-text-primary">{theme.questions.length}個の質問</span> に回答します。
          はい / わからない / いいえ の3択で、直感で答えてください。
        </p>
      </section>

      {/* ナビゲーション */}
      <div className="flex gap-3">
        <Button
          variant="secondary"
          onClick={() => (window.location.href = `/student/session/${encodeURIComponent(sessionId)}/themes`)}
        >
          テーマ選択に戻る
        </Button>
        <Button
          onClick={() => (window.location.href = `/student/session/${encodeURIComponent(sessionId)}/questions?themeId=${themeId}`)}
        >
          質問に進む
        </Button>
      </div>
    </main>
  )
}
