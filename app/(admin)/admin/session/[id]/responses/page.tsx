'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, CardContent, CardHeader, CardTitle, LoadingSpinner } from '@/components/ui'
import { fetchWithRetry } from '@/lib/fetch-with-retry'

type SessionResponses = {
  sessionId: string
  questions: { id: string; order: number; text: string }[]
  students: { id: string; name: string | null; progressStatus: string }[]
  responseMap: Record<string, Record<string, 'YES' | 'NO' | 'UNKNOWN'>>
}

export default function AdminSessionResponsesPage({ params }: { params: { id: string } }) {
  const sessionId = params.id
  const router = useRouter()
  const [data, setData] = useState<SessionResponses | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetchWithRetry(`/api/session/responses?sessionId=${encodeURIComponent(sessionId)}`, { cache: 'no-store' })
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error?.message || '回答データ取得に失敗しました')
        if (!cancelled) setData(json?.data || null)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : '回答データ取得に失敗しました')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [sessionId])

  const rows = useMemo(() => {
    if (!data) return []
    return data.questions.map((question) => {
      let yes = 0
      let no = 0
      let unknown = 0
      for (const responses of Object.values(data.responseMap)) {
        const value = responses[question.id]
        if (value === 'YES') yes += 1
        else if (value === 'NO') no += 1
        else unknown += 1
      }
      const total = yes + no + unknown || 1
      return {
        ...question,
        yes,
        no,
        unknown,
        yesPct: Math.round((yes / total) * 100),
        noPct: Math.round((no / total) * 100),
        unknownPct: Math.round((unknown / total) * 100),
      }
    })
  }, [data])

  return (
    <main className="mx-auto max-w-6xl p-4 md:p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-body text-2xl font-bold text-admin-text-primary">回答分析</h1>
          <p className="mt-1 text-sm text-admin-text-tertiary">設問ごとの YES / NO / UNKNOWN 分布です。</p>
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

      <Card tone="admin">
        <CardHeader>
          <CardTitle className="text-admin-text-primary">分布</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center">
              <LoadingSpinner size="lg" className="border-admin-accent-primary border-r-transparent" />
            </div>
          ) : !data ? (
            <p className="text-sm text-admin-text-tertiary">データがありません。</p>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-admin-text-tertiary">
                参加者 {data.students.length}名 / 設問 {data.questions.length}件
              </p>
              {rows.map((row) => (
                <div key={row.id} className="rounded-md border border-admin-border-primary bg-admin-bg-secondary p-3">
                  <p className="text-sm text-admin-text-primary">
                    Q{row.order}. {row.text}
                  </p>
                  <div className="mt-2 flex h-3 w-full overflow-hidden rounded-full">
                    <div className="bg-emerald-500" style={{ width: `${row.yesPct}%` }} />
                    <div className="bg-amber-400" style={{ width: `${row.unknownPct}%` }} />
                    <div className="bg-rose-400" style={{ width: `${row.noPct}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-admin-text-tertiary">
                    YES {row.yes} ({row.yesPct}%) / UNKNOWN {row.unknown} ({row.unknownPct}%) / NO {row.no} ({row.noPct}%)
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
