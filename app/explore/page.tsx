'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button, Card, CardContent, CardHeader, CardTitle, LoadingSpinner } from '@/components/ui'

type ExploreTheme = {
  id: string
  title: string
  description: string | null
  imageUrl: string | null
  worldviewCardId: string | null
  status: 'ACTIVE' | 'INACTIVE'
  questionCount: number
}

export default function ExplorePage() {
  const router = useRouter()
  const [themes, setThemes] = useState<ExploreTheme[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch('/api/themes?status=ACTIVE', { cache: 'no-store' })
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error?.message || 'テーマ取得に失敗しました')
        if (!cancelled) setThemes(json?.data?.themes || [])
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'テーマ取得に失敗しました')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="matte-texture min-h-screen px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs tracking-[0.25em] text-student-text-tertiary">EXPLORE THEMES</p>
            <h1 className="mt-2 font-heading text-3xl font-bold text-student-text-primary">公開テーマ一覧</h1>
            <p className="mt-2 text-sm text-student-text-tertiary">授業で扱うテーマ候補と設問数を確認できます。</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => router.push('/student')}>
              生徒ページへ
            </Button>
            <Button onClick={() => router.push('/admin')}>教員ログイン</Button>
          </div>
        </header>

        {error && (
          <div className="mb-5 rounded-md border border-student-semantic-error/30 bg-student-semantic-error/10 px-4 py-3 text-sm text-student-text-primary">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : themes.length === 0 ? (
          <Card>
            <CardContent>
              <p className="text-sm text-student-text-tertiary">公開中のテーマがありません。</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {themes.map((theme) => (
              <Card key={theme.id}>
                {theme.imageUrl && (
                  <div className="h-40 overflow-hidden rounded-t-lg border-b border-student-border-primary">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={theme.imageUrl} alt={theme.title} className="h-full w-full object-cover" />
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-lg">{theme.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-student-text-secondary">{theme.description || '説明はありません。'}</p>
                  <p className="mt-3 text-xs text-student-text-tertiary">
                    設問数: {theme.questionCount}
                    {theme.worldviewCardId ? ` / goal: ${theme.worldviewCardId}` : ''}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <footer className="mt-12 text-center text-xs text-student-text-disabled">
          <Link href="/" className="hover:text-student-text-tertiary">
            トップへ戻る
          </Link>
        </footer>
      </div>
    </main>
  )
}
