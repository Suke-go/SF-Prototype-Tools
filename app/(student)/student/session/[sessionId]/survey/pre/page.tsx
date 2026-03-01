'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, LoadingSpinner } from '@/components/ui'
import { LikertQuestionList } from '@/components/survey/LikertQuestionList'
import { COMMON_SURVEY_QUESTIONS, type LikertValue } from '@/lib/survey/definition'
import { fetchWithRetry } from '@/lib/fetch-with-retry'

type ConsentChoice = 'agree' | 'decline' | null

export default function PreSurveyPage({ params }: { params: { sessionId: string } }) {
  const sessionId = params.sessionId
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [consentChoice, setConsentChoice] = useState<ConsentChoice>(null)
  const [consentToQuote, setConsentToQuote] = useState(false)
  const [answers, setAnswers] = useState<Record<string, LikertValue>>({})

  const requiredIds = useMemo(() => COMMON_SURVEY_QUESTIONS.map((question) => question.id), [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetchWithRetry(
          `/api/session/survey?sessionId=${encodeURIComponent(sessionId)}&phase=PRE`,
          { cache: 'no-store' }
        )
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error?.message || '事前アンケートの読み込みに失敗しました')
        if (cancelled) return

        const response = json?.data?.response
        if (response) {
          setConsentChoice(response.consentToResearch ? 'agree' : 'decline')
          setConsentToQuote(Boolean(response.consentToQuote))
          const likert = response?.answers?.likert
          if (likert && typeof likert === 'object') {
            const restored: Record<string, LikertValue> = {}
            for (const id of requiredIds) {
              const value = likert[id]
              if (value === 1 || value === 2 || value === 3 || value === 4 || value === 5) {
                restored[id] = value
              }
            }
            setAnswers(restored)
          }
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : '事前アンケートの読み込みに失敗しました')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [requiredIds, sessionId])

  function updateAnswer(questionId: string, value: LikertValue) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  async function handleSubmit() {
    setError(null)
    if (consentChoice === null) {
      setError('同意するかどうかを選んでください。')
      return
    }

    const consentToResearch = consentChoice === 'agree'
    if (consentToResearch) {
      const missing = requiredIds.some((id) => answers[id] === undefined)
      if (missing) {
        setError('すべての設問に回答してください。')
        return
      }
    }

    try {
      setSaving(true)
      const res = await fetchWithRetry('/api/session/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          phase: 'PRE',
          consentToResearch,
          consentToQuote: consentToResearch ? consentToQuote : false,
          likertAnswers: consentToResearch ? answers : undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error?.message || '保存に失敗しました')
      router.push(`/student/session/${encodeURIComponent(sessionId)}/big-five`)
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存に失敗しました')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-6">
        <p className="font-mono text-xs tracking-[0.2em] text-student-text-disabled">PRE SURVEY</p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-student-text-primary">授業前アンケートと同意</h1>
        <p className="mt-3 text-sm leading-relaxed text-student-text-secondary">
          研究利用の同意を確認したあと、授業前アンケートに回答します。
          <br />
          同意しなくても、成績や授業参加に不利益はありません。
        </p>
      </header>

      <section className="rounded-xl border border-student-border-primary bg-student-bg-secondary p-5">
        <h2 className="text-base font-semibold text-student-text-primary">同意について</h2>
        <ul className="mt-3 space-y-1 text-sm text-student-text-secondary">
          <li>回答データは匿名化して集計します。</li>
          <li>論文・学会・教員向け実践報告で使うことがあります。</li>
          <li>個人が特定される情報は公開しません。</li>
        </ul>

        <div className="mt-5 grid gap-2">
          <button
            type="button"
            onClick={() => setConsentChoice('agree')}
            className={[
              'rounded-lg border px-4 py-3 text-left text-sm transition-colors',
              consentChoice === 'agree'
                ? 'border-white bg-white/15 text-white'
                : 'border-student-border-primary bg-student-bg-primary text-student-text-secondary',
            ].join(' ')}
          >
            同意する（研究利用を許可する）
          </button>
          <button
            type="button"
            onClick={() => setConsentChoice('decline')}
            className={[
              'rounded-lg border px-4 py-3 text-left text-sm transition-colors',
              consentChoice === 'decline'
                ? 'border-white bg-white/15 text-white'
                : 'border-student-border-primary bg-student-bg-primary text-student-text-secondary',
            ].join(' ')}
          >
            同意しない（授業のみ参加する）
          </button>
        </div>

        {consentChoice === 'agree' && (
          <label className="mt-4 flex items-start gap-3 text-sm text-student-text-secondary">
            <input
              type="checkbox"
              className="mt-1"
              checked={consentToQuote}
              onChange={(event) => setConsentToQuote(event.target.checked)}
            />
            <span>自由記述を匿名で引用することに同意する（任意）</span>
          </label>
        )}
      </section>

      {consentChoice === 'agree' && (
        <section className="mt-6">
          <h2 className="mb-3 text-base font-semibold text-student-text-primary">授業前アンケート（約2分）</h2>
          <LikertQuestionList questions={COMMON_SURVEY_QUESTIONS} answers={answers} onChange={updateAnswer} />
        </section>
      )}

      {error && (
        <div className="mt-5 rounded-lg border border-student-semantic-error/30 bg-student-semantic-error/10 px-5 py-4">
          <p className="text-sm text-student-text-primary">{error}</p>
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <Button variant="secondary" onClick={() => router.push(`/student/session/${encodeURIComponent(sessionId)}`)}>
          セッションへ戻る
        </Button>
        <Button onClick={() => void handleSubmit()} disabled={saving}>
          {saving ? '保存中...' : '保存して授業へ進む'}
        </Button>
      </div>
    </main>
  )
}
