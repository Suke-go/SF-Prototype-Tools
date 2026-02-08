'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, LoadingSpinner } from '@/components/ui'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { MOONSHOT_GOAL_TITLE_MAP } from '@/lib/moonshot/goals'

type ReviewLog = {
  id: string
  goalKey: string
  reflection: string
  updatedAt: string
  student: { id: string; name: string | null; progressStatus: string }
  review: {
    id: string
    rubricUnderstanding: number
    rubricEvidence: number
    rubricDialogue: number
    comment: string | null
    updatedAt: string
  } | null
}

type DraftReview = {
  rubricUnderstanding: number
  rubricEvidence: number
  rubricDialogue: number
  comment: string
}

export default function AdminReviewPage() {
  const router = useRouter()
  const [sessionId, setSessionId] = useState('')
  const [logs, setLogs] = useState<ReviewLog[]>([])
  const [drafts, setDrafts] = useState<Record<string, DraftReview>>({})
  const [loading, setLoading] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [bulkSaving, setBulkSaving] = useState(false)
  const [showBulkConfirm, setShowBulkConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bulkDraft, setBulkDraft] = useState<DraftReview>({
    rubricUnderstanding: 3,
    rubricEvidence: 3,
    rubricDialogue: 3,
    comment: '',
  })

  const goalTitleMap = useMemo(() => MOONSHOT_GOAL_TITLE_MAP, [])

  useEffect(() => {
    const url = new URL(window.location.href)
    const id = url.searchParams.get('sessionId') || localStorage.getItem('admin:lastSessionId') || ''
    setSessionId(id)
    if (id) void fetchLogs(id)
  }, [])

  async function fetchLogs(id: string) {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/session/review?sessionId=${encodeURIComponent(id)}`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error?.message || 'レビュー一覧の取得に失敗しました')
      const list: ReviewLog[] = json.data.logs
      setLogs(list)

      const initialDrafts: Record<string, DraftReview> = {}
      for (const log of list) {
        initialDrafts[log.id] = {
          rubricUnderstanding: log.review?.rubricUnderstanding ?? 3,
          rubricEvidence: log.review?.rubricEvidence ?? 3,
          rubricDialogue: log.review?.rubricDialogue ?? 3,
          comment: log.review?.comment ?? '',
        }
      }
      setDrafts(initialDrafts)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'レビュー一覧の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  function updateDraft(logId: string, patch: Partial<DraftReview>) {
    setDrafts((prev) => ({
      ...prev,
      [logId]: {
        ...(prev[logId] || { rubricUnderstanding: 3, rubricEvidence: 3, rubricDialogue: 3, comment: '' }),
        ...patch,
      },
    }))
  }

  async function save(logId: string) {
    const draft = drafts[logId]
    if (!draft) return

    try {
      setSavingId(logId)
      setError(null)
      const res = await fetch('/api/session/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ learningLogId: logId, ...draft }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error?.message || 'レビュー保存に失敗しました')
      if (sessionId) await fetchLogs(sessionId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'レビュー保存に失敗しました')
    } finally {
      setSavingId(null)
    }
  }

  async function saveBulk(logIds: string[]) {
    if (logIds.length === 0 || bulkSaving) return
    try {
      setBulkSaving(true)
      setError(null)
      for (const logId of logIds) {
        const res = await fetch('/api/session/review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ learningLogId: logId, ...bulkDraft }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error?.message || '一括レビュー保存に失敗しました')
      }
      if (sessionId) await fetchLogs(sessionId)
    } catch (err) {
      setError(err instanceof Error ? err.message : '一括レビュー保存に失敗しました')
    } finally {
      setBulkSaving(false)
      setShowBulkConfirm(false)
    }
  }

  const grouped = useMemo(() => {
    const groups: Record<string, ReviewLog[]> = {}
    for (const log of logs) {
      if (!groups[log.goalKey]) groups[log.goalKey] = []
      groups[log.goalKey].push(log)
    }
    return groups
  }, [logs])

  const summary = useMemo(() => {
    const reviewed = logs.filter((log) => log.review)
    const pending = logs.length - reviewed.length
    const avg = (key: 'rubricUnderstanding' | 'rubricEvidence' | 'rubricDialogue') => {
      if (reviewed.length === 0) return 0
      return Math.round((reviewed.reduce((sum, log) => sum + (log.review?.[key] || 0), 0) / reviewed.length) * 10) / 10
    }
    return {
      total: logs.length,
      pending,
      avgUnderstanding: avg('rubricUnderstanding'),
      avgEvidence: avg('rubricEvidence'),
      avgDialogue: avg('rubricDialogue'),
    }
  }, [logs])

  const pendingLogIds = useMemo(() => logs.filter((log) => !log.review).map((log) => log.id), [logs])

  function applyBulkToPending() {
    if (pendingLogIds.length === 0) return
    setDrafts((prev) => {
      const next = { ...prev }
      for (const logId of pendingLogIds) {
        next[logId] = {
          rubricUnderstanding: bulkDraft.rubricUnderstanding,
          rubricEvidence: bulkDraft.rubricEvidence,
          rubricDialogue: bulkDraft.rubricDialogue,
          comment: bulkDraft.comment,
        }
      }
      return next
    })
  }

  return (
    <main className="mx-auto max-w-6xl p-4 md:p-8">
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <h1 className="font-body text-2xl font-bold text-admin-text-primary">レビュー評価</h1>
          <p className="mt-1 text-sm text-admin-text-tertiary">観点: 理解・根拠・対話可能性（各1-4点）</p>
        </div>
        <div className="w-80">
          <Input
            value={sessionId}
            onChange={(event) => setSessionId(event.target.value)}
            placeholder="セッションID"
            className="border-admin-border-primary bg-admin-bg-primary text-admin-text-primary"
          />
        </div>
        <Button tone="admin" onClick={() => sessionId && void fetchLogs(sessionId)} disabled={!sessionId || loading}>
          {loading ? '読込中...' : '読み込む'}
        </Button>
        <Button tone="admin" variant="secondary" onClick={() => router.push(`/admin/board?sessionId=${encodeURIComponent(sessionId)}`)}>
          ボードへ
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-admin-border-primary bg-admin-bg-secondary p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && (
        <Card tone="admin" className="mb-6">
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-5">
              <div className="rounded border border-admin-border-primary bg-admin-bg-secondary p-3">
                <p className="text-admin-text-tertiary">対象件数</p>
                <p className="text-lg font-semibold text-admin-text-primary">{summary.total}</p>
              </div>
              <div className="rounded border border-admin-border-primary bg-admin-bg-secondary p-3">
                <p className="text-admin-text-tertiary">未評価</p>
                <p className="text-lg font-semibold text-admin-text-primary">{summary.pending}</p>
              </div>
              <div className="rounded border border-admin-border-primary bg-admin-bg-secondary p-3">
                <p className="text-admin-text-tertiary">理解平均</p>
                <p className="text-lg font-semibold text-admin-text-primary">{summary.avgUnderstanding}</p>
              </div>
              <div className="rounded border border-admin-border-primary bg-admin-bg-secondary p-3">
                <p className="text-admin-text-tertiary">根拠平均</p>
                <p className="text-lg font-semibold text-admin-text-primary">{summary.avgEvidence}</p>
              </div>
              <div className="rounded border border-admin-border-primary bg-admin-bg-secondary p-3">
                <p className="text-admin-text-tertiary">対話平均</p>
                <p className="text-lg font-semibold text-admin-text-primary">{summary.avgDialogue}</p>
              </div>
            </div>
            <div className="mt-4 rounded border border-admin-border-primary bg-admin-bg-secondary p-3">
              <p className="mb-2 text-sm font-medium text-admin-text-primary">未評価への一括設定</p>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                <label className="text-sm">
                  理解
                  <select
                    className="mt-1 block w-full rounded border border-admin-border-primary bg-admin-bg-primary px-2 py-1"
                    value={bulkDraft.rubricUnderstanding}
                    onChange={(event) => setBulkDraft((prev) => ({ ...prev, rubricUnderstanding: Number(event.target.value) }))}
                  >
                    {[1, 2, 3, 4].map((score) => (
                      <option key={score} value={score}>
                        {score}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  根拠
                  <select
                    className="mt-1 block w-full rounded border border-admin-border-primary bg-admin-bg-primary px-2 py-1"
                    value={bulkDraft.rubricEvidence}
                    onChange={(event) => setBulkDraft((prev) => ({ ...prev, rubricEvidence: Number(event.target.value) }))}
                  >
                    {[1, 2, 3, 4].map((score) => (
                      <option key={score} value={score}>
                        {score}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  対話可能性
                  <select
                    className="mt-1 block w-full rounded border border-admin-border-primary bg-admin-bg-primary px-2 py-1"
                    value={bulkDraft.rubricDialogue}
                    onChange={(event) => setBulkDraft((prev) => ({ ...prev, rubricDialogue: Number(event.target.value) }))}
                  >
                    {[1, 2, 3, 4].map((score) => (
                      <option key={score} value={score}>
                        {score}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="mt-2 block text-sm">
                コメント
                <textarea
                  className="mt-1 h-20 w-full rounded border border-admin-border-primary bg-admin-bg-primary px-2 py-1"
                  value={bulkDraft.comment}
                  onChange={(event) => setBulkDraft((prev) => ({ ...prev, comment: event.target.value }))}
                />
              </label>
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <Button tone="admin" variant="secondary" onClick={applyBulkToPending} disabled={pendingLogIds.length === 0}>
                  未評価に反映 ({pendingLogIds.length})
                </Button>
                <Button tone="admin" onClick={() => setShowBulkConfirm(true)} disabled={pendingLogIds.length === 0 || bulkSaving}>
                  {bulkSaving ? '保存中...' : '未評価を一括保存'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="py-10 text-center">
          <LoadingSpinner size="lg" className="border-admin-accent-primary border-r-transparent" />
        </div>
      )}

      {!loading &&
        Object.keys(grouped)
          .sort()
          .map((goalKey) => (
            <Card key={goalKey} tone="admin" className="mb-6">
              <CardHeader>
                <CardTitle className="font-body text-admin-text-primary">{goalTitleMap[goalKey] || goalKey}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {grouped[goalKey].map((log) => {
                    const draft = drafts[log.id]
                    return (
                      <div key={log.id} className="rounded-md border border-admin-border-primary bg-admin-bg-secondary p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-sm text-admin-text-primary">
                            生徒: {log.student.name || '匿名'} ({log.student.id.slice(0, 8)})
                          </p>
                          <p className="text-xs text-admin-text-tertiary">
                            最終更新: {new Date(log.updatedAt).toLocaleString('ja-JP')}
                          </p>
                        </div>
                        <p className="mb-3 whitespace-pre-wrap text-sm text-admin-text-secondary">{log.reflection}</p>

                        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                          <label className="text-sm">
                            理解
                            <select
                              className="mt-1 block w-full rounded border border-admin-border-primary bg-admin-bg-primary px-2 py-1"
                              value={draft?.rubricUnderstanding ?? 3}
                              onChange={(event) => updateDraft(log.id, { rubricUnderstanding: Number(event.target.value) })}
                            >
                              {[1, 2, 3, 4].map((score) => (
                                <option key={score} value={score}>
                                  {score}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="text-sm">
                            根拠
                            <select
                              className="mt-1 block w-full rounded border border-admin-border-primary bg-admin-bg-primary px-2 py-1"
                              value={draft?.rubricEvidence ?? 3}
                              onChange={(event) => updateDraft(log.id, { rubricEvidence: Number(event.target.value) })}
                            >
                              {[1, 2, 3, 4].map((score) => (
                                <option key={score} value={score}>
                                  {score}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="text-sm">
                            対話可能性
                            <select
                              className="mt-1 block w-full rounded border border-admin-border-primary bg-admin-bg-primary px-2 py-1"
                              value={draft?.rubricDialogue ?? 3}
                              onChange={(event) => updateDraft(log.id, { rubricDialogue: Number(event.target.value) })}
                            >
                              {[1, 2, 3, 4].map((score) => (
                                <option key={score} value={score}>
                                  {score}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>

                        <label className="mt-3 block text-sm">
                          コメント
                          <textarea
                            className="mt-1 h-24 w-full rounded border border-admin-border-primary bg-admin-bg-primary px-2 py-1"
                            value={draft?.comment ?? ''}
                            onChange={(event) => updateDraft(log.id, { comment: event.target.value })}
                          />
                        </label>

                        <div className="mt-3 flex justify-end">
                          <Button tone="admin" onClick={() => void save(log.id)} disabled={savingId === log.id}>
                            {savingId === log.id ? '保存中...' : '保存'}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ))}

      <ConfirmDialog
        open={showBulkConfirm}
        title="未評価を一括保存しますか？"
        description={`未評価 ${pendingLogIds.length} 件に同じ評価を保存します。`}
        confirmLabel="一括保存する"
        onConfirm={() => void saveBulk(pendingLogIds)}
        onCancel={() => setShowBulkConfirm(false)}
      />
    </main>
  )
}
