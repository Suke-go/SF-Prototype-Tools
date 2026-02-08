'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input } from '@/components/ui'
import { fetchWithRetry } from '@/lib/fetch-with-retry'

export default function StudentJoinPage() {
  const router = useRouter()
  const [sessionCode, setSessionCode] = useState('')
  const [passcode, setPasscode] = useState('')
  const [studentName, setStudentName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)

  const canJoin = useMemo(
    () => sessionCode.trim().length > 0 && passcode.trim().length > 0,
    [sessionCode, passcode]
  )

  async function onJoin() {
    const code = sessionCode.trim().toUpperCase()
    const joinPasscode = passcode.trim()
    if (!code || !joinPasscode) return

    setError(null)
    try {
      setJoining(true)
      const res = await fetchWithRetry('/api/session/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionCode: code,
          passcode: joinPasscode,
          studentName: studentName.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error?.message || '参加に失敗しました')

      const sessionId = json?.data?.sessionId as string | undefined
      if (!sessionId) throw new Error('参加情報の取得に失敗しました')

      router.push(`/student/session/${encodeURIComponent(sessionId)}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '参加に失敗しました')
    } finally {
      setJoining(false)
    }
  }

  return (
    <main className="matte-texture relative flex min-h-screen flex-col items-center justify-center px-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-1/4 top-1/4 h-[400px] w-[400px] rounded-full bg-white/[0.015] blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="float-up text-center">
          <p className="font-mono text-xs tracking-[0.2em] text-student-text-disabled">参加入口</p>
          <h1 className="mt-4 font-heading text-3xl font-bold text-student-text-primary">セッションに参加</h1>
          <p className="mt-3 text-sm text-student-text-tertiary">共有されたセッションコードと参加コードを入力します。</p>
        </div>

        <div className="mt-12 space-y-6 fade-in" style={{ animationDelay: '150ms' }}>
          {error && (
            <div className="rounded-lg border border-student-semantic-error/30 bg-student-semantic-error/10 px-6 py-4">
              <p className="text-sm text-student-text-primary">{error}</p>
            </div>
          )}

          <Input
            label="表示名（任意）"
            helperText="この名前は学習ログに表示されます"
            value={studentName}
            onChange={(event) => setStudentName(event.target.value)}
            placeholder="例: 山田太郎"
            className="text-center text-base"
          />
          <Input
            label="セッションコード"
            value={sessionCode}
            onChange={(event) => setSessionCode(event.target.value)}
            placeholder="例: MOONSHOT-A"
            className="text-center font-mono text-base tracking-wider"
            onKeyDown={(event) => event.key === 'Enter' && onJoin()}
          />
          <Input
            label="参加コード"
            value={passcode}
            onChange={(event) => setPasscode(event.target.value)}
            type="password"
            placeholder="4桁以上の数字（例: 2468）"
            className="text-center font-mono text-base tracking-wider"
            onKeyDown={(event) => event.key === 'Enter' && onJoin()}
          />

          <Button onClick={onJoin} disabled={!canJoin || joining} className="w-full rounded-xl py-6 text-base">
            {joining ? '認証中...' : 'このセッションに入る'}
          </Button>
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => router.push('/')}
            className="text-xs text-student-text-disabled transition-colors hover:text-student-text-tertiary"
          >
            トップに戻る
          </button>
        </div>
      </div>
    </main>
  )
}
