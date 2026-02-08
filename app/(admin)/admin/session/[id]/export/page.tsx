'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { fetchWithRetry } from '@/lib/fetch-with-retry'

type SessionDetail = {
  id: string
  title: string
  sessionCode: string | null
  status: string
  currentParticipants: number
}

export default function AdminSessionExportPage({ params }: { params: { id: string } }) {
  const sessionId = params.id
  const router = useRouter()
  const [session, setSession] = useState<SessionDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setError(null)
        const res = await fetchWithRetry(`/api/session?sessionId=${encodeURIComponent(sessionId)}`, { cache: 'no-store' })
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error?.message || 'セッション取得に失敗しました')
        if (!cancelled) setSession(json?.data?.session || null)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'セッション取得に失敗しました')
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [sessionId])

  function openExport(format: 'csv' | 'json') {
    window.open(`/api/session/export?sessionId=${encodeURIComponent(sessionId)}&format=${format}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <main className="mx-auto max-w-4xl p-4 md:p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-body text-2xl font-bold text-admin-text-primary">データエクスポート</h1>
          <p className="mt-1 text-sm text-admin-text-tertiary">CSV または JSON で出力できます。</p>
        </div>
        <Button tone="admin" variant="secondary" onClick={() => router.push(`/admin/session/${encodeURIComponent(sessionId)}`)}>
          セッション詳細へ
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-admin-semantic-error/30 bg-red-50 p-3 text-sm text-admin-semantic-error">{error}</div>
      )}

      <Card tone="admin">
        <CardHeader>
          <CardTitle className="text-admin-text-primary">{session?.title || 'セッション'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-admin-text-secondary">
          {session && (
            <div className="rounded-md border border-admin-border-primary bg-admin-bg-secondary p-3">
              <p>SessionCode: {session.sessionCode || '-'}</p>
              <p>状態: {session.status}</p>
              <p>参加者数: {session.currentParticipants}</p>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button tone="admin" onClick={() => openExport('csv')}>
              CSV出力
            </Button>
            <Button tone="admin" variant="secondary" onClick={() => openExport('json')}>
              JSON出力
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
