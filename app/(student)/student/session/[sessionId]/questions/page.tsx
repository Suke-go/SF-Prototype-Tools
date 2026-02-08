'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, LoadingSpinner, ProgressBar } from '@/components/ui'
import { StepIndicator } from '@/components/common/StepIndicator'
import { buildStudentSteps, completedStepKeys } from '@/lib/constants/student-flow'

type Question = { id: string; questionText: string; order: number }
type ResponseValue = 'YES' | 'NO' | 'UNKNOWN'
type FailedAnswer = { questionId: string; value: ResponseValue }

export default function QuestionsPage({ params }: { params: { sessionId: string } }) {
  const router = useRouter()
  const sessionId = params.sessionId
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, ResponseValue>>({})
  const [failedQueue, setFailedQueue] = useState<FailedAnswer[]>([])
  const [submitting, setSubmitting] = useState(false)
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const themeId = useMemo(() => {
    if (typeof window === 'undefined') return ''
    return new URLSearchParams(window.location.search).get('themeId') || ''
  }, [])

  useEffect(() => {
    if (!themeId) return
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/themes/${themeId}?sessionId=${encodeURIComponent(sessionId)}`, { cache: 'no-store' })
        const ct = res.headers.get('content-type') || ''
        if (!ct.includes('application/json')) throw new Error('サーバーエラー')
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error?.message || '設問の取得に失敗しました')
        if (!cancelled) setQuestions(json.data.theme.questions)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : '設問の取得に失敗しました')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [sessionId, themeId])

  const current = questions[index]
  const isLast = index === questions.length - 1
  const answered = current ? answers[current.id] !== undefined : false

  const postAnswer = useCallback(
    async (questionId: string, value: ResponseValue) => {
      const res = await fetch('/api/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, questionId, responseValue: value }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json?.error?.message || '回答保存に失敗しました')
      }
    },
    [sessionId]
  )

  const queueFailed = useCallback((questionId: string, value: ResponseValue) => {
    setFailedQueue((prev) => [...prev.filter((item) => item.questionId !== questionId), { questionId, value }])
  }, [])

  const saveAnswer = useCallback(async (questionId: string, value: ResponseValue, quiet = false) => {
    try {
      await postAnswer(questionId, value)
      setFailedQueue((prev) => prev.filter((item) => item.questionId !== questionId))
      return true
    } catch (e) {
      queueFailed(questionId, value)
      if (!quiet) {
        setError(e instanceof Error ? e.message : '一部の回答を送信できませんでした。通信回復後に自動再送します。')
      }
      return false
    }
  }, [postAnswer, queueFailed])

  const retryFailedQueue = useCallback(async () => {
    const pending = [...failedQueue]
    if (pending.length === 0) return true
    const results = await Promise.all(pending.map((item) => saveAnswer(item.questionId, item.value, true)))
    const success = results.every(Boolean)
    if (success) setError(null)
    return success
  }, [failedQueue, saveAnswer])

  useEffect(() => {
    if (failedQueue.length === 0) return
    const timer = setTimeout(() => {
      void retryFailedQueue()
    }, 10_000)
    return () => clearTimeout(timer)
  }, [failedQueue, retryFailedQueue])

  useEffect(() => {
    return () => {
      if (advanceTimer.current) {
        clearTimeout(advanceTimer.current)
      }
    }
  }, [])

  function handleAnswer(value: ResponseValue) {
    if (!current || submitting) return
    setAnswers((prev) => ({ ...prev, [current.id]: value }))
    void saveAnswer(current.id, value)

    if (advanceTimer.current) {
      clearTimeout(advanceTimer.current)
      advanceTimer.current = null
    }
    if (!isLast) {
      advanceTimer.current = setTimeout(() => {
        advanceTimer.current = null
        setIndex((i) => i + 1)
      }, 280)
    }
  }

  async function handleComplete() {
    setSubmitting(true)
    setError(null)
    try {
      let latestSaved = true
      if (current && answers[current.id]) {
        latestSaved = await saveAnswer(current.id, answers[current.id], true)
      }
      if (!latestSaved) {
        setError('最後の回答を送信できませんでした。通信状態を確認して再試行してください。')
        setSubmitting(false)
        return
      }
      const flushed = await retryFailedQueue()
      if (!flushed) {
        setError('未送信の回答があります。通信状態を確認して「今すぐ再送」を実行してください。')
        setSubmitting(false)
        return
      }
      router.push(`/student/session/${encodeURIComponent(sessionId)}/questions/complete?themeId=${themeId}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存に失敗しました')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </main>
    )
  }

  if (questions.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="text-center">
          <p className="text-student-text-primary">{error || '設問が見つかりません'}</p>
          <Button variant="secondary" className="mt-4" onClick={() => router.refresh()}>
            再読み込み
          </Button>
        </div>
      </main>
    )
  }

  return (
    <main className="matte-texture flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl">
        <StepIndicator
          steps={buildStudentSteps(sessionId)}
          currentKey="questions"
          completedKeys={completedStepKeys('questions')}
          onNavigate={(path) => router.push(path)}
        />
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-xs tracking-wider text-student-text-disabled">設問進行</span>
          <span className="font-mono text-xs text-student-text-disabled">
            {index + 1} / {questions.length}
          </span>
        </div>
        <ProgressBar value={index + 1} max={questions.length} />
        <p className="mt-3 text-xs text-student-text-disabled">
          正解はありません。直感で、いまのあなたに近い選択をしてください。
        </p>

        <div className="mt-10 fade-in" key={index}>
          <div className="font-mono text-xs text-student-text-disabled">Q{current.order}</div>
          <p className="mt-3 font-heading text-2xl font-semibold leading-[1.7] text-student-text-primary md:text-3xl">
            {current.questionText}
          </p>
        </div>

        <div className="mt-10 flex flex-col items-center gap-4">
          <div className="flex w-full gap-4">
            <button
              type="button"
              aria-label="はいと回答する"
              aria-pressed={answers[current?.id] === 'YES'}
              onClick={() => handleAnswer('YES')}
              disabled={submitting}
              className={[
                'flex flex-1 items-center justify-center gap-3 rounded-2xl py-6 text-lg font-semibold transition-all duration-fast',
                'bg-student-answer-yes text-white',
                'hover:brightness-110 active:brightness-90',
                'focus:outline-none focus:ring-2 focus:ring-student-answer-yes/50 focus:ring-offset-2 focus:ring-offset-black',
                'disabled:opacity-50',
                answers[current?.id] === 'YES' &&
                  'ring-2 ring-white/80 ring-offset-2 ring-offset-black shadow-[0_0_24px_var(--student-answer-yes-glow)]',
              ].join(' ')}
            >
              <span aria-hidden>○</span>
              <span>はい</span>
            </button>

            <button
              type="button"
              aria-label="いいえと回答する"
              aria-pressed={answers[current?.id] === 'NO'}
              onClick={() => handleAnswer('NO')}
              disabled={submitting}
              className={[
                'flex flex-1 items-center justify-center gap-3 rounded-2xl py-6 text-lg font-semibold transition-all duration-fast',
                'bg-student-answer-no text-white',
                'hover:brightness-110 active:brightness-90',
                'focus:outline-none focus:ring-2 focus:ring-student-answer-no/50 focus:ring-offset-2 focus:ring-offset-black',
                'disabled:opacity-50',
                answers[current?.id] === 'NO' &&
                  'ring-2 ring-white/80 ring-offset-2 ring-offset-black shadow-[0_0_24px_var(--student-answer-no-glow)]',
              ].join(' ')}
            >
              <span aria-hidden>×</span>
              <span>いいえ</span>
            </button>
          </div>

          <button
            type="button"
            aria-label="わからないと回答する"
            aria-pressed={answers[current?.id] === 'UNKNOWN'}
            onClick={() => handleAnswer('UNKNOWN')}
            disabled={submitting}
            className={[
              'flex items-center justify-center gap-2 rounded-xl px-8 py-3 text-sm font-medium transition-all duration-fast',
              'bg-student-answer-unknown text-white/80',
              'hover:brightness-110 active:brightness-90',
              'focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-black',
              'disabled:opacity-50',
              answers[current?.id] === 'UNKNOWN' && 'ring-2 ring-white/50 ring-offset-2 ring-offset-black',
            ].join(' ')}
          >
            <span aria-hidden>？</span>
            <span>わからない</span>
          </button>
        </div>

        {failedQueue.length > 0 && (
          <div className="mt-4 rounded-lg border border-amber-400/40 bg-amber-100/10 px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-student-text-primary">
                未送信の回答が {failedQueue.length} 件あります。通信回復後に自動再送します。
              </p>
              <Button size="sm" variant="secondary" onClick={() => void retryFailedQueue()}>
                今すぐ再送
              </Button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-student-semantic-error/30 bg-student-semantic-error/10 px-6 py-4">
            <p className="text-sm text-student-text-primary">{error}</p>
          </div>
        )}

        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={() => {
              setError(null)
              if (advanceTimer.current) {
                clearTimeout(advanceTimer.current)
                advanceTimer.current = null
              }
              setIndex((i) => Math.max(i - 1, 0))
            }}
            disabled={index === 0 || submitting}
            className="text-sm text-student-text-tertiary transition-colors hover:text-student-text-secondary disabled:opacity-30"
          >
            戻る
          </button>

          {isLast && answered ? (
            <Button onClick={handleComplete} disabled={submitting} size="sm">
              {submitting ? '保存中...' : '回答を確定して進む'}
            </Button>
          ) : (
            <button
              onClick={() => {
                setError(null)
                if (advanceTimer.current) {
                  clearTimeout(advanceTimer.current)
                  advanceTimer.current = null
                }
                setIndex((i) => Math.min(i + 1, questions.length - 1))
              }}
              disabled={!answered || submitting}
              className="text-sm text-student-text-tertiary transition-colors hover:text-student-text-secondary disabled:opacity-30"
            >
              次へ
            </button>
          )}
        </div>
      </div>
    </main>
  )
}
