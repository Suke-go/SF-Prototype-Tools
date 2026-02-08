'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input, LoadingSpinner } from '@/components/ui'
import { fetchWithRetry } from '@/lib/fetch-with-retry'

type SessionGateState = 'checking' | 'joined' | 'needs_join'

export default function StudentSessionPage({ params }: { params: { sessionId: string } }) {
  const router = useRouter()
  const sessionId = params.sessionId
  const [gateState, setGateState] = useState<SessionGateState>('checking')
  const [passcode, setPasscode] = useState('')
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nextPath, setNextPath] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function checkGate() {
      try {
        const progressRes = await fetchWithRetry(`/api/session/progress?sessionId=${encodeURIComponent(sessionId)}`, {
          cache: 'no-store',
        })
        if (cancelled) return

        if (progressRes.ok) {
          const progressJson = await progressRes.json()
          const path = progressJson?.data?.nextPath as string | undefined
          if (path) setNextPath(path)
          if (path && !path.endsWith('/big-five')) {
            router.push(path)
            return
          }
          setGateState('joined')
          return
        }

        if (progressRes.status === 401 || progressRes.status === 403) {
          setGateState('needs_join')
          return
        }

        setError('セッション状態の確認に失敗しました')
        setGateState('needs_join')
      } catch {
        if (!cancelled) {
          setError('セッション状態の確認に失敗しました')
          setGateState('needs_join')
        }
      }
    }

    void checkGate()

    return () => {
      cancelled = true
    }
  }, [router, sessionId])

  async function joinFromSessionPage() {
    if (!passcode.trim()) return
    setError(null)
    setJoining(true)
    try {
      const res = await fetchWithRetry('/api/session/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, passcode: passcode.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error?.message || 'セッション参加に失敗しました')
      const progressRes = await fetchWithRetry(`/api/session/progress?sessionId=${encodeURIComponent(sessionId)}`, {
        cache: 'no-store',
      })
      if (progressRes.ok) {
        const progressJson = await progressRes.json()
        const path = progressJson?.data?.nextPath as string | undefined
        if (path) {
          router.push(path)
          return
        }
      }
      setGateState('joined')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'セッション参加に失敗しました')
    } finally {
      setJoining(false)
    }
  }

  if (gateState === 'checking') {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </main>
    )
  }

  if (gateState === 'needs_join') {
    return (
      <main className="matte-texture relative flex min-h-screen flex-col items-center justify-center px-6">
        <div className="w-full max-w-md">
          <div className="text-center">
            <p className="font-mono text-xs tracking-[0.2em] text-student-text-disabled">参加認証</p>
            <h1 className="mt-3 font-heading text-3xl font-bold text-student-text-primary">参加コードを入力</h1>
            <p className="mt-3 text-sm text-student-text-tertiary">このURLから参加するには参加コードが必要です。</p>
          </div>

          <div className="mt-8 space-y-3">
            {error && (
              <div className="rounded-lg border border-student-semantic-error/30 bg-student-semantic-error/10 px-6 py-4">
                <p className="text-sm text-student-text-primary">{error}</p>
              </div>
            )}
            <Input
              type="password"
              value={passcode}
              onChange={(event) => setPasscode(event.target.value)}
              placeholder="参加コード"
              className="text-center font-mono"
              onKeyDown={(event) => event.key === 'Enter' && joinFromSessionPage()}
            />
            <Button onClick={() => void joinFromSessionPage()} disabled={joining || !passcode.trim()} className="w-full">
              {joining ? '参加中...' : 'このセッションに参加'}
            </Button>
            <Button variant="secondary" onClick={() => router.push('/student')} className="w-full">
              参加画面に戻る
            </Button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="matte-texture relative flex min-h-screen flex-col items-center justify-center px-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/3 top-1/4 h-[500px] w-[500px] rounded-full bg-white/[0.015] blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        <div className="float-up text-center">
          <p className="font-mono text-xs tracking-[0.2em] text-student-text-disabled">セッション説明</p>
          <h1 className="mt-4 font-heading text-3xl font-bold text-student-text-primary">セッションへようこそ</h1>
          <p className="mt-3 text-sm text-student-text-tertiary">
            この体験では、対話活動のテーマを読みながら、あなたの考えを言語化していきます。
          </p>
        </div>

        <div className="mt-8 rounded-xl border border-student-border-primary bg-student-bg-secondary p-6 text-sm leading-7 text-student-text-secondary fade-in">
          <p>正解を当てる活動ではなく、近い考えに気づく活動です。</p>
          <p className="mt-3">最初に Big Five 診断を行い、その後にテーマへ進みます。</p>
        </div>

        <div className="mt-12 text-center fade-in" style={{ animationDelay: '600ms' }}>
          <Button
            onClick={() => router.push(nextPath || `/student/session/${encodeURIComponent(sessionId)}/big-five`)}
            className="rounded-xl px-12 py-6 text-base"
          >
            {nextPath && !nextPath.endsWith('/big-five') ? '続きから再開' : 'Big Five 診断へ'}
          </Button>
        </div>
      </div>
    </main>
  )
}
