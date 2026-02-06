'use client'

import { useEffect, useState } from 'react'
import { Button, LoadingSpinner } from '@/components/ui'

function getStudentId(sessionId: string): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(`student:id:${sessionId}`)
}

const STEPS = [
  { num: '01', label: 'Big Five 性格診断', desc: '10問の直感的な質問' },
  { num: '02', label: 'テーマ選択', desc: '興味のあるテーマを1つ選ぶ' },
  { num: '03', label: '質問回答', desc: '未来社会についての20の問い' },
  { num: '04', label: '意見マップ', desc: '集団の中での自分の位置を見る' },
]

export default function StudentSessionPage({
  params,
}: {
  params: { sessionId: string }
}) {
  const sessionId = params.sessionId
  const [ready, setReady] = useState(false)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const existing = getStudentId(sessionId)
    if (existing) {
      setReady(true)
      return
    }

    let cancelled = false
    async function autoJoin() {
      try {
        setJoining(true)
        const res = await fetch('/api/session/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        })
        const ct = res.headers.get('content-type') || ''
        if (!ct.includes('application/json')) throw new Error('サーバーエラー')
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error?.message || 'セッション参加に失敗しました')
        const newStudentId = json?.data?.studentId as string | undefined
        if (!newStudentId) throw new Error('studentIdの発行に失敗しました')
        if (!cancelled) {
          localStorage.setItem(`student:id:${sessionId}`, newStudentId)
          localStorage.setItem('student:lastSessionId', sessionId)
          setReady(true)
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'セッション参加に失敗しました')
      } finally {
        if (!cancelled) setJoining(false)
      }
    }
    autoJoin()
    return () => { cancelled = true }
  }, [sessionId])

  if (joining) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-center float-up">
          <LoadingSpinner size="lg" />
          <p className="mt-5 text-sm text-student-text-tertiary">セッションに接続中...</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-6">
        <div className="w-full max-w-md text-center">
          <p className="font-mono text-xs text-student-accent-red">ERROR</p>
          <p className="mt-3 text-student-text-primary">{error}</p>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="secondary" onClick={() => window.location.reload()}>再試行</Button>
            <Button variant="secondary" onClick={() => (window.location.href = '/student')}>ID入力に戻る</Button>
          </div>
        </div>
      </main>
    )
  }

  if (!ready) return null

  return (
    <main className="matte-texture relative flex min-h-screen flex-col items-center justify-center px-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/3 top-1/4 h-[500px] w-[500px] rounded-full bg-white/[0.015] blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        <div className="float-up text-center">
          <p className="font-mono text-xs tracking-[0.2em] text-student-text-disabled">SESSION JOINED</p>
          <h1 className="mt-4 font-heading text-3xl font-bold text-student-text-primary">
            これから始まること
          </h1>
          <p className="mt-3 text-sm text-student-text-tertiary">
            4つのステップで、あなたの思考を可視化します
          </p>
        </div>

        {/* ステップ一覧 */}
        <div className="mt-10 space-y-0">
          {STEPS.map((step, i) => (
            <div
              key={step.num}
              className="fade-in flex items-start gap-5 border-l border-student-border-primary py-5 pl-6"
              style={{ animationDelay: `${150 + i * 100}ms` }}
            >
              <span className="font-mono text-sm text-student-text-disabled">{step.num}</span>
              <div>
                <div className="text-base font-medium text-student-text-primary">{step.label}</div>
                <div className="mt-0.5 text-sm text-student-text-tertiary">{step.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center fade-in" style={{ animationDelay: '600ms' }}>
          <Button
            onClick={() => (window.location.href = `/student/session/${encodeURIComponent(sessionId)}/big-five`)}
            className="rounded-xl px-10 py-4 text-base"
          >
            はじめる
          </Button>
          <p className="mt-4 text-xs text-student-text-disabled">所要時間：約10〜15分</p>
        </div>
      </div>
    </main>
  )
}
