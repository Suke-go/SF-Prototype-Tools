'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button, Input } from '@/components/ui'
import { fetchWithRetry } from '@/lib/fetch-with-retry'
import { toHalfWidth } from '@/lib/utils/normalize'

export default function StudentJoinPageWrapper() {
  return (
    <Suspense fallback={
      <main className="matte-texture flex min-h-screen items-center justify-center">
        <p className="text-student-text-disabled">読み込み中...</p>
      </main>
    }>
      <StudentJoinPage />
    </Suspense>
  )
}

function StudentJoinPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [sessionCode, setSessionCode] = useState('')
  const [passcode, setPasscode] = useState('')
  const [studentName, setStudentName] = useState('')
  const [showPasscode, setShowPasscode] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)

  // U1: URLクエリパラメータでセッションコード事前入力
  useEffect(() => {
    const code = searchParams.get('code')
    if (code) setSessionCode(toHalfWidth(code.trim().toUpperCase()))
  }, [searchParams])

  const canJoin = useMemo(
    () => sessionCode.trim().length > 0 && passcode.trim().length >= 4 && agreedToTerms,
    [sessionCode, passcode, agreedToTerms]
  )

  // U3: 全角→半角自動変換
  function handleSessionCodeChange(value: string) {
    setSessionCode(toHalfWidth(value).toUpperCase())
  }

  async function onJoin() {
    const code = sessionCode.trim().toUpperCase()
    const joinPasscode = passcode.trim()
    if (!code || !joinPasscode || !agreedToTerms) return

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

          {/* U4: 匿名ヘルパーテキスト */}
          <Input
            label="表示名（任意）"
            helperText="未入力の場合は「匿名」として表示されます"
            value={studentName}
            onChange={(event) => setStudentName(event.target.value)}
            placeholder="例: 山田太郎"
            className="text-center text-base"
          />
          <Input
            label="セッションコード"
            value={sessionCode}
            onChange={(event) => handleSessionCodeChange(event.target.value)}
            placeholder="例: MOONSHOT-A"
            className="text-center font-mono text-base tracking-wider"
            onKeyDown={(event) => event.key === 'Enter' && onJoin()}
          />

          {/* U2: パスコード表示トグル */}
          <div className="relative">
            <Input
              label="参加コード"
              helperText="6文字以上のコードを入力してください"
              value={passcode}
              onChange={(event) => setPasscode(event.target.value)}
              type={showPasscode ? 'text' : 'password'}
              placeholder="6桁以上のコード"
              className="text-center font-mono text-base tracking-wider pr-12"
              onKeyDown={(event) => event.key === 'Enter' && onJoin()}
            />
            <button
              type="button"
              onClick={() => setShowPasscode(!showPasscode)}
              className="absolute right-3 top-[38px] p-1 text-student-text-disabled transition-colors hover:text-student-text-secondary"
              aria-label={showPasscode ? 'パスコードを隠す' : 'パスコードを表示'}
            >
              {showPasscode ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
              )}
            </button>
          </div>

          {/* U5: プライバシー同意チェックボックス */}
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(event) => setAgreedToTerms(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-student-border-primary bg-transparent accent-white"
            />
            <span className="text-xs leading-relaxed text-student-text-tertiary">
              <Link href="/terms" target="_blank" className="underline hover:text-student-text-secondary">利用規約</Link>
              と
              <Link href="/privacy" target="_blank" className="underline hover:text-student-text-secondary">プライバシーポリシー</Link>
              に同意します
            </span>
          </label>

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
