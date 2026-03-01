'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Accordion, Button, Card, CardContent, CardHeader, CardTitle, LoadingSpinner } from '@/components/ui'
import { fetchWithRetry } from '@/lib/fetch-with-retry'

type StatRow = {
  id: string
  text: string
  mean: number
  count: number
}

type DeltaRow = {
  id: string
  text: string
  preMean: number
  postMean: number
  delta: number
  pairCount: number
}

type FreeTextGroup = {
  id: string
  text: string
  responses: { studentLabel: string; text: string }[]
}

type SurveySummaryPayload = {
  session: { id: string; title: string }
  summary: {
    participantCount: number
    preSubmittedCount: number
    postSubmittedCount: number
    consentToResearchCount: number
    consentToQuoteCount: number
    postCompletedOnConsented: number
  }
  preLikertStats: StatRow[]
  postLikertStats: StatRow[]
  deltaStats: DeltaRow[]
  freeText: FreeTextGroup[]
}

export default function AdminSessionSurveyPage({ params }: { params: { id: string } }) {
  const sessionId = params.id
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<SurveySummaryPayload | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetchWithRetry(`/api/session/survey/summary?sessionId=${encodeURIComponent(sessionId)}`, {
          cache: 'no-store',
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error?.message || 'アンケート集計の取得に失敗しました')
        if (!cancelled) setData(json.data as SurveySummaryPayload)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'アンケート集計の取得に失敗しました')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [sessionId])

  const rates = useMemo(() => {
    if (!data) return { consentRate: 0, postRateOnConsented: 0 }
    const consentRate =
      data.summary.participantCount > 0
        ? Math.round((data.summary.consentToResearchCount / data.summary.participantCount) * 100)
        : 0
    const postRateOnConsented =
      data.summary.consentToResearchCount > 0
        ? Math.round((data.summary.postCompletedOnConsented / data.summary.consentToResearchCount) * 100)
        : 0
    return { consentRate, postRateOnConsented }
  }, [data])

  return (
    <main className="mx-auto max-w-6xl p-4 md:p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-body text-2xl font-bold text-admin-text-primary">教育効果アンケート</h1>
          <p className="mt-1 text-sm text-admin-text-tertiary">同意率と前後比較をセッション単位で確認します。</p>
          {data && <p className="mt-1 text-xs text-admin-text-tertiary">対象: {data.session.title}</p>}
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
        <div className="mb-4 rounded-md border border-admin-semantic-error/30 bg-red-50 p-3 text-sm text-admin-semantic-error">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center">
          <LoadingSpinner size="lg" className="border-admin-accent-primary border-r-transparent" />
        </div>
      ) : !data ? (
        <Card tone="admin">
          <CardContent>
            <p className="text-sm text-admin-text-tertiary">データがありません。</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card tone="admin">
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-6">
                <div className="rounded border border-admin-border-primary bg-admin-bg-secondary p-3">
                  <p className="text-admin-text-tertiary">参加者</p>
                  <p className="text-lg font-semibold text-admin-text-primary">{data.summary.participantCount}</p>
                </div>
                <div className="rounded border border-admin-border-primary bg-admin-bg-secondary p-3">
                  <p className="text-admin-text-tertiary">同意人数</p>
                  <p className="text-lg font-semibold text-admin-text-primary">{data.summary.consentToResearchCount}</p>
                </div>
                <div className="rounded border border-admin-border-primary bg-admin-bg-secondary p-3">
                  <p className="text-admin-text-tertiary">同意率</p>
                  <p className="text-lg font-semibold text-admin-text-primary">{rates.consentRate}%</p>
                </div>
                <div className="rounded border border-admin-border-primary bg-admin-bg-secondary p-3">
                  <p className="text-admin-text-tertiary">事前提出</p>
                  <p className="text-lg font-semibold text-admin-text-primary">{data.summary.preSubmittedCount}</p>
                </div>
                <div className="rounded border border-admin-border-primary bg-admin-bg-secondary p-3">
                  <p className="text-admin-text-tertiary">事後提出</p>
                  <p className="text-lg font-semibold text-admin-text-primary">{data.summary.postSubmittedCount}</p>
                </div>
                <div className="rounded border border-admin-border-primary bg-admin-bg-secondary p-3">
                  <p className="text-admin-text-tertiary">事後回収率</p>
                  <p className="text-lg font-semibold text-admin-text-primary">{rates.postRateOnConsented}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card tone="admin">
            <CardHeader>
              <CardTitle className="text-admin-text-primary">前後差（共通8項目）</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.deltaStats.map((row) => (
                  <div key={row.id} className="rounded border border-admin-border-primary bg-admin-bg-secondary p-3 text-sm">
                    <p className="text-admin-text-primary">{row.text}</p>
                    <p className="mt-1 text-xs text-admin-text-tertiary">
                      事前 {row.preMean} / 事後 {row.postMean} / 差分{' '}
                      <span className={row.delta >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                        {row.delta >= 0 ? '+' : ''}
                        {row.delta}
                      </span>{' '}
                      / ペア数 {row.pairCount}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card tone="admin">
            <CardHeader>
              <CardTitle className="text-admin-text-primary">平均スコア（事前/事後）</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion title="事前アンケート" defaultOpen>
                <div className="space-y-2 text-sm">
                  {data.preLikertStats.map((row) => (
                    <div key={row.id} className="rounded border border-admin-border-primary bg-admin-bg-secondary p-3">
                      <p className="text-admin-text-primary">{row.text}</p>
                      <p className="mt-1 text-xs text-admin-text-tertiary">
                        平均 {row.mean} / 回答数 {row.count}
                      </p>
                    </div>
                  ))}
                </div>
              </Accordion>
              <Accordion title="事後アンケート">
                <div className="space-y-2 text-sm">
                  {data.postLikertStats.map((row) => (
                    <div key={row.id} className="rounded border border-admin-border-primary bg-admin-bg-secondary p-3">
                      <p className="text-admin-text-primary">{row.text}</p>
                      <p className="mt-1 text-xs text-admin-text-tertiary">
                        平均 {row.mean} / 回答数 {row.count}
                      </p>
                    </div>
                  ))}
                </div>
              </Accordion>
            </CardContent>
          </Card>

          <Card tone="admin">
            <CardHeader>
              <CardTitle className="text-admin-text-primary">自由記述（匿名）</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.freeText.map((group) => (
                  <Accordion key={group.id} title={`${group.text} (${group.responses.length}件)`}>
                    {group.responses.length === 0 ? (
                      <p className="text-sm text-admin-text-tertiary">回答なし</p>
                    ) : (
                      <div className="space-y-2">
                        {group.responses.map((item, index) => (
                          <div key={`${item.studentLabel}-${index}`} className="rounded border border-admin-border-primary bg-admin-bg-secondary p-3 text-sm">
                            <p className="text-xs text-admin-text-tertiary">{item.studentLabel}</p>
                            <p className="mt-1 whitespace-pre-wrap text-admin-text-primary">{item.text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </Accordion>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  )
}
