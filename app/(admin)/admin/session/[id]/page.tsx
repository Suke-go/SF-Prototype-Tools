'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, CardContent, CardHeader, CardTitle, LoadingSpinner } from '@/components/ui'
import { fetchWithRetry } from '@/lib/fetch-with-retry'
import { getSessionStatusLabel } from '@/lib/constants/session-status'

type SessionDetail = {
  id: string
  sessionCode: string | null
  title: string
  description: string | null
  status: 'PREPARING' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'
  maxParticipants: number
  currentParticipants: number
}

type GroupMember = { id: string; name: string | null }
type GroupInfo = { id: string; name: string; theme: { id: string; title: string }; members: GroupMember[] }
type GroupData = {
  groups: GroupInfo[]
  selectionStatus: { total: number; selected: number }
}

export default function AdminSessionDetailPage({ params }: { params: { id: string } }) {
  const sessionId = params.id
  const router = useRouter()
  const [session, setSession] = useState<SessionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Grouping state
  const [groupData, setGroupData] = useState<GroupData | null>(null)
  const [groupLoading, setGroupLoading] = useState(false)
  const [groupError, setGroupError] = useState<string | null>(null)
  const [groupSuccess, setGroupSuccess] = useState<string | null>(null)

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
    return () => { cancelled = true }
  }, [sessionId])

  const fetchGroups = useCallback(async () => {
    try {
      setGroupLoading(true)
      setGroupError(null)
      const res = await fetchWithRetry(`/api/session/${encodeURIComponent(sessionId)}/groups`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error?.message || 'グループ取得に失敗')
      setGroupData(json.data)
    } catch (e) {
      setGroupError(e instanceof Error ? e.message : 'グループ取得エラー')
    } finally {
      setGroupLoading(false)
    }
  }, [sessionId])

  useEffect(() => { void fetchGroups() }, [fetchGroups])

  async function runAutoGrouping() {
    setGroupLoading(true)
    setGroupError(null)
    setGroupSuccess(null)
    try {
      const res = await fetch(`/api/session/${encodeURIComponent(sessionId)}/groups`, {
        method: 'POST',
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error?.message || 'グルーピングに失敗')
      setGroupSuccess(`✅ ${json.data.groupCount} グループを自動生成しました`)
      void fetchGroups()
    } catch (e) {
      setGroupError(e instanceof Error ? e.message : 'グルーピングエラー')
    } finally {
      setGroupLoading(false)
    }
  }

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
          <p className="mt-1 text-sm text-admin-text-tertiary">参加状況や分析画面へ移動できます。</p>
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
        <div className="mb-4 rounded-md border border-admin-semantic-error/30 bg-red-50 p-3 text-sm text-admin-semantic-error">
          {error}
        </div>
      )}

      {session && (
        <Card tone="admin" className="mb-6">
          <CardHeader>
            <CardTitle className="text-admin-text-primary">{session.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-admin-text-secondary">
            <p>SessionCode: {session.sessionCode || '-'}</p>
            <p>状態: {getSessionStatusLabel(session.status)}</p>
            <p>参加者: {session.currentParticipants} / {session.maxParticipants}</p>
            {session.description && <p>{session.description}</p>}
          </CardContent>
        </Card>
      )}

      {/* ===== GROUPING SECTION ===== */}
      <Card tone="admin" className="mb-6">
        <CardHeader>
          <CardTitle className="text-admin-text-primary">📊 自動グルーピング</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {groupData && (
            <div className="flex items-center gap-4">
              <div className="text-sm text-admin-text-secondary">
                トピック選択状況:
                <span className="ml-2 font-semibold text-admin-text-primary">
                  {groupData.selectionStatus.selected} / {groupData.selectionStatus.total} 人
                </span>
              </div>
              <div className="h-2 flex-1 rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-admin-accent-primary transition-all"
                  style={{ width: `${groupData.selectionStatus.total > 0 ? (groupData.selectionStatus.selected / groupData.selectionStatus.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button tone="admin" onClick={() => void runAutoGrouping()} disabled={groupLoading}>
              {groupLoading ? '処理中...' : '🔄 自動グルーピング実行'}
            </Button>
            <Button tone="admin" variant="secondary" onClick={() => void fetchGroups()} disabled={groupLoading}>
              更新
            </Button>
          </div>

          {groupError && (
            <div className="rounded-md border border-admin-semantic-error/30 bg-red-50 p-2 text-sm text-admin-semantic-error">
              {groupError}
            </div>
          )}
          {groupSuccess && (
            <div className="rounded-md border border-green-300 bg-green-50 p-2 text-sm text-green-700">
              {groupSuccess}
            </div>
          )}

          {groupData && groupData.groups.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-admin-text-tertiary">{groupData.groups.length} グループ</p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {groupData.groups.map(g => (
                  <div key={g.id} className="rounded-lg border border-admin-border-primary bg-white p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-admin-text-primary">{g.name}</span>
                      <span className="text-xs text-admin-text-tertiary">{g.members.length}人</span>
                    </div>
                    <p className="text-xs text-admin-accent-primary mb-2">テーマ: {g.theme.title}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {g.members.map(m => (
                        <span key={m.id} className="inline-flex items-center rounded-full bg-admin-accent-primary/10 px-2.5 py-0.5 text-xs font-medium text-admin-accent-primary">
                          {m.name || '名前なし'}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {groupData && groupData.groups.length === 0 && (
            <p className="text-sm text-admin-text-tertiary">
              まだグループが作成されていません。生徒がテーマを選択した後、「自動グルーピング実行」を押してください。
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Button tone="admin" onClick={() => router.push(`/admin/session/${encodeURIComponent(sessionId)}/students`)}>
          参加者一覧
        </Button>
        <Button tone="admin" onClick={() => router.push(`/admin/session/${encodeURIComponent(sessionId)}/responses`)}>
          回答分布
        </Button>
        <Button tone="admin" onClick={() => router.push(`/admin/session/${encodeURIComponent(sessionId)}/survey`)}>
          教育効果アンケート
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
