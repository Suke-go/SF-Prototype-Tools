'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, LoadingSpinner } from '@/components/ui'
import { fetchWithRetry } from '@/lib/fetch-with-retry'

type SessionSummary = {
  id: string
  sessionCode: string | null
  title: string
  status: 'PREPARING' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'
  participantCount: number
  createdAt: string
}

export default function AdminBoardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState('')

  const [statusFilter, setStatusFilter] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [q, setQ] = useState('')
  const [skip, setSkip] = useState(0)

  const activeSessionId = useMemo(() => selectedSessionId.trim(), [selectedSessionId])

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      if (q.trim()) params.set('q', q.trim())
      if (skip > 0) params.set('skip', String(skip))

      const res = await fetchWithRetry(`/api/session${params.size > 0 ? `?${params.toString()}` : ''}`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error?.message || 'セッション一覧の取得に失敗しました')
      setSessions(json?.data?.sessions || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'データ取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [from, q, skip, statusFilter, to])

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      try {
        const auth = await fetch('/api/auth/teacher/me', { cache: 'no-store' })
        if (!auth.ok) {
          router.push('/admin')
          return
        }
        if (cancelled) return
        await fetchSessions()
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : '初期化に失敗しました')
      }
    }

    void bootstrap()
    return () => {
      cancelled = true
    }
  }, [fetchSessions, router])

  useEffect(() => {
    if (!loading) {
      void fetchSessions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip])

  function goDashboard(sessionId: string) {
    if (!sessionId) return
    localStorage.setItem('admin:lastSessionId', sessionId)
    router.push(`/admin/session/${encodeURIComponent(sessionId)}`)
  }

  function goReview(sessionId: string) {
    if (!sessionId) return
    localStorage.setItem('admin:lastSessionId', sessionId)
    router.push(`/admin/session/${encodeURIComponent(sessionId)}/review`)
  }

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-8">
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <h1 className="font-body text-2xl font-bold text-admin-text-primary">セッション一覧</h1>
          <p className="mt-1 text-sm text-admin-text-tertiary">条件を絞ってセッションを検索できます。</p>
        </div>
        <Button tone="admin" variant="secondary" onClick={() => router.push('/admin/dashboard')}>
          ダッシュボードへ
        </Button>
        <Button tone="admin" variant="secondary" onClick={() => router.push('/admin/themes')}>
          テーマ管理へ
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-admin-border-primary bg-admin-bg-secondary p-3 text-sm text-red-700">{error}</div>
      )}

      <Card tone="admin" className="mb-6">
        <CardHeader>
          <CardTitle className="text-admin-text-primary">検索条件</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <div>
              <label className="mb-1 block text-xs text-admin-text-tertiary">状態</label>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="w-full rounded-md border border-admin-border-primary bg-admin-bg-primary px-3 py-2 text-sm text-admin-text-primary"
              >
                <option value="">すべて</option>
                <option value="PREPARING">PREPARING</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </div>
            <Input
              label="作成日From"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="border-admin-border-primary bg-admin-bg-primary text-admin-text-primary"
            />
            <Input
              label="作成日To"
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="border-admin-border-primary bg-admin-bg-primary text-admin-text-primary"
            />
            <Input
              label="キーワード"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="タイトル / コード"
              className="border-admin-border-primary bg-admin-bg-primary text-admin-text-primary"
            />
            <div className="flex items-end gap-2">
              <Button
                tone="admin"
                variant="secondary"
                onClick={() => {
                  setSkip(0)
                  void fetchSessions()
                }}
              >
                絞り込む
              </Button>
              <Button tone="admin" onClick={() => router.push('/admin/session/new')}>
                新規作成
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card tone="admin">
        <CardHeader>
          <CardTitle className="text-admin-text-primary">セッション</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center">
              <LoadingSpinner size="lg" className="border-admin-accent-primary border-r-transparent" />
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-admin-text-tertiary">条件に一致するセッションがありません。</p>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => {
                const selected = activeSessionId === session.id
                return (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => setSelectedSessionId(session.id)}
                    className={[
                      'w-full rounded-md border p-3 text-left transition-colors',
                      selected
                        ? 'border-admin-accent-primary bg-blue-50'
                        : 'border-admin-border-primary bg-admin-bg-secondary hover:bg-admin-bg-tertiary/40',
                    ].join(' ')}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-admin-text-primary">{session.title}</p>
                        <p className="text-xs text-admin-text-tertiary">
                          ID: {session.id}
                          {session.sessionCode ? ` / コード: ${session.sessionCode}` : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-admin-text-secondary">状態: {session.status}</p>
                        <p className="text-xs text-admin-text-secondary">参加者: {session.participantCount}</p>
                        <p className="text-xs text-admin-text-tertiary">作成: {new Date(session.createdAt).toLocaleString('ja-JP')}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-2">
              <Button
                tone="admin"
                variant="secondary"
                size="sm"
                disabled={skip <= 0}
                onClick={() => {
                  setSkip((prev) => Math.max(0, prev - 20))
                }}
              >
                前へ
              </Button>
              <Button
                tone="admin"
                variant="secondary"
                size="sm"
                disabled={sessions.length < 20}
                onClick={() => {
                  setSkip((prev) => prev + 20)
                }}
              >
                次へ
              </Button>
            </div>
            <div className="flex gap-2">
              <Button tone="admin" variant="secondary" disabled={!activeSessionId} onClick={() => goReview(activeSessionId)}>
                レビュー画面へ
              </Button>
              <Button tone="admin" disabled={!activeSessionId} onClick={() => goDashboard(activeSessionId)}>
                セッション詳細へ
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
