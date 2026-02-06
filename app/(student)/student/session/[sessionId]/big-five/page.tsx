'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { BIG_FIVE_QUESTIONS } from '@/lib/bigfive/questions'
import { Button, ProgressBar } from '@/components/ui'

function getStudentId(sessionId: string): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(`student:id:${sessionId}`)
}

export default function BigFivePage({ params }: { params: { sessionId: string } }) {
  const sessionId = params.sessionId

  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const current = BIG_FIVE_QUESTIONS[index]
  const canNext = answers[current.number] !== undefined && !submitting
  const isLast = index === BIG_FIVE_QUESTIONS.length - 1
  const completed = useMemo(() => Object.keys(answers).length === 10, [answers])

  async function safeParseJson(res: Response): Promise<any> {
    const ct = res.headers.get('content-type') || ''
    if (ct.includes('application/json')) return res.json()
    const text = await res.text()
    return { __nonJson: true, text: text.slice(0, 300) }
  }

  const doSubmit = useCallback(async (finalAnswers: Record<number, number>) => {
    if (submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const studentId = getStudentId(sessionId)
      if (!studentId) throw new Error('学生情報が見つかりません。参加画面から入り直してください。')
      const res = await fetch('/api/big-five/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          studentId,
          answers: BIG_FIVE_QUESTIONS.map((q) => ({
            questionNumber: q.number,
            score: finalAnswers[q.number] ?? 2,
          })),
        }),
      })
      const json = await safeParseJson(res)
      if (!res.ok) {
        if (json?.__nonJson) throw new Error('サーバーエラー（DB未設定の可能性）')
        throw new Error(json?.error?.message || '保存に失敗しました')
      }
      localStorage.setItem(`bigfive:result:${sessionId}`, JSON.stringify(json.data.result))
      window.location.href = `/student/session/${encodeURIComponent(sessionId)}/big-five/result`
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存に失敗しました')
      setSubmitting(false)
    }
  }, [sessionId, submitting])

  function setScore(score: number) {
    const newAnswers = { ...answers, [current.number]: score }
    setAnswers(newAnswers)
    if (advanceTimer.current) { clearTimeout(advanceTimer.current); advanceTimer.current = null }
    if (!isLast) {
      advanceTimer.current = setTimeout(() => {
        advanceTimer.current = null
        setIndex((i) => Math.min(i + 1, BIG_FIVE_QUESTIONS.length - 1))
      }, 200)
    } else if (Object.keys(newAnswers).length === 10) {
      advanceTimer.current = setTimeout(() => { advanceTimer.current = null; doSubmit(newAnswers) }, 300)
    }
  }

  function onNext() {
    if (!canNext) return
    setError(null)
    if (advanceTimer.current) { clearTimeout(advanceTimer.current); advanceTimer.current = null }
    if (!isLast) { setIndex((i) => i + 1); return }
    doSubmit(answers)
  }

  function onBack() {
    if (submitting) return
    if (advanceTimer.current) { clearTimeout(advanceTimer.current); advanceTimer.current = null }
    setError(null)
    setIndex((i) => Math.max(i - 1, 0))
  }

  return (
    <main className="matte-texture flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-xl">
        {/* ヘッダー */}
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-xs tracking-wider text-student-text-disabled">
            BIG FIVE DIAGNOSIS
          </span>
          <span className="font-mono text-xs text-student-text-disabled">
            {index + 1} / 10
          </span>
        </div>
        <ProgressBar value={index + 1} max={10} />

        {/* 質問 */}
        <div className="mt-10 fade-in" key={index}>
          <div className="font-mono text-xs text-student-text-disabled">Q{current.number}</div>
          <p className="mt-3 font-heading text-2xl font-semibold leading-relaxed text-student-text-primary md:text-3xl">
            {current.text}
          </p>
        </div>

        {/* 回答ボタン（0-4） */}
        <div className="mt-10">
          <div className="flex gap-3">
            {[0, 1, 2, 3, 4].map((v) => {
              const selected = answers[current.number] === v
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => setScore(v)}
                  className={[
                    'flex-1 rounded-xl py-5 text-xl font-semibold transition-all duration-fast',
                    'focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-black',
                    selected
                      ? 'bg-student-text-primary text-black shadow-[0_0_20px_rgba(255,255,255,0.12)]'
                      : 'bg-student-bg-tertiary text-student-text-secondary hover:bg-student-bg-elevated hover:text-student-text-primary',
                  ].join(' ')}
                >
                  {v}
                </button>
              )
            })}
          </div>
          <div className="mt-3 flex justify-between text-xs text-student-text-disabled">
            <span>あてはまらない</span>
            <span>完全にあてはまる</span>
          </div>
        </div>

        {/* ヒント */}
        <p className="mt-6 text-center text-xs text-student-text-disabled">
          直感で選んでください。自動で次に進みます。
        </p>

        {/* エラー */}
        {error && (
          <div className="mt-4 rounded-lg border border-student-accent-red/30 bg-student-accent-red/10 px-4 py-3">
            <p className="text-sm text-student-text-primary">{error}</p>
          </div>
        )}

        {/* ナビゲーション */}
        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={onBack}
            disabled={index === 0 || submitting}
            className="text-sm text-student-text-tertiary transition-colors hover:text-student-text-secondary disabled:opacity-30"
          >
            ← 戻る
          </button>
          <Button onClick={onNext} disabled={!canNext} size="sm">
            {isLast ? (submitting ? '保存中...' : '完了') : '次へ →'}
          </Button>
        </div>
      </div>
    </main>
  )
}
