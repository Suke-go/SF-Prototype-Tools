'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, LoadingSpinner } from '@/components/ui'

type Theme = {
  id: string
  title: string
  description: string | null
}

export default function AdminNewSessionPage() {
  const [themes, setThemes] = useState<Theme[]>([])
  const [loadingThemes, setLoadingThemes] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [description, setDescription] = useState('')
  const [themeId, setThemeId] = useState('')
  const [maxParticipants, setMaxParticipants] = useState(50)
  const [passcode, setPasscode] = useState('')

  async function safeParseJson(res: Response): Promise<any> {
    const contentType = res.headers.get('content-type') || ''
    if (contentType.includes('application/json')) return res.json()
    const text = await res.text()
    return { __nonJson: true, text: text.slice(0, 300) }
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoadingThemes(true)
        const res = await fetch('/api/themes', { cache: 'no-store' })
        const json = await safeParseJson(res)
        if (!res.ok) {
          if (json?.__nonJson) {
            throw new Error(
              'テーマ取得に失敗しました。DB未設定（DATABASE_URL未設定）やサーバーエラーの可能性があります。'
            )
          }
          throw new Error(json?.error?.message || 'テーマの取得に失敗しました')
        }
        const list: Theme[] = json.data.themes
        if (!cancelled) {
          setThemes(list)
          if (!themeId && list.length > 0) setThemeId(list[0].id)
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'テーマの取得に失敗しました')
      } finally {
        if (!cancelled) setLoadingThemes(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const canSubmit = useMemo(() => {
    return themeId && passcode.trim().length >= 8 && !submitting
  }, [themeId, passcode, submitting])

  async function onSubmit() {
    try {
      setSubmitting(true)
      setError(null)
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description || undefined,
          themeId,
          maxParticipants,
          passcode,
        }),
      })
      const json = await safeParseJson(res)
      if (!res.ok) {
        if (json?.__nonJson) {
          throw new Error(
            'セッション作成に失敗しました。DB未設定（DATABASE_URL未設定）やサーバーエラーの可能性があります。'
          )
        }
        throw new Error(json?.error?.message || 'セッション作成に失敗しました')
      }

      const created = json.data.session as { id: string }
      localStorage.setItem('admin:lastSessionId', created.id)
      window.location.href = `/admin/dashboard?sessionId=${created.id}`
    } catch (e) {
      setError(e instanceof Error ? e.message : 'セッション作成に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-8">
      <Card tone="admin">
        <CardHeader>
          <CardTitle className="text-admin-text-primary">セッション作成</CardTitle>
        </CardHeader>
        <CardContent className="text-admin-text-secondary">
          <div className="space-y-4">
            {error && (
              <div className="rounded-md border border-admin-border-primary bg-admin-bg-secondary p-3 text-admin-text-primary">
                <p className="text-sm">{error}</p>
              </div>
            )}

            <div className="rounded-md border border-admin-border-primary bg-admin-bg-secondary p-3">
              <p className="text-sm text-admin-text-secondary">
                セッション名は省略します（テーマ名 + 作成日時で自動生成）。
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-admin-text-secondary">説明（任意）</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-admin-border-primary bg-admin-bg-primary px-4 py-3 text-admin-text-primary focus:outline-none focus:ring-2 focus:ring-admin-accent-primary focus:ring-offset-2 focus:ring-offset-admin-bg-primary"
                placeholder="授業の狙い、注意事項など"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-admin-text-secondary">テーマ</label>
              {loadingThemes ? (
                <div className="flex items-center gap-2 text-sm">
                  <LoadingSpinner size="sm" className="border-admin-accent-primary border-r-transparent" />
                  <span>テーマを取得中...</span>
                </div>
              ) : (
                <select
                  value={themeId}
                  onChange={(e) => setThemeId(e.target.value)}
                  className="w-full rounded-md border border-admin-border-primary bg-admin-bg-primary px-4 py-3 text-admin-text-primary focus:outline-none focus:ring-2 focus:ring-admin-accent-primary focus:ring-offset-2 focus:ring-offset-admin-bg-primary"
                >
                  {themes.length === 0 && <option value="">（テーマがありません）</option>}
                  {themes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-admin-text-secondary">最大参加者数</label>
                <Input
                  type="number"
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(Number(e.target.value))}
                  min={1}
                  max={200}
                  className="bg-admin-bg-primary text-admin-text-primary border-admin-border-primary focus:ring-admin-accent-primary focus:ring-offset-admin-bg-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-admin-text-secondary">管理者パスコード</label>
                <Input
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="8文字以上"
                  className="bg-admin-bg-primary text-admin-text-primary border-admin-border-primary focus:ring-admin-accent-primary focus:ring-offset-admin-bg-primary"
                />
              </div>
            </div>

            <div className="pt-2">
              <Button
                onClick={onSubmit}
                disabled={!canSubmit}
                className="bg-admin-accent-primary text-white hover:brightness-110 focus:ring-admin-accent-primary focus:ring-offset-admin-bg-primary"
              >
                {submitting ? '作成中...' : '作成してダッシュボードへ'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}

