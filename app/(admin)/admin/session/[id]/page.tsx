'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, CardContent, CardHeader, CardTitle, LoadingSpinner } from '@/components/ui'
import { fetchWithRetry } from '@/lib/fetch-with-retry'

type SessionDetail = {
  id: string
  sessionCode: string | null
  title: string
  description: string | null
  status: 'PREPARING' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'
  maxParticipants: number
  currentParticipants: number
}

export default function AdminSessionDetailPage({ params }: { params: { id: string } }) {
  const sessionId = params.id
  const router = useRouter()
  const [session, setSession] = useState<SessionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetchWithRetry(`/api/session?sessionId=${encodeURIComponent(sessionId)}`, { cache: 'no-store' })
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error?.message || 'セッション取得に失敗しました')
        if (!cancelled) setSession(json?.data?.session || null)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'セッション取得に失敗しました')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [sessionId])

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" className="border-admin-accent-primary border-r-transparent" />
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-5xl p-4 md:p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-body text-2xl font-bold text-admin-text-primary">セッション詳細</h1>
          <p className="mt-1 text-sm text-admin-text-tertiary">進行管理ページです。</p>
        </div>
        <div className="flex gap-2">
          <Button tone="admin" variant="secondary" onClick={() => router.push('/admin/board')}>
            一覧へ戻る
          </Button>
          <Button tone="admin" variant="secondary" onClick={() => router.push(`/admin/dashboard?sessionId=${encodeURIComponent(sessionId)}`)}>
            ダッシュボード表示
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-admin-semantic-error/30 bg-red-50 p-3 text-sm text-admin-semantic-error">{error}</div>
      )}

      {session && (
        <Card tone="admin" className="mb-6">
          <CardHeader>
            <CardTitle className="text-admin-text-primary">{session.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-admin-text-secondary">
            <p>SessionCode: {session.sessionCode || '-'}</p>
            <p>状態: {session.status}</p>
            <p>
              参加者: {session.currentParticipants} / {session.maxParticipants}
            </p>
            {session.description && <p>{session.description}</p>}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Button tone="admin" onClick={() => router.push(`/admin/session/${encodeURIComponent(sessionId)}/students`)}>
          参加者一覧
        </Button>
        <Button tone="admin" onClick={() => router.push(`/admin/session/${encodeURIComponent(sessionId)}/responses`)}>
          回答分析
        </Button>
        <Button tone="admin" variant="secondary" onClick={() => router.push(`/admin/session/${encodeURIComponent(sessionId)}/export`)}>
          エクスポート
        </Button>
        <Button tone="admin" variant="secondary" onClick={() => router.push(`/admin/session/${encodeURIComponent(sessionId)}/review`)}>
          レビュー
        </Button>
      </div>
    </main>
  )
}
