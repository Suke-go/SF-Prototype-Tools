'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, CardContent, CardHeader, CardTitle, LoadingSpinner } from '@/components/ui'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { SessionShareCard } from '@/components/common/SessionShareCard'
import { fetchWithRetry } from '@/lib/fetch-with-retry'

type BigFive = {
  extraversion: number
  agreeableness: number
  conscientiousness: number
  neuroticism: number
  openness: number
}

type StudentRow = {
  id: string
  name: string | null
  progressStatus: string
  joinedAt: string
  lastAccessAt: string
  bigFive: BigFive | null
  responseCount: number
}

type Stats = {
  total: number
  notStarted: number
  bigFive: number
  themeSelection: number
  briefing?: number
  questions: number
  completed: number
  questionCount: number
  totalResponses?: number
  timestamp?: string
  sessionStatus?: 'PREPARING' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'
}

type Session = {
  id: string
  sessionCode: string | null
  title: string
  description: string | null
  themeId: string
  status: 'PREPARING' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'
  maxParticipants: number
  currentParticipants: number
}

type SessionSummary = {
  id: string
  sessionCode: string | null
  title: string
  status: 'PREPARING' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'
  participantCount: number
  createdAt: string
}

const PROGRESS_LABELS: Record<string, string> = {
  NOT_STARTED: '未開始',
  BIG_FIVE: 'Big Five',
  THEME_SELECTION: 'テーマ選択',
  BRIEFING: '読み物',
  QUESTIONS: '設問回答',
  COMPLETED: '完了',
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [selectedSessionId, setSelectedSessionId] = useState('')
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [session, setSession] = useState<Session | null>(null)
  const [students, setStudents] = useState<StudentRow[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [bigFiveAvg, setBigFiveAvg] = useState<BigFive | null>(null)
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [confirmAction, setConfirmAction] = useState<'complete' | 'archive' | null>(null)
  const [exportPreviewFormat, setExportPreviewFormat] = useState<'csv' | 'json' | null>(null)
  const [resetTarget, setResetTarget] = useState<StudentRow | null>(null)
  const [liveStats, setLiveStats] = useState<Stats | null>(null)
  const [liveConnected, setLiveConnected] = useState(false)

  const loadSessionBundle = useCallback(async (sessionId: string) => {
    if (!sessionId) return
    try {
      setLoading(true)
      setError(null)

      const [sessionRes, studentsRes] = await Promise.all([
        fetchWithRetry(`/api/session?sessionId=${encodeURIComponent(sessionId)}`, { cache: 'no-store' }),
        fetchWithRetry(`/api/session/students?sessionId=${encodeURIComponent(sessionId)}`, { cache: 'no-store' }),
      ])

      const [sessionJson, studentsJson] = await Promise.all([sessionRes.json(), studentsRes.json()])

      if (!sessionRes.ok) throw new Error(sessionJson?.error?.message || 'セッション取得に失敗しました')
      if (!studentsRes.ok) throw new Error(studentsJson?.error?.message || '参加者取得に失敗しました')

      setSession(sessionJson.data.session)
      setStudents(studentsJson.data.students)
      setStats(studentsJson.data.stats)
      setLiveStats(null)
      setBigFiveAvg(studentsJson.data.bigFiveAvg)
      localStorage.setItem('admin:lastSessionId', sessionId)
    } catch (err) {
      setSession(null)
      setStudents([])
      setStats(null)
      setLiveStats(null)
      setBigFiveAvg(null)
      setError(err instanceof Error ? err.message : 'データ取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      try {
        const auth = await fetch('/api/auth/teacher/me', { cache: 'no-store' })
        if (!auth.ok) {
          router.push('/admin')
          return
        }

        const listRes = await fetchWithRetry('/api/session', { cache: 'no-store' })
        const listJson = await listRes.json()
        if (!listRes.ok) throw new Error(listJson?.error?.message || 'セッション一覧の取得に失敗しました')

        const items: SessionSummary[] = listJson?.data?.sessions || []
        if (cancelled) return

        setSessions(items)
        const url = new URL(window.location.href)
        const initialId = url.searchParams.get('sessionId') || localStorage.getItem('admin:lastSessionId') || items[0]?.id || ''
        setSelectedSessionId(initialId)
        setReady(true)

        if (initialId) {
          await loadSessionBundle(initialId)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '初期化に失敗しました')
          setReady(true)
        }
      }
    }

    void bootstrap()
    return () => {
      cancelled = true
    }
  }, [loadSessionBundle, router])

  useEffect(() => {
    if (!selectedSessionId || typeof window === 'undefined') {
      setLiveConnected(false)
      setLiveStats(null)
      return
    }

    let source: EventSource | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let disposed = false

    const clearReconnect = () => {
      if (!reconnectTimer) return
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }

    const closeSource = () => {
      if (!source) return
      source.close()
      source = null
      setLiveConnected(false)
    }

    const scheduleReconnect = () => {
      if (disposed || reconnectTimer || document.visibilityState === 'hidden') return
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null
        connect()
      }, 3000)
    }

    const connect = () => {
      if (disposed || document.visibilityState === 'hidden') return
      closeSource()
      source = new EventSource(`/api/events/session/progress?sessionId=${encodeURIComponent(selectedSessionId)}`)
      source.onopen = () => {
        clearReconnect()
        setLiveConnected(true)
      }
      source.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as Stats
          setLiveStats(payload)
          if (payload.sessionStatus) {
            setSession((prev) => (prev ? { ...prev, status: payload.sessionStatus! } : prev))
          }
        } catch {
          // ignore invalid payload
        }
      }
      source.onerror = () => {
        closeSource()
        scheduleReconnect()
      }
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        closeSource()
        clearReconnect()
        return
      }
      connect()
    }

    const handleOnline = () => connect()

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('online', handleOnline)
    connect()

    return () => {
      disposed = true
      clearReconnect()
      closeSource()
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('online', handleOnline)
    }
  }, [selectedSessionId])

  async function updateStatus(nextStatus: Session['status']) {
    if (!selectedSessionId) return
    try {
      setUpdating(true)
      const res = await fetchWithRetry(`/api/session?sessionId=${encodeURIComponent(selectedSessionId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error?.message || 'ステータス更新に失敗しました')
      await loadSessionBundle(selectedSessionId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ステータス更新に失敗しました')
    } finally {
      setUpdating(false)
      setConfirmAction(null)
    }
  }

  const handleExport = useCallback(() => {
    if (!selectedSessionId || !exportPreviewFormat) return
    window.open(`/api/session/export?sessionId=${encodeURIComponent(selectedSessionId)}&format=${exportPreviewFormat}`, '_blank')
    setExportPreviewFormat(null)
  }, [exportPreviewFormat, selectedSessionId])

  const handleResetBigFive = useCallback(
    async () => {
      if (!selectedSessionId || !resetTarget) return
      try {
        const res = await fetchWithRetry('/api/session/students/reset-big-five', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: selectedSessionId, studentId: resetTarget.id }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error?.message || 'Big Fiveリセットに失敗しました')
        await loadSessionBundle(selectedSessionId)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Big Fiveリセットに失敗しました')
      } finally {
        setResetTarget(null)
      }
    },
    [loadSessionBundle, resetTarget, selectedSessionId]
  )

  const shareUrl = useMemo(() => {
    if (!selectedSessionId || typeof window === 'undefined') return ''
    return `${window.location.origin}/student/session/${selectedSessionId}`
  }, [selectedSessionId])

  const filteredStudents = useMemo(() => {
    if (filterStatus === 'ALL') return students
    return students.filter((student) => student.progressStatus === filterStatus)
  }, [students, filterStatus])

  const displayStats = liveStats ?? stats

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" className="border-admin-accent-primary border-r-transparent" />
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-8">
      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div className="flex-1">
          <h1 className="font-body text-2xl font-bold text-admin-text-primary">教員ダッシュボード</h1>
          <p className="mt-1 text-sm text-admin-text-tertiary">セッション進行と参加者状況を管理します。</p>
          {selectedSessionId && (
            <p className="mt-2 text-xs text-admin-text-tertiary">
              ライブ更新: <span className={liveConnected ? 'text-green-700' : 'text-amber-700'}>{liveConnected ? '接続中' : '再接続中'}</span>
            </p>
          )}
        </div>
        <div className="flex items-end gap-2">
          <Button tone="admin" variant="secondary" onClick={() => router.push('/admin/session/new')}>
            新規作成
          </Button>
          <Button tone="admin" variant="secondary" onClick={() => router.push('/admin/board')}>
            一覧へ
          </Button>
          <div className="w-80">
            <label className="mb-1 block text-xs text-admin-text-tertiary">セッション</label>
            <select
              value={selectedSessionId}
              onChange={(event) => {
                const nextId = event.target.value
                setSelectedSessionId(nextId)
                if (nextId) void loadSessionBundle(nextId)
              }}
              className="w-full rounded-md border border-admin-border-primary bg-admin-bg-primary px-3 py-2 text-sm text-admin-text-primary"
            >
              {!selectedSessionId && <option value="">選択してください</option>}
              {sessions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title} {item.sessionCode ? `(${item.sessionCode})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-admin-border-primary bg-admin-bg-secondary p-3 text-admin-text-primary">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {session && (
        <div className="space-y-6">
          <Card tone="admin" className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-admin-text-primary">{session.title}</div>
                <div className="text-sm text-admin-text-tertiary">
                  状態: <span className="font-medium text-admin-text-primary">{session.status}</span>
                  {' / '}参加者:{' '}
                  <span className="font-medium text-admin-text-primary">
                    {displayStats?.total ?? session.currentParticipants} / {session.maxParticipants}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button tone="admin" disabled={updating || session.status === 'ACTIVE'} onClick={() => void updateStatus('ACTIVE')}>
                  開始
                </Button>
                <Button tone="admin" disabled={updating || session.status === 'COMPLETED'} onClick={() => setConfirmAction('complete')}>
                  完了
                </Button>
                <Button tone="admin" variant="secondary" disabled={updating} onClick={() => setConfirmAction('archive')}>
                  アーカイブ
                </Button>
              </div>
            </div>
            <div className="mt-3 text-xs text-admin-text-tertiary">SessionCode: {session.sessionCode || '-'}</div>
          </Card>

          <SessionShareCard sessionCode={session.sessionCode} sessionUrl={shareUrl} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px_260px]">
            <Card tone="admin" className="overflow-hidden p-0">
              <div className="border-b border-admin-border-primary px-4 py-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-medium text-admin-text-primary">参加者一覧</h2>
                  <select
                    value={filterStatus}
                    onChange={(event) => setFilterStatus(event.target.value)}
                    className="rounded border border-admin-border-primary bg-admin-bg-primary px-2 py-1 text-xs text-admin-text-primary"
                  >
                    <option value="ALL">すべて</option>
                    {Object.keys(PROGRESS_LABELS).map((status) => (
                      <option key={status} value={status}>
                        {PROGRESS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="max-h-[560px] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-admin-bg-secondary text-admin-text-tertiary">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">生徒</th>
                      <th className="px-3 py-2 text-left font-medium">進捗</th>
                      <th className="px-3 py-2 text-right font-medium">回答</th>
                      <th className="px-3 py-2 text-right font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-admin-border-primary">
                    {filteredStudents.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-admin-text-tertiary">
                          参加者データがありません
                        </td>
                      </tr>
                    )}
                    {filteredStudents.map((student) => (
                      <tr key={student.id} className="transition-colors hover:bg-admin-bg-secondary">
                        <td className="px-4 py-2">
                          <div className="text-admin-text-primary">{student.name || '匿名'}</div>
                          <div className="font-mono text-xs text-admin-text-tertiary">{student.id.slice(0, 8)}</div>
                        </td>
                        <td className="px-3 py-2">
                          <span className="inline-block rounded-full bg-admin-bg-secondary px-2 py-0.5 text-xs font-medium text-admin-text-primary">
                            {PROGRESS_LABELS[student.progressStatus] || student.progressStatus}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <span className="font-mono text-admin-text-primary">{student.responseCount}</span>
                          <span className="text-admin-text-tertiary">/{displayStats?.questionCount ?? '?'}</span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button onClick={() => setResetTarget(student)} className="text-xs text-admin-accent-primary hover:underline">
                            Big Fiveリセット
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card tone="admin">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-body text-admin-text-primary">進捗統計</CardTitle>
              </CardHeader>
              <CardContent>
                {displayStats ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>未開始</span>
                      <span>{displayStats.notStarted}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Big Five</span>
                      <span>{displayStats.bigFive}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>テーマ選択</span>
                      <span>{displayStats.themeSelection}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>読み物</span>
                      <span>{displayStats.briefing ?? 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>設問回答</span>
                      <span>{displayStats.questions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>完了</span>
                      <span>{displayStats.completed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>回答総数</span>
                      <span>{displayStats.totalResponses ?? '-'}</span>
                    </div>
                    {bigFiveAvg && (
                      <div className="mt-3 border-t border-admin-border-primary pt-3 text-xs">
                        <p className="mb-2 text-admin-text-secondary">Big Five平均</p>
                        <p>E {bigFiveAvg.extraversion} / A {bigFiveAvg.agreeableness} / C {bigFiveAvg.conscientiousness}</p>
                        <p>N {bigFiveAvg.neuroticism} / O {bigFiveAvg.openness}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-admin-text-tertiary">セッションを選択してください</p>
                )}
              </CardContent>
            </Card>

            <Card tone="admin">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-body text-admin-text-primary">アクション</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button tone="admin" onClick={() => setExportPreviewFormat('csv')} disabled={!selectedSessionId} variant="secondary" className="w-full text-sm">
                    CSV出力
                  </Button>
                  <Button tone="admin" onClick={() => setExportPreviewFormat('json')} disabled={!selectedSessionId} variant="secondary" className="w-full text-sm">
                    JSON出力
                  </Button>
                  <Button
                    tone="admin"
                    onClick={() => router.push(`/admin/session/${encodeURIComponent(selectedSessionId)}/students`)}
                    disabled={!selectedSessionId}
                    variant="secondary"
                    className="w-full text-sm"
                  >
                    参加者一覧へ
                  </Button>
                  <Button
                    tone="admin"
                    onClick={() => router.push(`/admin/session/${encodeURIComponent(selectedSessionId)}/responses`)}
                    disabled={!selectedSessionId}
                    variant="secondary"
                    className="w-full text-sm"
                  >
                    回答分析へ
                  </Button>
                  <Button
                    tone="admin"
                    onClick={() => router.push(`/admin/session/${encodeURIComponent(selectedSessionId)}/review`)}
                    disabled={!selectedSessionId}
                    variant="secondary"
                    className="w-full text-sm"
                  >
                    レビュー画面へ
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmAction === 'complete'}
        title="セッションを完了しますか？"
        description="進行中の生徒は回答を続けられますが、新規参加はできなくなります。"
        confirmLabel="完了する"
        destructive
        onConfirm={() => void updateStatus('COMPLETED')}
        onCancel={() => setConfirmAction(null)}
      />

      <ConfirmDialog
        open={confirmAction === 'archive'}
        title="セッションをアーカイブしますか？"
        description="アーカイブ後は一覧から非表示にできます。必要に応じて再開できます。"
        confirmLabel="アーカイブ"
        destructive
        onConfirm={() => void updateStatus('ARCHIVED')}
        onCancel={() => setConfirmAction(null)}
      />

      <ConfirmDialog
        open={Boolean(resetTarget)}
        title="Big Five結果をリセットしますか？"
        description={
          resetTarget
            ? `${resetTarget.name || '匿名の生徒'}のBig Five結果を削除し、進捗をBig Fiveへ戻します。`
            : undefined
        }
        confirmLabel="リセットする"
        destructive
        onConfirm={() => void handleResetBigFive()}
        onCancel={() => setResetTarget(null)}
      />

      <ConfirmDialog
        open={Boolean(exportPreviewFormat)}
        title="エクスポートの確認"
        description={
          exportPreviewFormat
            ? `${exportPreviewFormat.toUpperCase()}形式で出力します。対象: ${displayStats?.total ?? session?.currentParticipants ?? 0}名 / 設問数: ${
                displayStats?.questionCount ?? 0
              }`
            : undefined
        }
        confirmLabel="エクスポート"
        onConfirm={handleExport}
        onCancel={() => setExportPreviewFormat(null)}
      />
    </main>
  )
}
