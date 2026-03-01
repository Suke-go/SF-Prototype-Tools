'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, LoadingSpinner } from '@/components/ui'
import { LikertQuestionList } from '@/components/survey/LikertQuestionList'
import {
  COMMON_SURVEY_QUESTIONS,
  POST_ONLY_SURVEY_QUESTIONS,
  POST_TEXT_QUESTIONS,
  type LikertValue,
} from '@/lib/survey/definition'
import { fetchWithRetry } from '@/lib/fetch-with-retry'

const POST_LIKERT_QUESTIONS = [...COMMON_SURVEY_QUESTIONS, ...POST_ONLY_SURVEY_QUESTIONS]

export default function PostSurveyPage({ params }: { params: { sessionId: string } }) {
  const sessionId = params.sessionId
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preConsent, setPreConsent] = useState<boolean | null>(null)
  const [answers, setAnswers] = useState<Record<string, LikertValue>>({})
  const [texts, setTexts] = useState<Record<string, string>>({})

  const requiredIds = useMemo(() => POST_LIKERT_QUESTIONS.map((question) => question.id), [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetchWithRetry(
          `/api/session/survey?sessionId=${encodeURIComponent(sessionId)}&phase=POST`,
          { cache: 'no-store' }
        )
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error?.message || '事後アンケートの読み込みに失敗しました')
        if (cancelled) return

        setPreConsent(json?.data?.preConsentToResearch ?? null)
        const response = json?.data?.response
        if (response?.answers?.likert) {
          const restored: Record<string, LikertValue> = {}
          for (const id of requiredIds) {
            const value = response.answers.likert[id]
            if (value === 1 || value === 2 || value === 3 || value === 4 || value === 5) {
              restored[id] = value
            }
          }
          setAnswers(restored)
        }
        if (response?.answers?.freeText) {
          const restoredText: Record<string, string> = {}
          for (const question of POST_TEXT_QUESTIONS) {
            const value = response.answers.freeText[question.id]
            if (typeof value === 'string') restoredText[question.id] = value
          }
          setTexts(restoredText)
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : '事後アンケートの読み込みに失敗しました')
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

  async function save() {
    if (!preConsent) {
      router.push(`/student/session/${encodeURIComponent(sessionId)}/visualization`)
      return
    }
    const missing = requiredIds.some((id) => answers[id] === undefined)
    if (missing) {
      setError('すべての設問に回答してください。')
      return
    }

    try {
      setSaving(true)
      setError(null)
      const res = await fetchWithRetry('/api/session/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          phase: 'POST',
          likertAnswers: answers,
          textAnswers: texts,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error?.message || '保存に失敗しました')
      router.push(`/student/session/${encodeURIComponent(sessionId)}/visualization`)
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

  if (preConsent === null) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="rounded-xl border border-student-border-primary bg-student-bg-secondary p-6">
          <h1 className="text-xl font-semibold text-student-text-primary">先に事前同意が必要です</h1>
          <p className="mt-3 text-sm text-student-text-secondary">
            事後アンケートの前に、授業前アンケートと同意を完了してください。
          </p>
          <div className="mt-5">
            <Button onClick={() => router.push(`/student/session/${encodeURIComponent(sessionId)}/survey/pre`)}>
              事前アンケートへ
            </Button>
          </div>
        </div>
      </main>
    )
  }

  if (preConsent === false) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="rounded-xl border border-student-border-primary bg-student-bg-secondary p-6">
          <h1 className="text-xl font-semibold text-student-text-primary">研究用アンケートは終了です</h1>
          <p className="mt-3 text-sm text-student-text-secondary">
            事前同意で「同意しない」を選択したため、研究用の事後アンケートは収集しません。
          </p>
          <div className="mt-5">
            <Button onClick={() => router.push(`/student/session/${encodeURIComponent(sessionId)}/visualization`)}>
              マップ画面へ戻る
            </Button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-6">
        <p className="font-mono text-xs tracking-[0.2em] text-student-text-disabled">POST SURVEY</p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-student-text-primary">授業後アンケート</h1>
        <p className="mt-3 text-sm text-student-text-secondary">授業のあと、考え方がどう変わったかを振り返ります（約3分）。</p>
      </header>

      <LikertQuestionList questions={POST_LIKERT_QUESTIONS} answers={answers} onChange={updateAnswer} />

      <section className="mt-6 space-y-4 rounded-xl border border-student-border-primary bg-student-bg-secondary p-5">
        <h2 className="text-base font-semibold text-student-text-primary">自由記述（任意）</h2>
        {POST_TEXT_QUESTIONS.map((question, index) => (
          <label key={question.id} className="block">
            <span className="text-sm text-student-text-primary">
              Q{index + 1}. {question.text}
            </span>
            <textarea
              value={texts[question.id] || ''}
              onChange={(event) => setTexts((prev) => ({ ...prev, [question.id]: event.target.value }))}
              placeholder={question.placeholder}
              maxLength={300}
              className="mt-2 h-24 w-full rounded-md border border-student-border-primary bg-student-bg-primary px-3 py-2 text-sm text-student-text-primary focus:outline-none focus:ring-2 focus:ring-white/30"
            />
          </label>
        ))}
      </section>

      {error && (
        <div className="mt-5 rounded-lg border border-student-semantic-error/30 bg-student-semantic-error/10 px-5 py-4">
          <p className="text-sm text-student-text-primary">{error}</p>
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <Button
          variant="secondary"
          onClick={() => router.push(`/student/session/${encodeURIComponent(sessionId)}/visualization`)}
        >
          あとで回答する
        </Button>
        <Button onClick={() => void save()} disabled={saving}>
          {saving ? '保存中...' : '保存して戻る'}
        </Button>
      </div>
    </main>
  )
}
