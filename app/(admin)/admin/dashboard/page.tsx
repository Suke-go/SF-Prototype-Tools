'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Accordion, Button, Card, CardContent, CardHeader, CardTitle, Input, LoadingSpinner } from '@/components/ui'

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
  questions: number
  completed: number
  questionCount: number
}

type SSEData = {
  sessionStatus: string
  total: number
  notStarted: number
  bigFive: number
  themeSelection: number
  questions: number
  completed: number
  questionCount: number
  totalResponses: number
  timestamp: string
}

type Session = {
  id: string
  title: string
  description: string | null
  themeId: string
  status: 'PREPARING' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'
  maxParticipants: number
  currentParticipants: number
}

const PROGRESS_LABELS: Record<string, string> = {
  NOT_STARTED: '未開始',
  BIG_FIVE: 'Big Five',
  THEME_SELECTION: 'テーマ選択',
  MAIN_PAGE: 'メインページ',
  GROUP_ACTIVITY: 'グループ活動',
  QUESTIONS: '質問回答中',
  COMPLETED: '完了',
}

export default function AdminDashboardPage() {
  const [sessionId, setSessionId] = useState('')
  const [session, setSession] = useState<Session | null>(null)
  const [students, setStudents] = useState<StudentRow[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [bigFiveAvg, setBigFiveAvg] = useState<BigFive | null>(null)
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sseData, setSseData] = useState<SSEData | null>(null)
  const [sortKey, setSortKey] = useState<'joinedAt' | 'progressStatus' | 'responseCount'>('joinedAt')
  const [sortAsc, setSortAsc] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('ALL')

  const sseRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const url = new URL(window.location.href)
    const id = url.searchParams.get('sessionId') || localStorage.getItem('admin:lastSessionId') || ''
    setSessionId(id)
    if (id) {
      fetchSession(id)
      fetchStudents(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // SSE接続
  useEffect(() => {
    if (!sessionId || !session) return
    const es = new EventSource(`/api/events/session/progress?sessionId=${encodeURIComponent(sessionId)}`)
    sseRef.current = es
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as SSEData
        setSseData(data)
      } catch { /* ignore */ }
    }
    es.onerror = () => {
      // 自動再接続はEventSourceが処理
    }
    return () => {
      es.close()
      sseRef.current = null
    }
  }, [sessionId, session])

  // SSEデータ更新時に学生リストをリフレッシュ（15秒ごと）
  const lastRefresh = useRef(0)
  useEffect(() => {
    if (!sseData || !sessionId) return
    const now = Date.now()
    if (now - lastRefresh.current > 15000) {
      lastRefresh.current = now
      fetchStudents(sessionId)
    }
  }, [sseData, sessionId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchSession(id: string) {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/session?sessionId=${encodeURIComponent(id)}`, { cache: 'no-store' })
      const ct = res.headers.get('content-type') || ''
      if (!ct.includes('application/json')) throw new Error('サーバーエラー（DB未設定の可能性）')
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error?.message || 'セッション取得に失敗しました')
      setSession(json.data.session)
      localStorage.setItem('admin:lastSessionId', id)
    } catch (e) {
      setSession(null)
      setError(e instanceof Error ? e.message : 'セッション取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  async function fetchStudents(id: string) {
    try {
      const res = await fetch(`/api/session/students?sessionId=${encodeURIComponent(id)}`, { cache: 'no-store' })
      const ct = res.headers.get('content-type') || ''
      if (!ct.includes('application/json')) return
      const json = await res.json()
      if (res.ok) {
        setStudents(json.data.students)
        setStats(json.data.stats)
        setBigFiveAvg(json.data.bigFiveAvg)
      }
    } catch { /* silent */ }
  }

  async function updateStatus(nextStatus: Session['status']) {
    if (!sessionId) return
    try {
      setUpdating(true)
      setError(null)
      const res = await fetch(`/api/session?sessionId=${encodeURIComponent(sessionId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      const ct = res.headers.get('content-type') || ''
      if (!ct.includes('application/json')) throw new Error('サーバーエラー')
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error?.message || '更新に失敗しました')
      await fetchSession(sessionId)
    } catch (e) {
      setError(e instanceof Error ? e.message : '更新に失敗しました')
    } finally {
      setUpdating(false)
    }
  }

  const shareUrl = useMemo(() => {
    if (!sessionId || typeof window === 'undefined') return ''
    return `${window.location.origin}/student/session/${sessionId}`
  }, [sessionId])

  // ソート＋フィルター
  const filteredStudents = useMemo(() => {
    let list = [...students]
    if (filterStatus !== 'ALL') {
      list = list.filter((s) => s.progressStatus === filterStatus)
    }
    list.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'joinedAt') cmp = new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()
      else if (sortKey === 'progressStatus') cmp = a.progressStatus.localeCompare(b.progressStatus)
      else if (sortKey === 'responseCount') cmp = a.responseCount - b.responseCount
      return sortAsc ? cmp : -cmp
    })
    return list
  }, [students, filterStatus, sortKey, sortAsc])

  function handleSort(key: typeof sortKey) {
    if (sortKey === key) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(true) }
  }

  function handleLoad() {
    if (!sessionId) return
    fetchSession(sessionId)
    fetchStudents(sessionId)
  }

  const handleExport = useCallback((format: 'json' | 'csv') => {
    if (!sessionId) return
    window.open(`/api/session/export?sessionId=${encodeURIComponent(sessionId)}&format=${format}`, '_blank')
  }, [sessionId])

  // 回答分布の計算
  const liveStats = sseData || (stats ? {
    total: stats.total,
    notStarted: stats.notStarted,
    bigFive: stats.bigFive,
    themeSelection: stats.themeSelection,
    questions: stats.questions,
    completed: stats.completed,
    questionCount: stats.questionCount,
    totalResponses: students.reduce((s, st) => s + st.responseCount, 0),
    sessionStatus: session?.status || 'PREPARING',
    timestamp: new Date().toISOString(),
  } : null)

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-8">
      {/* ヘッダー */}
      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div className="flex-1">
          <h1 className="font-body text-2xl font-bold text-admin-text-primary">管理者ダッシュボード</h1>
          {sseData && (
            <p className="mt-1 text-xs text-admin-text-tertiary">
              リアルタイム更新中 · 最終: {new Date(sseData.timestamp).toLocaleTimeString('ja-JP')}
            </p>
          )}
        </div>
        <div className="flex items-end gap-2">
          <div className="w-72">
            <Input
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              placeholder="セッションID (UUID)"
              className="bg-admin-bg-primary text-admin-text-primary border-admin-border-primary text-sm"
            />
          </div>
          <Button
            onClick={handleLoad}
            disabled={!sessionId || loading}
            className="bg-admin-accent-primary text-white hover:brightness-110 text-sm"
          >
            {loading ? '取得中...' : '取得'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-admin-border-primary bg-admin-bg-secondary p-3 text-admin-text-primary">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" className="border-admin-accent-primary border-r-transparent" />
        </div>
      )}

      {session && (
        <div className="space-y-6">
          {/* セッション情報バー */}
          <Card tone="admin" className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-admin-text-primary">{session.title}</div>
                <div className="text-sm text-admin-text-tertiary">
                  状態: <span className="font-medium text-admin-text-primary">{session.status}</span>
                  {' · '}参加者: <span className="font-medium text-admin-text-primary">{liveStats?.total ?? session.currentParticipants} / {session.maxParticipants}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={updating || session.status === 'ACTIVE'}
                  onClick={() => updateStatus('ACTIVE')}
                  className="bg-admin-accent-primary text-white hover:brightness-110 text-sm"
                >
                  進行開始
                </Button>
                <Button
                  disabled={updating || session.status === 'COMPLETED'}
                  onClick={() => updateStatus('COMPLETED')}
                  className="bg-admin-accent-secondary text-white hover:brightness-110 text-sm"
                >
                  完了
                </Button>
                <Button
                  variant="secondary"
                  disabled={updating}
                  onClick={() => updateStatus('ARCHIVED')}
                  className="border-admin-border-primary text-admin-text-primary hover:bg-admin-bg-secondary text-sm"
                >
                  アーカイブ
                </Button>
              </div>
            </div>
            <div className="mt-3 text-xs text-admin-text-tertiary">
              共有URL: <span className="font-mono text-admin-text-secondary break-all">{shareUrl}</span>
            </div>
          </Card>

          {/* 3カラムレイアウト */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px_240px]">
            {/* 左: 学生一覧 */}
            <Card tone="admin" className="overflow-hidden p-0">
              <div className="border-b border-admin-border-primary px-4 py-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-medium text-admin-text-primary">学生一覧</h2>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="rounded border border-admin-border-primary bg-admin-bg-primary px-2 py-1 text-xs text-admin-text-primary"
                  >
                    <option value="ALL">すべて</option>
                    <option value="NOT_STARTED">未開始</option>
                    <option value="BIG_FIVE">Big Five</option>
                    <option value="THEME_SELECTION">テーマ選択</option>
                    <option value="QUESTIONS">質問回答中</option>
                    <option value="COMPLETED">完了</option>
                  </select>
                </div>
              </div>
              <div className="max-h-[500px] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-admin-bg-secondary text-admin-text-tertiary">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">学生</th>
                      <th
                        className="cursor-pointer px-3 py-2 text-left font-medium hover:text-admin-text-primary"
                        onClick={() => handleSort('progressStatus')}
                      >
                        進捗 {sortKey === 'progressStatus' && (sortAsc ? '↑' : '↓')}
                      </th>
                      <th className="px-3 py-2 text-left font-medium">Big Five</th>
                      <th
                        className="cursor-pointer px-3 py-2 text-right font-medium hover:text-admin-text-primary"
                        onClick={() => handleSort('responseCount')}
                      >
                        回答 {sortKey === 'responseCount' && (sortAsc ? '↑' : '↓')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-admin-border-primary">
                    {filteredStudents.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-admin-text-tertiary">
                          学生がいません
                        </td>
                      </tr>
                    )}
                    {filteredStudents.map((s) => (
                      <tr key={s.id} className="hover:bg-admin-bg-secondary transition-colors">
                        <td className="px-4 py-2">
                          <div className="text-admin-text-primary">{s.name || '匿名'}</div>
                          <div className="text-xs text-admin-text-tertiary font-mono">{s.id.slice(0, 8)}</div>
                        </td>
                        <td className="px-3 py-2">
                          <span className={[
                            'inline-block rounded-full px-2 py-0.5 text-xs font-medium',
                            s.progressStatus === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                            s.progressStatus === 'QUESTIONS' ? 'bg-blue-100 text-blue-800' :
                            s.progressStatus === 'NOT_STARTED' ? 'bg-gray-100 text-gray-600' :
                            'bg-yellow-100 text-yellow-800',
                          ].join(' ')}>
                            {PROGRESS_LABELS[s.progressStatus] || s.progressStatus}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {s.bigFive ? (
                            <div className="flex gap-1 text-xs text-admin-text-secondary">
                              <span title="外向性">E{s.bigFive.extraversion}</span>
                              <span title="協調性">A{s.bigFive.agreeableness}</span>
                              <span title="誠実性">C{s.bigFive.conscientiousness}</span>
                              <span title="神経症傾向">N{s.bigFive.neuroticism}</span>
                              <span title="開放性">O{s.bigFive.openness}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-admin-text-tertiary">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <span className="font-mono text-admin-text-primary">{s.responseCount}</span>
                          <span className="text-admin-text-tertiary">/{liveStats?.questionCount ?? '?'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* 中央: 進捗統計 */}
            <Card tone="admin">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-body text-admin-text-primary">進捗統計</CardTitle>
              </CardHeader>
              <CardContent>
                {liveStats ? (
                  <div className="space-y-4">
                    {/* 進捗分布 */}
                    <div className="space-y-2">
                      {[
                        { label: '完了', value: liveStats.completed, color: 'bg-green-500' },
                        { label: '質問回答中', value: liveStats.questions, color: 'bg-blue-500' },
                        { label: 'テーマ選択', value: liveStats.themeSelection, color: 'bg-yellow-500' },
                        { label: 'Big Five', value: liveStats.bigFive, color: 'bg-purple-500' },
                        { label: '未開始', value: liveStats.notStarted, color: 'bg-gray-400' },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center gap-2">
                          <div className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                          <span className="flex-1 text-xs text-admin-text-secondary">{item.label}</span>
                          <span className="text-xs font-medium text-admin-text-primary">{item.value}</span>
                          <div className="w-16">
                            <div className="h-1.5 rounded-full bg-admin-bg-secondary">
                              <div
                                className={`h-full rounded-full ${item.color} transition-all duration-300`}
                                style={{ width: `${liveStats.total > 0 ? (item.value / liveStats.total) * 100 : 0}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 数値サマリー */}
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <div className="rounded-lg bg-admin-bg-secondary p-3 text-center">
                        <div className="text-2xl font-bold text-admin-text-primary">{liveStats.total}</div>
                        <div className="text-xs text-admin-text-tertiary">参加者</div>
                      </div>
                      <div className="rounded-lg bg-admin-bg-secondary p-3 text-center">
                        <div className="text-2xl font-bold text-admin-text-primary">{liveStats.totalResponses}</div>
                        <div className="text-xs text-admin-text-tertiary">総回答数</div>
                      </div>
                      <div className="rounded-lg bg-admin-bg-secondary p-3 text-center">
                        <div className="text-2xl font-bold text-admin-text-primary">
                          {liveStats.total > 0 ? Math.round((liveStats.completed / liveStats.total) * 100) : 0}%
                        </div>
                        <div className="text-xs text-admin-text-tertiary">完了率</div>
                      </div>
                      <div className="rounded-lg bg-admin-bg-secondary p-3 text-center">
                        <div className="text-2xl font-bold text-admin-text-primary">{liveStats.questionCount}</div>
                        <div className="text-xs text-admin-text-tertiary">質問数</div>
                      </div>
                    </div>

                    {/* Big Five平均 */}
                    {bigFiveAvg && (
                      <div className="pt-2">
                        <div className="mb-2 text-xs font-medium text-admin-text-secondary">Big Five 平均</div>
                        <div className="space-y-1">
                          {([
                            ['外向性', bigFiveAvg.extraversion],
                            ['協調性', bigFiveAvg.agreeableness],
                            ['誠実性', bigFiveAvg.conscientiousness],
                            ['神経症傾向', bigFiveAvg.neuroticism],
                            ['開放性', bigFiveAvg.openness],
                          ] as [string, number][]).map(([label, val]) => (
                            <div key={label} className="flex items-center gap-2">
                              <span className="w-16 text-xs text-admin-text-tertiary">{label}</span>
                              <div className="flex-1">
                                <div className="h-1.5 rounded-full bg-admin-bg-secondary">
                                  <div
                                    className="h-full rounded-full bg-admin-accent-primary transition-all duration-300"
                                    style={{ width: `${(val / 8) * 100}%` }}
                                  />
                                </div>
                              </div>
                              <span className="w-8 text-right text-xs font-mono text-admin-text-primary">{val}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-admin-text-tertiary">セッションを選択してください</p>
                )}
              </CardContent>
            </Card>

            {/* 右: アクション */}
            <div className="space-y-4">
              <Card tone="admin">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-body text-admin-text-primary">アクション</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Button
                      onClick={() => handleExport('csv')}
                      disabled={!sessionId}
                      variant="secondary"
                      className="w-full border-admin-border-primary text-admin-text-primary hover:bg-admin-bg-secondary text-sm"
                    >
                      CSV エクスポート
                    </Button>
                    <Button
                      onClick={() => handleExport('json')}
                      disabled={!sessionId}
                      variant="secondary"
                      className="w-full border-admin-border-primary text-admin-text-primary hover:bg-admin-bg-secondary text-sm"
                    >
                      JSON エクスポート
                    </Button>
                    <Button
                      onClick={() => fetchStudents(sessionId)}
                      disabled={!sessionId}
                      variant="secondary"
                      className="w-full border-admin-border-primary text-admin-text-primary hover:bg-admin-bg-secondary text-sm"
                    >
                      データ更新
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card tone="admin">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-body text-admin-text-primary">接続状態</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${sseData ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <span className="text-xs text-admin-text-secondary">
                      {sseData ? 'リアルタイム接続中' : '未接続'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
