'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, CardContent, CardHeader, CardTitle, LoadingSpinner } from '@/components/ui'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { fetchWithRetry } from '@/lib/fetch-with-retry'

type ThemeListItem = {
  id: string
  title: string
  description: string | null
  imageUrl: string | null
  worldviewCardId: string | null
  status: 'ACTIVE' | 'INACTIVE'
  questionCount: number
}

export default function AdminThemesPage() {
  const router = useRouter()
  const [themes, setThemes] = useState<ThemeListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<ThemeListItem | null>(null)
  const [updating, setUpdating] = useState(false)

  const loadThemes = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetchWithRetry('/api/themes?status=ALL', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error?.message || 'テーマ一覧の取得に失敗しました')
      setThemes(json?.data?.themes || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'テーマ一覧の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadThemes()
  }, [loadThemes])

  async function deactivateTheme() {
    if (!deactivateTarget) return
    try {
      setUpdating(true)
      setError(null)
      const res = await fetchWithRetry(`/api/themes/${encodeURIComponent(deactivateTarget.id)}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error?.message || '無効化に失敗しました')
      await loadThemes()
    } catch (e) {
      setError(e instanceof Error ? e.message : '無効化に失敗しました')
    } finally {
      setUpdating(false)
      setDeactivateTarget(null)
    }
  }

  return (
    <main className="mx-auto max-w-6xl p-4 md:p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-body text-2xl font-bold text-admin-text-primary">テーマ管理</h1>
          <p className="mt-1 text-sm text-admin-text-tertiary">テーマの作成・編集・無効化を行います。</p>
        </div>
        <div className="flex gap-2">
          <Button tone="admin" variant="secondary" onClick={() => router.push('/admin/board')}>
            セッション一覧へ
          </Button>
          <Button tone="admin" onClick={() => router.push('/admin/themes/new')}>
            新規テーマ作成
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-admin-semantic-error/30 bg-red-50 p-3 text-sm text-admin-semantic-error">{error}</div>
      )}

      <Card tone="admin">
        <CardHeader>
          <CardTitle className="text-admin-text-primary">テーマ一覧</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center">
              <LoadingSpinner size="lg" className="border-admin-accent-primary border-r-transparent" />
            </div>
          ) : themes.length === 0 ? (
            <p className="text-sm text-admin-text-tertiary">テーマがありません。</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {themes.map((theme) => (
                <div key={theme.id} className="rounded-lg border border-admin-border-primary bg-admin-bg-secondary p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h2 className="text-base font-semibold text-admin-text-primary">{theme.title}</h2>
                    <span
                      className={[
                        'rounded-full px-2 py-0.5 text-xs',
                        theme.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-200 text-slate-700',
                      ].join(' ')}
                    >
                      {theme.status}
                    </span>
                  </div>
                  <p className="line-clamp-3 text-sm text-admin-text-secondary">{theme.description || '説明なし'}</p>
                  <div className="mt-3 text-xs text-admin-text-tertiary">
                    設問: {theme.questionCount}件
                    {theme.worldviewCardId ? ` / goal: ${theme.worldviewCardId}` : ''}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button tone="admin" variant="secondary" size="sm" onClick={() => router.push(`/admin/themes/${theme.id}/edit`)}>
                      編集
                    </Button>
                    <Button
                      tone="admin"
                      variant="secondary"
                      size="sm"
                      onClick={() => setDeactivateTarget(theme)}
                      disabled={theme.status !== 'ACTIVE'}
                    >
                      無効化
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={Boolean(deactivateTarget)}
        title="このテーマを無効化しますか？"
        description={deactivateTarget ? `「${deactivateTarget.title}」を無効化します。` : undefined}
        confirmLabel={updating ? '処理中...' : '無効化する'}
        destructive
        onConfirm={() => void deactivateTheme()}
        onCancel={() => setDeactivateTarget(null)}
      />
    </main>
  )
}
