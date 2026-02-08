'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, LoadingSpinner } from '@/components/ui'
import { fetchWithRetry } from '@/lib/fetch-with-retry'

type Theme = {
  id: string
  title: string
  description: string | null
}

const SESSION_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateSessionCode() {
  return Array.from({ length: 6 }, () => SESSION_CODE_CHARS[Math.floor(Math.random() * SESSION_CODE_CHARS.length)]).join('')
}

export default function AdminNewSessionPage() {
  const router = useRouter()
  const [themes, setThemes] = useState<Theme[]>([])
  const [selectedThemeIds, setSelectedThemeIds] = useState<string[]>([])
  const [loadingThemes, setLoadingThemes] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [sessionCode, setSessionCode] = useState(() => generateSessionCode())
  const [maxParticipantsText, setMaxParticipantsText] = useState('50')
  const [passcode, setPasscode] = useState('')

  function normalizeSessionCode(raw: string) {
    return raw.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32).toUpperCase()
  }

  function toggleTheme(themeId: string) {
    setSelectedThemeIds((prev) => (prev.includes(themeId) ? prev.filter((id) => id !== themeId) : [...prev, themeId]))
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoadingThemes(true)
        setError(null)
        const res = await fetchWithRetry('/api/themes?status=ACTIVE', { cache: 'no-store' })
        const json = await res.json()
        if (!res.ok) {
          throw new Error(json?.error?.message || 'テーマの読み込みに失敗しました')
        }
        const list: Theme[] = json.data?.themes || []
        if (!cancelled) {
          setThemes(list)
          setSelectedThemeIds((current) => (current.length > 0 ? current : list.length > 0 ? [list[0].id] : []))
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'テーマの読み込みに失敗しました')
      } finally {
        if (!cancelled) setLoadingThemes(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const canSubmit = useMemo(() => {
    const codeOk = /^[A-Za-z0-9_-]{4,32}$/.test(sessionCode.trim())
    const maxParticipants = Number(maxParticipantsText)
    const maxOk = Number.isInteger(maxParticipants) && maxParticipants >= 1 && maxParticipants <= 200
    return selectedThemeIds.length > 0 && codeOk && maxOk && passcode.trim().length >= 4 && !submitting
  }, [selectedThemeIds, sessionCode, maxParticipantsText, passcode, submitting])

  async function onSubmit() {
    try {
      setSubmitting(true)
      setError(null)

      const maxParticipants = Number.parseInt(maxParticipantsText, 10)
      const res = await fetchWithRetry('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || undefined,
          description: description.trim() || undefined,
          sessionCode: sessionCode.trim(),
          themeIds: selectedThemeIds,
          maxParticipants,
          passcode,
        }),
      })

      const json = await res.json()
      if (!res.ok) {
        const issueMessages = Array.isArray(json?.error?.details?.issues)
          ? json.error.details.issues
              .map((issue: { message?: string }) => issue?.message)
              .filter(Boolean)
              .join(' / ')
          : ''
        throw new Error(issueMessages || json?.error?.message || 'セッション作成に失敗しました')
      }

      const created = json.data.session as { id: string }
      localStorage.setItem('admin:lastSessionId', created.id)
      router.push(`/admin/board?sessionId=${created.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'セッション作成に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="mx-auto max-w-4xl p-8">
      <Card tone="admin">
        <CardHeader>
          <CardTitle className="text-admin-text-primary">セッション作成</CardTitle>
        </CardHeader>
        <CardContent className="text-admin-text-secondary">
          <div className="space-y-5">
            {error && (
              <div className="rounded-md border border-admin-semantic-error/30 bg-red-50 p-3 text-admin-semantic-error">
                <p className="text-sm">{error}</p>
              </div>
            )}

            <div className="rounded-md border border-admin-border-primary bg-admin-bg-secondary p-3 text-sm">
              セッションタイトル・参加コード・利用テーマを設定して開始します。
            </div>

            <form
              className="space-y-5"
              onSubmit={(event) => {
                event.preventDefault()
                void onSubmit()
              }}
            >
              <div className="space-y-2">
                <Input
                  label="タイトル（任意）"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例: 3年A組 ムーンショット 第1回"
                  className="border-admin-border-primary bg-admin-bg-primary text-admin-text-primary"
                />
              </div>

              <div className="space-y-2">
                <Input
                  label="セッションコード"
                  value={sessionCode}
                  onChange={(e) => setSessionCode(normalizeSessionCode(e.target.value))}
                  placeholder="例: MOONSHOT-2026-A"
                  className="border-admin-border-primary bg-admin-bg-primary font-mono text-admin-text-primary"
                />
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-admin-text-tertiary">4〜32文字、英数字と `-` ` _` が使えます</p>
                  <button
                    type="button"
                    className="text-xs text-admin-accent-primary underline-offset-2 hover:underline"
                    onClick={() => setSessionCode(generateSessionCode())}
                  >
                    ランダム再生成
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-admin-text-secondary">説明（任意）</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-admin-border-primary bg-admin-bg-primary px-4 py-3 text-admin-text-primary focus:outline-none focus:ring-2 focus:ring-admin-accent-primary focus:ring-offset-2 focus:ring-offset-admin-bg-primary"
                  placeholder="授業の狙い、進め方など"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-admin-text-secondary">このセッションで使うテーマ（複数選択可）</label>
                {loadingThemes ? (
                  <div className="flex items-center gap-2 text-sm">
                    <LoadingSpinner size="sm" className="border-admin-accent-primary border-r-transparent" />
                    <span>テーマを読み込み中...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {themes.map((theme) => {
                      const selected = selectedThemeIds.includes(theme.id)
                      return (
                        <button
                          key={theme.id}
                          type="button"
                          onClick={() => toggleTheme(theme.id)}
                          className={[
                            'rounded-lg border p-3 text-left transition-colors',
                            selected
                              ? 'border-admin-accent-primary bg-blue-50'
                              : 'border-admin-border-primary bg-admin-bg-primary hover:bg-admin-bg-secondary',
                          ].join(' ')}
                        >
                          <div className="flex items-start gap-3">
                            <input type="checkbox" checked={selected} readOnly className="mt-1 h-4 w-4 accent-blue-600" />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-admin-text-primary">{theme.title}</p>
                              {theme.description && <p className="mt-1 text-xs text-admin-text-tertiary">{theme.description}</p>}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
                {!loadingThemes && themes.length === 0 && (
                  <p className="text-sm text-admin-semantic-error">利用可能なテーマがありません。先にテーマを作成してください。</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Input
                    label="最大参加人数"
                    type="number"
                    value={maxParticipantsText}
                    onChange={(e) => setMaxParticipantsText(e.target.value)}
                    min={1}
                    max={200}
                    className="border-admin-border-primary bg-admin-bg-primary text-admin-text-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Input
                    label="参加コード"
                    type="password"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="4桁以上の数字（例: 2468）"
                    className="border-admin-border-primary bg-admin-bg-primary text-admin-text-primary"
                  />
                </div>
              </div>

              <div className="pt-1">
                <Button
                  tone="admin"
                  type="submit"
                  disabled={!canSubmit}
                  className="bg-admin-accent-primary text-white hover:brightness-110 focus:ring-admin-accent-primary focus:ring-offset-admin-bg-primary"
                >
                  {submitting ? '作成中...' : '作成して管理ボードへ移動'}
                </Button>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
