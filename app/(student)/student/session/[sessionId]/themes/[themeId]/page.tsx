'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, CardContent, LoadingSpinner } from '@/components/ui'
import { StepIndicator } from '@/components/common/StepIndicator'
import { buildStudentSteps, completedStepKeys } from '@/lib/constants/student-flow'

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
  const router = useRouter()
  const [theme, setTheme] = useState<ThemeDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch(`/api/themes/${themeId}?sessionId=${encodeURIComponent(sessionId)}`, { cache: 'no-store' })
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

    void load()
    return () => {
      cancelled = true
    }
  }, [sessionId, themeId])

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
      <StepIndicator
        steps={buildStudentSteps(sessionId)}
        currentKey="themes"
        completedKeys={completedStepKeys('themes')}
        onNavigate={(path) => router.push(path)}
      />

      {theme.imageUrl && (
        <div className="relative mb-10 overflow-hidden rounded-2xl border border-student-border-primary">
          <div className="absolute inset-0">
            <Image
              src={theme.imageUrl}
              alt=""
              fill
              unoptimized
              className="object-cover opacity-55 grayscale"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/55 to-black/85" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:24px_24px] opacity-[0.18] mix-blend-overlay" />
          </div>
          <div className="relative p-8 md:p-10">
            <div className="font-mono text-xs text-white/60">テーマ概要</div>
            <h1 className="mt-2 font-heading text-4xl font-bold leading-tight text-white">{theme.title}</h1>
            {theme.description && <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/75">{theme.description}</p>}
          </div>
        </div>
      )}

      {!theme.imageUrl && (
        <div className="mb-8">
          <h1 className="font-heading text-4xl font-bold leading-tight text-student-text-primary">{theme.title}</h1>
          {theme.description && <p className="mt-4 text-student-text-secondary">{theme.description}</p>}
        </div>
      )}

      <section className="mb-8 rounded-lg border border-student-border-secondary bg-student-bg-tertiary p-5">
        <p className="text-sm text-student-text-secondary">このテーマを読んだら、次のページで設問に回答します。</p>
      </section>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => router.push(`/student/session/${encodeURIComponent(sessionId)}/themes`)}>
          テーマ選択に戻る
        </Button>
        <Button onClick={() => router.push(`/student/session/${encodeURIComponent(sessionId)}/briefing?themeId=${encodeURIComponent(themeId)}`)}>
          読み物へ進む
        </Button>
      </div>
    </main>
  )
}
