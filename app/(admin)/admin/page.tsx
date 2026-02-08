'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components/ui'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'

type TeacherProfile = {
  id: string
  name: string
  email: string
  school: { id: string; code: string; name: string }
}

export default function AdminHomePage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [loading, setLoading] = useState(false)
  const [profileLoading, setProfileLoading] = useState(true)
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const [schoolCode, setSchoolCode] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [teacherName, setTeacherName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadProfile() {
      try {
        const res = await fetch('/api/auth/teacher/me', { cache: 'no-store' })
        if (!res.ok) return
        const json = await res.json()
        if (!cancelled) setTeacher(json?.data?.teacher || null)
      } catch {
        // ignore
      } finally {
        if (!cancelled) setProfileLoading(false)
      }
    }

    void loadProfile()
    return () => {
      cancelled = true
    }
  }, [])

  const canSubmit = useMemo(() => {
    if (mode === 'login') return email.trim().length > 0 && password.length > 0
    return (
      schoolCode.trim().length >= 3 &&
      schoolName.trim().length >= 2 &&
      teacherName.trim().length > 0 &&
      email.trim().length > 0 &&
      password.length >= 8
    )
  }, [mode, schoolCode, schoolName, teacherName, email, password])

  async function submitAuth() {
    if (!canSubmit || loading) return

    setLoading(true)
    setError(null)

    try {
      const endpoint = mode === 'login' ? '/api/auth/teacher/login' : '/api/auth/teacher/register'
      const payload = mode === 'login' ? { email, password } : { schoolCode, schoolName, teacherName, email, password }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json?.error?.message || '認証処理に失敗しました')

      router.push('/admin/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : '認証処理に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await submitAuth()
  }

  async function logout() {
    setLoading(true)
    try {
      await fetch('/api/auth/teacher/logout', { method: 'POST' })
      router.push('/admin')
      router.refresh()
    } finally {
      setLoading(false)
      setShowLogoutConfirm(false)
    }
  }

  if (profileLoading) {
    return <main className="mx-auto max-w-3xl p-8 text-admin-text-primary">読み込み中...</main>
  }

  if (teacher) {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <Card tone="admin">
          <CardHeader>
            <CardTitle className="font-body text-admin-text-primary">教員プロフィール</CardTitle>
          </CardHeader>
          <CardContent className="text-admin-text-secondary">
            <p className="mb-2">
              {teacher.school.name} ({teacher.school.code})
            </p>
            <p className="mb-6">
              {teacher.name} / {teacher.email}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/admin/board">
                <Button tone="admin" type="button">
                  セッション一覧へ
                </Button>
              </Link>
              <Link href="/admin/dashboard">
                <Button tone="admin" type="button" variant="secondary">
                  ダッシュボードへ
                </Button>
              </Link>
              <Link href="/admin/themes">
                <Button tone="admin" type="button" variant="secondary">
                  テーマ管理
                </Button>
              </Link>
              <Button tone="admin" type="button" variant="secondary" onClick={() => setShowLogoutConfirm(true)}>
                ログアウト
              </Button>
            </div>
          </CardContent>
        </Card>
        <ConfirmDialog
          open={showLogoutConfirm}
          title="ログアウトしますか？"
          description="管理画面の操作を終了します。"
          confirmLabel="ログアウト"
          destructive
          onConfirm={() => void logout()}
          onCancel={() => setShowLogoutConfirm(false)}
        />
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-3xl p-8">
      <Card tone="admin">
        <CardHeader>
          <CardTitle className="font-body text-admin-text-primary">教員ログイン</CardTitle>
        </CardHeader>
        <CardContent className="text-admin-text-secondary">
          <div className="mb-4 flex gap-2">
            <Button
              tone="admin"
              type="button"
              variant={mode === 'login' ? 'primary' : 'secondary'}
              onClick={() => setMode('login')}
            >
              ログイン
            </Button>
            <Button
              tone="admin"
              type="button"
              variant={mode === 'register' ? 'primary' : 'secondary'}
              onClick={() => setMode('register')}
            >
              新規登録
            </Button>
          </div>

          {error && <p className="mb-4 text-sm text-red-700">{error}</p>}

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'register' && (
              <div className="grid gap-3">
                <Input
                  label="学校コード"
                  value={schoolCode}
                  onChange={(event) => setSchoolCode(event.target.value)}
                  placeholder="example-university"
                  className="border-admin-border-primary bg-admin-bg-primary text-admin-text-primary"
                />
                <Input
                  label="学校名"
                  value={schoolName}
                  onChange={(event) => setSchoolName(event.target.value)}
                  placeholder="サンプル高校"
                  className="border-admin-border-primary bg-admin-bg-primary text-admin-text-primary"
                />
                <Input
                  label="教員名"
                  value={teacherName}
                  onChange={(event) => setTeacherName(event.target.value)}
                  className="border-admin-border-primary bg-admin-bg-primary text-admin-text-primary"
                />
              </div>
            )}

            <div className="grid gap-3">
              <Input
                label="メールアドレス"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="border-admin-border-primary bg-admin-bg-primary text-admin-text-primary"
              />
              <Input
                label="パスワード"
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="border-admin-border-primary bg-admin-bg-primary text-admin-text-primary"
              />
            </div>

            <div className="pt-3">
              <Button tone="admin" type="submit" disabled={!canSubmit || loading}>
                {loading ? '処理中...' : mode === 'login' ? 'ログインする' : '登録して開始'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
