'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, LoadingSpinner, ProgressBar } from '@/components/ui'

type Question = { id: string; questionText: string; order: number }
type ResponseValue = 'YES' | 'NO' | 'UNKNOWN'

function getStudentId(sessionId: string): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(`student:id:${sessionId}`)
}

export default function QuestionsPage({ params }: { params: { sessionId: string } }) {
  const sessionId = params.sessionId
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, ResponseValue>>({})
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
        const res = await fetch(`/api/themes/${themeId}`, { cache: 'no-store' })
        const ct = res.headers.get('content-type') || ''
        if (!ct.includes('application/json')) throw new Error('サーバーエラー')
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error?.message || '質問の取得に失敗しました')
        if (!cancelled) setQuestions(json.data.theme.questions)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : '質問の取得に失敗しました')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [themeId])

  const current = questions[index]
  const isLast = index === questions.length - 1
  const answered = current ? answers[current.id] !== undefined : false

  async function saveAnswer(questionId: string, value: ResponseValue) {
    const studentId = getStudentId(sessionId)
    if (!studentId) return
    try {
      await fetch('/api/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, studentId, questionId, responseValue: value }),
      })
    } catch { /* offline-safe */ }
  }

  function handleAnswer(value: ResponseValue) {
    if (!current || submitting) return
    setAnswers((prev) => ({ ...prev, [current.id]: value }))
    saveAnswer(current.id, value)

    if (advanceTimer.current) { clearTimeout(advanceTimer.current); advanceTimer.current = null }
    if (!isLast) {
      advanceTimer.current = setTimeout(() => { advanceTimer.current = null; setIndex((i) => i + 1) }, 280)
    }
  }

  async function handleComplete() {
    setSubmitting(true)
    setError(null)
    try {
      if (current && answers[current.id]) await saveAnswer(current.id, answers[current.id])
      window.location.href = `/student/session/${encodeURIComponent(sessionId)}/questions/complete?themeId=${themeId}`
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

  if (error || questions.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="text-center">
          <p className="text-student-text-primary">{error || '質問が見つかりません'}</p>
          <Button variant="secondary" className="mt-4" onClick={() => window.location.reload()}>再読み込み</Button>
        </div>
      </main>
    )
  }

  return (
    <main className="matte-texture flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl">
        {/* ヘッダー */}
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-xs tracking-wider text-student-text-disabled">QUESTION</span>
          <span className="font-mono text-xs text-student-text-disabled">{index + 1} / {questions.length}</span>
        </div>
        <ProgressBar value={index + 1} max={questions.length} />

        {/* 質問文 */}
        <div className="mt-10 fade-in" key={index}>
          <div className="font-mono text-xs text-student-text-disabled">Q{current.order}</div>
          <p className="mt-3 font-heading text-2xl font-semibold leading-[1.7] text-student-text-primary md:text-3xl">
            {current.questionText}
          </p>
        </div>

        {/* 回答ボタン: 逆三角形（YES/NO大、UNKNOWN小で下中央） */}
        <div className="mt-10 flex flex-col items-center gap-4">
          {/* 上段: はい / いいえ */}
          <div className="flex w-full gap-4">
            <button
              type="button"
              onClick={() => handleAnswer('YES')}
              disabled={submitting}
              className={[
                'flex flex-1 items-center justify-center gap-3 rounded-2xl py-6 text-lg font-semibold transition-all duration-fast',
                'bg-student-accent-red text-white',
                'hover:brightness-110 active:brightness-90',
                'focus:outline-none focus:ring-2 focus:ring-student-accent-red/50 focus:ring-offset-2 focus:ring-offset-black',
                'disabled:opacity-50',
                answers[current?.id] === 'YES' && 'ring-2 ring-white/80 ring-offset-2 ring-offset-black shadow-[0_0_24px_rgba(183,28,28,0.25)]',
              ].join(' ')}
            >
              <span aria-hidden>✓</span>
              <span>はい</span>
            </button>

            <button
              type="button"
              onClick={() => handleAnswer('NO')}
              disabled={submitting}
              className={[
                'flex flex-1 items-center justify-center gap-3 rounded-2xl py-6 text-lg font-semibold transition-all duration-fast',
                'bg-student-accent-blue text-white',
                'hover:brightness-110 active:brightness-90',
                'focus:outline-none focus:ring-2 focus:ring-student-accent-blue/50 focus:ring-offset-2 focus:ring-offset-black',
                'disabled:opacity-50',
                answers[current?.id] === 'NO' && 'ring-2 ring-white/80 ring-offset-2 ring-offset-black shadow-[0_0_24px_rgba(21,101,192,0.25)]',
              ].join(' ')}
            >
              <span aria-hidden>✗</span>
              <span>いいえ</span>
            </button>
          </div>

          {/* 下段: わからない（小さめ） */}
          <button
            type="button"
            onClick={() => handleAnswer('UNKNOWN')}
            disabled={submitting}
            className={[
              'flex items-center justify-center gap-2 rounded-xl px-8 py-3 text-sm font-medium transition-all duration-fast',
              'bg-student-accent-gray text-white/80',
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

        {error && (
          <div className="mt-4 rounded-lg border border-student-accent-red/30 bg-student-accent-red/10 px-4 py-3">
            <p className="text-sm text-student-text-primary">{error}</p>
          </div>
        )}

        {/* ナビゲーション */}
        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={() => { setError(null); if (advanceTimer.current) { clearTimeout(advanceTimer.current); advanceTimer.current = null }; setIndex((i) => Math.max(i - 1, 0)) }}
            disabled={index === 0 || submitting}
            className="text-sm text-student-text-tertiary transition-colors hover:text-student-text-secondary disabled:opacity-30"
          >
            ← 戻る
          </button>

          {isLast && answered ? (
            <Button onClick={handleComplete} disabled={submitting} size="sm">
              {submitting ? '保存中...' : '回答を完了する'}
            </Button>
          ) : (
            <button
              onClick={() => { setError(null); if (advanceTimer.current) { clearTimeout(advanceTimer.current); advanceTimer.current = null }; setIndex((i) => Math.min(i + 1, questions.length - 1)) }}
              disabled={!answered || submitting}
              className="text-sm text-student-text-tertiary transition-colors hover:text-student-text-secondary disabled:opacity-30"
            >
              次へ →
            </button>
          )}
        </div>
      </div>
    </main>
  )
}
