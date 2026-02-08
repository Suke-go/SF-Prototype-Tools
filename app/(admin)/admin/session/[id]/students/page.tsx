'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, CardContent, CardHeader, CardTitle, LoadingSpinner } from '@/components/ui'
import { fetchWithRetry } from '@/lib/fetch-with-retry'

type StudentRow = {
  id: string
  name: string | null
  progressStatus: string
  joinedAt: string
  lastAccessAt: string
  responseCount: number
}

type Stats = {
  total: number
  notStarted: number
  bigFive: number
  themeSelection: number
  briefing: number
  questions: number
  completed: number
  questionCount: number
}

export default function AdminSessionStudentsPage({ params }: { params: { id: string } }) {
  const sessionId = params.id
  const router = useRouter()
  const [students, setStudents] = useState<StudentRow[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetchWithRetry(`/api/session/students?sessionId=${encodeURIComponent(sessionId)}`, { cache: 'no-store' })
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error?.message || '参加者データ取得に失敗しました')
        if (!cancelled) {
          setStudents(json?.data?.students || [])
          setStats(json?.data?.stats || null)
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : '参加者データ取得に失敗しました')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [sessionId])

  return (
    <main className="mx-auto max-w-6xl p-4 md:p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-body text-2xl font-bold text-admin-text-primary">参加者一覧</h1>
          <p className="mt-1 text-sm text-admin-text-tertiary">セッション参加者と進捗を表示します。</p>
        </div>
        <div className="flex gap-2">
          <Button tone="admin" variant="secondary" onClick={() => router.push(`/admin/session/${encodeURIComponent(sessionId)}`)}>
            セッション詳細へ
          </Button>
          <Button tone="admin" variant="secondary" onClick={() => router.push(`/admin/dashboard?sessionId=${encodeURIComponent(sessionId)}`)}>
            ダッシュボードへ
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-admin-semantic-error/30 bg-red-50 p-3 text-sm text-admin-semantic-error">{error}</div>
      )}

      {stats && (
        <Card tone="admin" className="mb-4">
          <CardHeader>
            <CardTitle className="text-admin-text-primary">統計</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
            <p>参加者: {stats.total}</p>
            <p>未開始: {stats.notStarted}</p>
            <p>Big Five: {stats.bigFive}</p>
            <p>テーマ選択: {stats.themeSelection}</p>
            <p>読み物: {stats.briefing}</p>
            <p>設問: {stats.questions}</p>
            <p>完了: {stats.completed}</p>
            <p>設問数: {stats.questionCount}</p>
          </CardContent>
        </Card>
      )}

      <Card tone="admin">
        <CardHeader>
          <CardTitle className="text-admin-text-primary">参加者</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center">
              <LoadingSpinner size="lg" className="border-admin-accent-primary border-r-transparent" />
            </div>
          ) : students.length === 0 ? (
            <p className="text-sm text-admin-text-tertiary">参加者がいません。</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-admin-border-primary text-left text-admin-text-tertiary">
                    <th className="px-3 py-2">名前</th>
                    <th className="px-3 py-2">ID</th>
                    <th className="px-3 py-2">進捗</th>
                    <th className="px-3 py-2">回答数</th>
                    <th className="px-3 py-2">参加時刻</th>
                    <th className="px-3 py-2">最終アクセス</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id} className="border-b border-admin-border-primary/50">
                      <td className="px-3 py-2 text-admin-text-primary">{student.name || '匿名'}</td>
                      <td className="px-3 py-2 font-mono text-xs text-admin-text-tertiary">{student.id}</td>
                      <td className="px-3 py-2 text-admin-text-secondary">{student.progressStatus}</td>
                      <td className="px-3 py-2 text-admin-text-secondary">{student.responseCount}</td>
                      <td className="px-3 py-2 text-admin-text-secondary">{new Date(student.joinedAt).toLocaleString('ja-JP')}</td>
                      <td className="px-3 py-2 text-admin-text-secondary">{new Date(student.lastAccessAt).toLocaleString('ja-JP')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
