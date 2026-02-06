'use client'

import { useMemo, useState } from 'react'
import { Button, Input } from '@/components/ui'

export default function StudentJoinPage() {
  const [sessionId, setSessionId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)

  const canJoin = useMemo(() => sessionId.trim().length > 0, [sessionId])

  async function onJoin() {
    const id = sessionId.trim()
    if (!id) return
    setError(null)
    const uuidOk = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    if (!uuidOk) {
      setError('セッションIDの形式が不正です（UUID形式）')
      return
    }

    try {
      setJoining(true)
      localStorage.setItem('student:lastSessionId', id)
      const res = await fetch('/api/session/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: id }),
      })
      const ct = res.headers.get('content-type') || ''
      if (!ct.includes('application/json')) throw new Error('サーバーエラー（DB未設定の可能性）')
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error?.message || '参加に失敗しました')

      const studentId = json?.data?.studentId as string | undefined
      if (!studentId) throw new Error('studentIdの発行に失敗しました')

      localStorage.setItem(`student:id:${id}`, studentId)
      window.location.href = `/student/session/${encodeURIComponent(id)}`
    } catch (e) {
      setError(e instanceof Error ? e.message : '参加に失敗しました')
    } finally {
      setJoining(false)
    }
  }

  return (
    <main className="matte-texture relative flex min-h-screen flex-col items-center justify-center px-6">
      {/* 背景演出 */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-1/4 top-1/4 h-[400px] w-[400px] rounded-full bg-white/[0.015] blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="float-up text-center">
          <p className="font-mono text-xs tracking-[0.2em] text-student-text-disabled">SESSION ACCESS</p>
          <h1 className="mt-4 font-heading text-3xl font-bold text-student-text-primary">
            セッションに参加
          </h1>
          <p className="mt-3 text-sm text-student-text-tertiary">
            教員から共有されたIDを入力してください
          </p>
        </div>

        <div className="mt-10 space-y-5 fade-in" style={{ animationDelay: '150ms' }}>
          {error && (
            <div className="rounded-lg border border-student-accent-red/30 bg-student-accent-red/10 px-4 py-3">
              <p className="text-sm text-student-text-primary">{error}</p>
            </div>
          )}

          <Input
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            placeholder="セッションID（UUID）"
            className="text-center font-mono text-lg tracking-wider"
            onKeyDown={(e) => e.key === 'Enter' && onJoin()}
          />

          <Button
            onClick={onJoin}
            disabled={!canJoin || joining}
            className="w-full rounded-xl py-4 text-base"
          >
            {joining ? '参加しています...' : '参加する'}
          </Button>
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => (window.location.href = '/')}
            className="text-xs text-student-text-disabled transition-colors hover:text-student-text-tertiary"
          >
            ← トップに戻る
          </button>
        </div>
      </div>
    </main>
  )
}
