'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, LoadingSpinner } from '@/components/ui'
import { fetchWithRetry } from '@/lib/fetch-with-retry'

type QuestionDraft = {
  id: string
  text: string
}

type ThemeDetail = {
  id: string
  title: string
  description: string | null
  imageUrl: string | null
  worldviewCardId: string | null
  status: 'ACTIVE' | 'INACTIVE'
  usedInSessions: number
  questions: { id: string; questionText: string; order: number }[]
}

function createQuestionDraft(text = ''): QuestionDraft {
  return {
    id: crypto.randomUUID(),
    text,
  }
}

export default function AdminThemeEditPage({ params }: { params: { themeId: string } }) {
  const themeId = params.themeId
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [theme, setTheme] = useState<ThemeDetail | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [worldviewCardId, setWorldviewCardId] = useState('')
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE')
  const [questions, setQuestions] = useState<QuestionDraft[]>([])

  const canSubmit = useMemo(() => {
    const validQuestions = questions.filter((question) => question.text.trim().length > 0)
    return title.trim().length > 0 && validQuestions.length > 0 && !saving
  }, [questions, saving, title])

  const loadTheme = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetchWithRetry(`/api/themes/${encodeURIComponent(themeId)}?includeInactive=1`, {
        cache: 'no-store',
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error?.message || 'テーマ取得に失敗しました')
      const loaded = json?.data?.theme as ThemeDetail
      setTheme(loaded)
      setTitle(loaded.title)
      setDescription(loaded.description || '')
      setImageUrl(loaded.imageUrl || '')
      setWorldviewCardId(loaded.worldviewCardId || '')
      setStatus(loaded.status)
      setQuestions(loaded.questions.map((question) => createQuestionDraft(question.questionText)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'テーマ取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [themeId])

  useEffect(() => {
    void loadTheme()
  }, [loadTheme])

  function updateQuestion(id: string, text: string) {
    setQuestions((prev) => prev.map((question) => (question.id === id ? { ...question, text } : question)))
  }

  function removeQuestion(id: string) {
    setQuestions((prev) => prev.filter((question) => question.id !== id))
  }

  async function saveTheme() {
    if (!canSubmit) return
    try {
      setSaving(true)
      setError(null)
      const res = await fetchWithRetry(`/api/themes/${encodeURIComponent(themeId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          imageUrl: imageUrl.trim() || undefined,
          worldviewCardId: worldviewCardId.trim() || undefined,
          status,
          questions: questions
            .map((question) => question.text.trim())
            .filter(Boolean)
            .map((questionText) => ({ questionText })),
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
        throw new Error(issueMessages || json?.error?.message || 'テーマ更新に失敗しました')
      }
      router.push('/admin/themes')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'テーマ更新に失敗しました')
    } finally {
      setSaving(false)
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
    <main className="mx-auto max-w-4xl p-4 md:p-8">
      <Card tone="admin">
        <CardHeader>
          <CardTitle className="text-admin-text-primary">テーマ編集</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {error && (
            <div className="rounded-md border border-admin-semantic-error/30 bg-red-50 p-3 text-sm text-admin-semantic-error">{error}</div>
          )}

          {theme && (
            <div className="rounded-md border border-admin-border-primary bg-admin-bg-secondary p-3 text-xs text-admin-text-tertiary">
              使用中セッション数: {theme.usedInSessions}
            </div>
          )}

          <Input
            label="タイトル"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="border-admin-border-primary bg-admin-bg-primary text-admin-text-primary"
          />
          <div className="space-y-2">
            <label className="block text-sm font-medium text-admin-text-secondary">説明</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="h-28 w-full rounded-md border border-admin-border-primary bg-admin-bg-primary px-4 py-3 text-sm text-admin-text-primary"
            />
          </div>
          <Input
            label="画像URL（任意）"
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
            className="border-admin-border-primary bg-admin-bg-primary text-admin-text-primary"
          />
          <Input
            label="worldviewCardId（任意）"
            value={worldviewCardId}
            onChange={(event) => setWorldviewCardId(event.target.value)}
            className="border-admin-border-primary bg-admin-bg-primary text-admin-text-primary"
          />

          <div className="space-y-2">
            <label className="block text-sm font-medium text-admin-text-secondary">状態</label>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as 'ACTIVE' | 'INACTIVE')}
              className="w-full rounded-md border border-admin-border-primary bg-admin-bg-primary px-3 py-2 text-sm text-admin-text-primary"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-admin-text-primary">設問</h2>
              <Button tone="admin" variant="secondary" size="sm" onClick={() => setQuestions((prev) => [...prev, createQuestionDraft()])}>
                設問を追加
              </Button>
            </div>
            <div className="space-y-2">
              {questions.map((question, index) => (
                <div key={question.id} className="flex items-start gap-2">
                  <span className="mt-2 w-8 text-sm text-admin-text-tertiary">Q{index + 1}</span>
                  <textarea
                    value={question.text}
                    onChange={(event) => updateQuestion(question.id, event.target.value)}
                    className="h-20 flex-1 rounded-md border border-admin-border-primary bg-admin-bg-primary px-3 py-2 text-sm text-admin-text-primary"
                    placeholder="設問文"
                  />
                  <Button
                    tone="admin"
                    variant="secondary"
                    size="sm"
                    onClick={() => removeQuestion(question.id)}
                    disabled={questions.length <= 1}
                  >
                    削除
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button tone="admin" onClick={() => void saveTheme()} disabled={!canSubmit}>
              {saving ? '保存中...' : '保存する'}
            </Button>
            <Button tone="admin" variant="secondary" onClick={() => router.push('/admin/themes')}>
              戻る
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
