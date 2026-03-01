'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, LoadingSpinner } from '@/components/ui'
import { StepIndicator } from '@/components/common/StepIndicator'
import { buildStudentSteps, completedStepKeys } from '@/lib/constants/student-flow'

type Theme = {
  id: string
  title: string
  description: string | null
  imageUrl?: string | null
}

export default function ThemeSelectionPage({ params }: { params: { sessionId: string } }) {
  const router = useRouter()
  const sessionId = params.sessionId
  const [themes, setThemes] = useState<Theme[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Group display
  type MyGroup = {
    id: string; name: string;
    theme: { id: string; title: string };
    members: { id: string; name: string | null; isMe: boolean }[];
  }
  const [myGroup, setMyGroup] = useState<MyGroup | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/themes?sessionId=${encodeURIComponent(sessionId)}`, { cache: 'no-store' })
        const ct = res.headers.get('content-type') || ''
        if (!ct.includes('application/json')) throw new Error('サーバーエラーによりテーマを取得できませんでした')
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error?.message || 'テーマの取得に失敗しました')
        if (!cancelled) setThemes(json.data.themes)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'テーマの取得に失敗しました')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [sessionId])

  // Fetch my group on mount
  useEffect(() => {
    async function fetchGroup() {
      try {
        const res = await fetch(`/api/session/my-group?sessionId=${encodeURIComponent(sessionId)}`, { cache: 'no-store' })
        const json = await res.json()
        if (json.success && json.data.group) {
          setMyGroup(json.data.group)
        }
      } catch { /* ignore */ }
    }
    void fetchGroup()
  }, [sessionId, submitted])

  function toggleTheme(themeId: string) {
    if (submitting) return
    setSelected(prev => {
      if (prev.includes(themeId)) return prev.filter(id => id !== themeId)
      if (prev.length >= 2) return prev
      return [...prev, themeId]
    })
  }

  async function confirmSelection() {
    if (selected.length !== 2 || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/session/topic-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, selections: selected }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error?.message || '保存に失敗しました')
      localStorage.setItem(`student:theme:${sessionId}`, selected[0])
      setSubmitted(true)
      router.push(`/student/session/${encodeURIComponent(sessionId)}/themes/${selected[0]}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存エラー')
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

  if (error && themes.length === 0) {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <Card><CardContent><p className="text-student-text-primary">{error}</p></CardContent></Card>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-5xl p-6 md:p-10">
      <StepIndicator
        steps={buildStudentSteps(sessionId)}
        currentKey="themes"
        completedKeys={completedStepKeys('themes')}
        onNavigate={(path) => router.push(path)}
      />

      <div className="mb-8 text-center">
        <h1 className="font-heading text-3xl font-bold text-student-text-primary">興味のあるテーマを2つ選ぶ</h1>
        <p className="mt-2 text-student-text-tertiary">
          グループ活動のために、興味のあるテーマを <strong>2つ</strong> 選んでください。
        </p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5">
          <span className={`text-sm font-medium ${selected.length === 2 ? 'text-green-400' : 'text-student-text-tertiary'}`}>
            {selected.length} / 2 選択済み
          </span>
        </div>
      </div>

      {/* Group display (if assigned) */}
      {myGroup && (
        <div className="mb-8 rounded-2xl border border-green-400/30 bg-green-500/5 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">👥</span>
            <div>
              <h2 className="text-lg font-bold text-student-text-primary">{myGroup.name}</h2>
              <p className="text-xs text-student-text-tertiary">テーマ: {myGroup.theme.title}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {myGroup.members.map(m => (
              <span key={m.id} className={[
                'inline-flex items-center rounded-full px-3 py-1 text-sm font-medium',
                m.isMe
                  ? 'bg-green-500/20 text-green-400 ring-1 ring-green-400/40'
                  : 'bg-white/5 text-student-text-secondary',
              ].join(' ')}>
                {m.name || '名前なし'}{m.isMe && ' (自分)'}
              </span>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-center text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {themes.map((theme, index) => {
          const isSelected = selected.includes(theme.id)
          const isDisabled = submitting || (!isSelected && selected.length >= 2)
          return (
            <button
              key={theme.id}
              onClick={() => toggleTheme(theme.id)}
              disabled={isDisabled}
              className={[
                'group text-left transition-all duration-normal',
                'relative overflow-hidden rounded-2xl border bg-student-bg-tertiary',
                isSelected
                  ? 'border-green-400/60 ring-2 ring-green-400/40 shadow-[0_0_20px_rgba(74,222,128,0.15)]'
                  : 'border-student-border-primary',
                !isDisabled && !isSelected && 'hover:-translate-y-1 hover:shadow-[0_10px_28px_rgba(0,0,0,0.55)]',
                'focus:outline-none focus:ring-2 focus:ring-student-text-primary focus:ring-offset-2 focus:ring-offset-student-bg-primary',
                isDisabled && !isSelected && 'opacity-40 pointer-events-none',
              ].join(' ')}
            >
              {isSelected && (
                <div className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white shadow-lg">
                  <span className="text-lg">✓</span>
                </div>
              )}

              <div className="absolute inset-0">
                {theme.imageUrl ? (
                  <Image src={theme.imageUrl} alt="" fill unoptimized className="object-cover opacity-55 grayscale" sizes="(min-width: 768px) 50vw, 100vw" />
                ) : (
                  <div className="h-full w-full bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.08),transparent_55%),radial-gradient(circle_at_80%_70%,rgba(255,255,255,0.05),transparent_60%)]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/55 to-black/80" />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:24px_24px] opacity-[0.18] mix-blend-overlay" />
              </div>

              <div className="relative p-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-white/70">
                  <span className="font-mono">テーマ</span>
                  <span className="text-white/50">/</span>
                  <span className="font-mono">#{index + 1}</span>
                </div>
                <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">{theme.title}</h2>
                {theme.description && <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-white/70">{theme.description}</p>}
                <div className="mt-5 flex items-center justify-between">
                  {isSelected ? (
                    <span className="text-xs text-green-400 font-medium">✓ 選択済み（タップで解除）</span>
                  ) : (
                    <span className="text-xs text-white/55">タップして選択</span>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {themes.length === 0 && <p className="text-center text-student-text-tertiary">テーマが登録されていません。</p>}

      <div className="mt-10 flex justify-center">
        <button
          onClick={() => void confirmSelection()}
          disabled={selected.length !== 2 || submitting}
          className={[
            'rounded-xl px-10 py-3.5 text-base font-semibold transition-all duration-200',
            selected.length === 2
              ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:-translate-y-0.5'
              : 'bg-white/5 text-white/30 border border-white/10 cursor-not-allowed',
            submitting && 'opacity-60 pointer-events-none',
          ].join(' ')}
        >
          {submitting ? '保存中...' : `選択を確定する (${selected.length}/2)`}
        </button>
      </div>
    </main>
  )
}
