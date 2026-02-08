'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BIG_FIVE_QUESTIONS } from '@/lib/bigfive/questions'
import { Button, ProgressBar } from '@/components/ui'
import { StepIndicator } from '@/components/common/StepIndicator'
import { buildStudentSteps, completedStepKeys } from '@/lib/constants/student-flow'

export default function BigFivePage({ params }: { params: { sessionId: string } }) {
  const router = useRouter()
  const sessionId = params.sessionId
  const steps = useMemo(() => buildStudentSteps(sessionId), [sessionId])
  const [checking, setChecking] = useState(true)
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const current = BIG_FIVE_QUESTIONS[index]
  const canNext = answers[current.number] !== undefined && !submitting
  const isLast = index === BIG_FIVE_QUESTIONS.length - 1
  const completed = useMemo(() => Object.keys(answers).length === 10, [answers])

  useEffect(() => {
    let cancelled = false
    async function checkExisting() {
      try {
        const res = await fetch(`/api/big-five/results?sessionId=${encodeURIComponent(sessionId)}`, { cache: 'no-store' })
        const json = await res.json()
        if (res.ok && json?.data?.result) {
          localStorage.setItem(`bigfive:result:${sessionId}`, JSON.stringify(json.data.result))
          if (!cancelled) router.push(`/student/session/${encodeURIComponent(sessionId)}/big-five/result`)
          return
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setChecking(false)
      }
    }
    void checkExisting()
    return () => {
      cancelled = true
    }
  }, [router, sessionId])

  async function safeParseJson(res: Response): Promise<any> {
    const ct = res.headers.get('content-type') || ''
    if (ct.includes('application/json')) return res.json()
    const text = await res.text()
    return { __nonJson: true, text: text.slice(0, 300) }
  }

  const doSubmit = useCallback(
    async (finalAnswers: Record<number, number>) => {
      if (submitting) return
      setSubmitting(true)
      setError(null)
      try {
        const res = await fetch('/api/big-five/results', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            answers: BIG_FIVE_QUESTIONS.map((q) => ({
              questionNumber: q.number,
              score: finalAnswers[q.number] ?? 2,
            })),
          }),
        })
        const json = await safeParseJson(res)
        if (!res.ok) {
          if (json?.error?.code === 'ALREADY_COMPLETED') {
            const latest = await fetch(`/api/big-five/results?sessionId=${encodeURIComponent(sessionId)}`, { cache: 'no-store' })
            const latestJson = await latest.json()
            if (latestJson?.data?.result) {
              localStorage.setItem(`bigfive:result:${sessionId}`, JSON.stringify(latestJson.data.result))
              router.push(`/student/session/${encodeURIComponent(sessionId)}/big-five/result`)
              return
            }
          }
          if (json?.__nonJson) throw new Error('サーバー応答が不正です')
          throw new Error(json?.error?.message || '保存に失敗しました')
        }
        localStorage.setItem(`bigfive:result:${sessionId}`, JSON.stringify(json.data.result))
        router.push(`/student/session/${encodeURIComponent(sessionId)}/big-five/result`)
      } catch (err) {
        setError(err instanceof Error ? err.message : '保存に失敗しました')
        setSubmitting(false)
      }
    },
    [router, sessionId, submitting]
  )

  function setScore(score: number) {
    const next = { ...answers, [current.number]: score }
    setAnswers(next)
    if (advanceTimer.current) {
      clearTimeout(advanceTimer.current)
      advanceTimer.current = null
    }
    if (!isLast) {
      advanceTimer.current = setTimeout(() => {
        advanceTimer.current = null
        setIndex((i) => Math.min(i + 1, BIG_FIVE_QUESTIONS.length - 1))
      }, 200)
    } else if (Object.keys(next).length === BIG_FIVE_QUESTIONS.length) {
      advanceTimer.current = setTimeout(() => {
        advanceTimer.current = null
        void doSubmit(next)
      }, 250)
    }
  }

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-student-text-tertiary">認証中...</p>
      </main>
    )
  }

  return (
    <main className="matte-texture flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-xl">
        <StepIndicator
          steps={steps}
          currentKey="big-five"
          completedKeys={completedStepKeys('big-five')}
          onNavigate={(path) => router.push(path)}
        />
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-xs tracking-wider text-student-text-disabled">Big Five診断</span>
          <span className="font-mono text-xs text-student-text-disabled">
            {index + 1} / {BIG_FIVE_QUESTIONS.length}
          </span>
        </div>
        <ProgressBar value={index + 1} max={BIG_FIVE_QUESTIONS.length} />

        <div className="mt-10 fade-in" key={index}>
          <div className="font-mono text-xs text-student-text-disabled">Q{current.number}</div>
          <p className="mt-3 font-heading text-2xl font-semibold leading-relaxed text-student-text-primary md:text-3xl">
            {current.text}
          </p>
        </div>

        <div className="mt-10">
          <div className="flex gap-3">
            {[0, 1, 2, 3, 4].map((value) => {
              const selected = answers[current.number] === value
              const scoreLabel =
                value === 0 ? 'あてはまらない' : value === 4 ? '強くあてはまる' : '中間'

              return (
                <button
                  key={value}
                  type="button"
                  aria-label={`スコア ${value}: ${scoreLabel}`}
                  onClick={() => setScore(value)}
                  className={[
                    'flex-1 rounded-xl py-6 text-xl font-semibold transition-all duration-fast',
                    'focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-black',
                    selected
                      ? 'bg-student-text-primary text-black shadow-[0_0_20px_rgba(255,255,255,0.12)]'
                      : 'bg-student-bg-tertiary text-student-text-secondary hover:bg-student-bg-elevated hover:text-student-text-primary',
                  ].join(' ')}
                >
                  {value}
                </button>
              )
            })}
          </div>
          <div className="mt-3 flex justify-between text-xs text-student-text-disabled">
            <span>あてはまらない</span>
            <span>強くあてはまる</span>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-student-text-disabled">
          いまの自分に近いものを選んでください。最後の設問で回答を自動送信します。
        </p>

        {error && (
          <div className="mt-6 rounded-lg border border-student-semantic-error/30 bg-student-semantic-error/10 px-6 py-4">
            <p className="text-sm text-student-text-primary">{error}</p>
          </div>
        )}

        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={() => {
              if (submitting) return
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
          <Button
            onClick={() => {
              if (!canNext) return
              if (isLast) {
                void doSubmit(answers)
              } else {
                setIndex((i) => i + 1)
              }
            }}
            disabled={!canNext || (!completed && isLast)}
            size="sm"
          >
            {isLast ? (submitting ? '保存中...' : '確定') : '次へ'}
          </Button>
        </div>
      </div>
    </main>
  )
}
