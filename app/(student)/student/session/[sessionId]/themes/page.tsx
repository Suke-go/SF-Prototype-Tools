'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, LoadingSpinner } from '@/components/ui'

type Theme = {
  id: string
  title: string
  description: string | null
  imageUrl?: string | null
}

export default function ThemeSelectionPage({ params }: { params: { sessionId: string } }) {
  const sessionId = params.sessionId
  const [themes, setThemes] = useState<Theme[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/themes', { cache: 'no-store' })
        const ct = res.headers.get('content-type') || ''
        if (!ct.includes('application/json')) throw new Error('サーバーエラー（DB未設定の可能性）')
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error?.message || 'テーマの取得に失敗しました')
        if (!cancelled) setThemes(json.data.themes)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'テーマの取得に失敗しました')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  function selectTheme(themeId: string) {
    setSelected(themeId)
    // localStorageに選択を保存
    localStorage.setItem(`student:theme:${sessionId}`, themeId)
    // メインページへ遷移
    setTimeout(() => {
      window.location.href = `/student/session/${encodeURIComponent(sessionId)}/themes/${themeId}`
    }, 300)
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </main>
    )
  }

  if (error) {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <Card>
          <CardContent>
            <p className="text-student-text-primary">{error}</p>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-5xl p-6 md:p-10">
      <div className="mb-8 text-center">
        <h1 className="font-heading text-3xl font-bold text-student-text-primary">テーマを選択</h1>
        <p className="mt-2 text-student-text-tertiary">興味のあるテーマを1つ選んでください</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {themes.map((theme) => (
          <button
            key={theme.id}
            onClick={() => selectTheme(theme.id)}
            disabled={selected !== null}
            className={[
              'group text-left transition-all duration-normal',
              'relative overflow-hidden rounded-2xl border border-student-border-primary bg-student-bg-tertiary',
              'hover:-translate-y-1 hover:shadow-[0_10px_28px_rgba(0,0,0,0.55)]',
              'focus:outline-none focus:ring-2 focus:ring-student-text-primary focus:ring-offset-2 focus:ring-offset-student-bg-primary',
              'disabled:opacity-60 disabled:pointer-events-none',
              selected === theme.id && 'ring-2 ring-student-text-primary',
            ].join(' ')}
          >
            {/* 背景画像（マット/暗め） */}
            <div className="absolute inset-0">
              {theme.imageUrl ? (
                <img
                  src={theme.imageUrl}
                  alt=""
                  className="h-full w-full object-cover opacity-55 grayscale"
                  loading="lazy"
                />
              ) : (
                <div className="h-full w-full bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.08),transparent_55%),radial-gradient(circle_at_80%_70%,rgba(255,255,255,0.05),transparent_60%)]" />
              )}
              {/* matte overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/55 to-black/80" />
              <div className="absolute inset-0 opacity-[0.18] mix-blend-overlay bg-[linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:24px_24px]" />
            </div>

            {/* コンテンツ */}
            <div className="relative p-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-white/70">
                <span className="font-mono">THEME</span>
                <span className="text-white/50">/</span>
                <span className="font-mono">{theme.id.slice(0, 6).toUpperCase()}</span>
              </div>

              <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">
                {theme.title}
              </h2>
              {theme.description && (
                <p className="mt-3 text-sm leading-relaxed text-white/70 line-clamp-3">
                  {theme.description}
                </p>
              )}

              <div className="mt-5 flex items-center justify-between">
                <span className="text-xs text-white/55">タップで選択</span>
                <span className="text-white/65 transition-transform duration-normal group-hover:translate-x-1" aria-hidden>
                  →
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {themes.length === 0 && (
        <p className="text-center text-student-text-tertiary">テーマが登録されていません。</p>
      )}
    </main>
  )
}
