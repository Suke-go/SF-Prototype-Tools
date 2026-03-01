'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import storiesData from '@/content/briefings/stories.json'
import { Button } from '@/components/ui'
import { inferMoonshotGoalKeyFromTheme, MOONSHOT_GOALS, type MoonshotGoal } from '@/lib/moonshot/catalog'
import { StepIndicator } from '@/components/common/StepIndicator'
import { buildStudentSteps, completedStepKeys } from '@/lib/constants/student-flow'
import { renderBriefingSection } from '@/components/briefing/BriefingSections'
import { buildBriefingSections } from '@/lib/briefing/buildSections'

type LogMap = Record<string, { id: string; reflection: string; updatedAt: string }>

type SessionTheme = {
  id: string
  title: string
  description: string | null
  imageUrl?: string | null
  worldviewCardId?: string | null
}

type BeginnerStory = {
  opening: string[]
  socialScenes: { title: string; body: string }[]
  insightExamples: { role: string; insight: string }[]
  glossary: { term: string; meaning: string }[]
}

const BeginnerStorySchema = z.object({
  opening: z.array(z.string()),
  socialScenes: z.array(z.object({ title: z.string(), body: z.string() })),
  insightExamples: z.array(z.object({ role: z.string(), insight: z.string() })),
  glossary: z.array(z.object({ term: z.string(), meaning: z.string() })),
})

const BeginnerStoriesSchema = z.record(z.string(), BeginnerStorySchema)
const BEGINNER_STORIES: Record<string, BeginnerStory> = BeginnerStoriesSchema.parse(storiesData)

const DEFAULT_STORY: BeginnerStory = {
  opening: ['未来を考えるときは、技術だけでなく使い方や社会のルールもあわせて考えることが大切です。'],
  socialScenes: [
    { title: '身近な場面', body: '学校・家庭・地域で、どのような変化が起きるかを具体的に想像してみましょう。' },
  ],
  insightExamples: [
    { role: '例', insight: '「便利さ」と「公平さ」を両立させるには何が必要かを考える。' },
  ],
  glossary: [
    { term: '実装', meaning: 'アイデアを具体的な仕組みとして動かせる形にすること。' },
  ],
}

export default function BriefingPage({ params }: { params: { sessionId: string } }) {
  const sessionId = params.sessionId
  const router = useRouter()
  const draftStorageKey = `draft:${sessionId}:learningLog`

  const [themes, setThemes] = useState<SessionTheme[]>([])
  const [selectedThemeId, setSelectedThemeId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [logs, setLogs] = useState<LogMap>({})
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const draftsRef = useRef<Record<string, string>>({})

  // ── localStorage: theme selection ──
  useEffect(() => {
    if (typeof window === 'undefined') return
    const queryThemeId = new URLSearchParams(window.location.search).get('themeId')
    const savedThemeId = localStorage.getItem(`student:theme:${sessionId}`)
    setSelectedThemeId(queryThemeId || savedThemeId || '')
  }, [sessionId])

  // ── localStorage: drafts ──
  useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = localStorage.getItem(draftStorageKey)
    if (!saved) return
    try {
      const parsed = JSON.parse(saved) as Record<string, string>
      if (parsed && typeof parsed === 'object') {
        setDrafts((prev) => ({ ...parsed, ...prev }))
      }
    } catch {
      // Ignore broken draft payloads.
    }
  }, [draftStorageKey])

  useEffect(() => {
    draftsRef.current = drafts
  }, [drafts])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const timer = setInterval(() => {
      const snapshot = draftsRef.current
      const nonEmptyEntries = Object.entries(snapshot).filter(([, v]) => v.trim().length > 0)
      if (nonEmptyEntries.length === 0) {
        localStorage.removeItem(draftStorageKey)
        return
      }
      localStorage.setItem(draftStorageKey, JSON.stringify(Object.fromEntries(nonEmptyEntries)))
    }, 30_000)
    return () => clearInterval(timer)
  }, [draftStorageKey])

  // ── Fetch themes + logs ──
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        setError(null)
        const [themesRes, logsRes] = await Promise.all([
          fetch(`/api/themes?sessionId=${encodeURIComponent(sessionId)}`, { cache: 'no-store' }),
          fetch(`/api/session/learning-log?sessionId=${encodeURIComponent(sessionId)}`, { cache: 'no-store' }),
        ])
        const themesJson = await themesRes.json()
        if (!themesRes.ok) throw new Error(themesJson?.error?.message || 'テーマ取得に失敗しました')
        const logsJson = logsRes.ok ? await logsRes.json() : { data: { logs: [] } }
        const nextThemes: SessionTheme[] = themesJson?.data?.themes || []
        const logList: Array<{ id: string; goalKey: string; reflection: string; updatedAt: string }> =
          logsJson?.data?.logs || []
        if (cancelled) return
        setThemes(nextThemes)
        if (!selectedThemeId && nextThemes.length > 0) setSelectedThemeId(nextThemes[0].id)
        const logMap: LogMap = {}
        const draftMap: Record<string, string> = {}
        for (const log of logList) {
          logMap[log.goalKey] = { id: log.id, reflection: log.reflection, updatedAt: log.updatedAt }
          draftMap[log.goalKey] = log.reflection
        }
        setLogs(logMap)
        setDrafts((prev) => ({ ...draftMap, ...prev }))
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : '読み込みに失敗しました')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [sessionId, selectedThemeId])

  // ── Derived state ──
  const selectedTheme = useMemo(() => themes.find((t) => t.id === selectedThemeId) || null, [themes, selectedThemeId])

  const activeGoal = useMemo<MoonshotGoal | null>(() => {
    if (!selectedTheme) return MOONSHOT_GOALS[0] || null
    const key = inferMoonshotGoalKeyFromTheme(selectedTheme)
    return MOONSHOT_GOALS.find((g) => g.key === key) || MOONSHOT_GOALS[0] || null
  }, [selectedTheme])

  const story = useMemo<BeginnerStory>(() => {
    if (!activeGoal) return DEFAULT_STORY
    return BEGINNER_STORIES[activeGoal.key] || DEFAULT_STORY
  }, [activeGoal])

  // ── Build sections from data ──
  const sections = useMemo(() => {
    if (!activeGoal) return []
    return buildBriefingSections(activeGoal, story)
  }, [activeGoal, story])

  // ── Save handler ──
  function clearDraftStorage(goalKey: string) {
    if (typeof window === 'undefined') return
    const saved = localStorage.getItem(draftStorageKey)
    if (!saved) return
    try {
      const parsed = JSON.parse(saved) as Record<string, string>
      if (!parsed || typeof parsed !== 'object') return
      delete parsed[goalKey]
      if (Object.keys(parsed).length === 0) localStorage.removeItem(draftStorageKey)
      else localStorage.setItem(draftStorageKey, JSON.stringify(parsed))
    } catch {
      localStorage.removeItem(draftStorageKey)
    }
  }

  async function save(goalKey: string) {
    const reflection = (drafts[goalKey] || '').trim()
    if (!reflection) {
      setError('振り返りを入力してください')
      return
    }
    try {
      setSavingKey(goalKey)
      setError(null)
      const res = await fetch('/api/session/learning-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, goalKey, reflection }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error?.message || '保存に失敗しました')
      const log = json?.data?.log
      if (log) {
        setLogs((prev) => ({
          ...prev,
          [goalKey]: { id: log.id, reflection: log.reflection, updatedAt: log.updatedAt },
        }))
        clearDraftStorage(goalKey)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存に失敗しました')
    } finally {
      setSavingKey(null)
    }
  }

  // ── Render ──
  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-student-text-tertiary">読み込み中...</p>
      </main>
    )
  }

  if (error && !activeGoal) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="rounded-lg border border-student-semantic-error/30 bg-student-semantic-error/10 px-6 py-4">
          <p className="text-sm text-student-text-primary">{error}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <StepIndicator
        steps={buildStudentSteps(sessionId)}
        currentKey="briefing"
        completedKeys={completedStepKeys('briefing')}
        onNavigate={(path) => router.push(path)}
      />
      <header className="mb-8">
        <p className="font-mono text-xs tracking-[0.22em] text-student-text-disabled">BRIEFING</p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-student-text-primary">読み物と振り返り</h1>
        <p className="mt-3 text-sm text-student-text-tertiary">テーマに対応する目標の読み物を読み、最後に自分の考えを記録します。</p>
      </header>

      {error && (
        <div className="mb-6 rounded-lg border border-student-semantic-error/30 bg-student-semantic-error/10 px-6 py-4">
          <p className="text-sm text-student-text-primary">{error}</p>
        </div>
      )}

      <section className="mb-6 rounded-xl border border-student-border-primary bg-student-bg-secondary p-4">
        <label className="block text-sm text-student-text-secondary">テーマ</label>
        <select
          className="mt-2 w-full rounded-md border border-student-border-primary bg-student-bg-primary px-3 py-2 text-sm text-student-text-primary"
          value={selectedThemeId}
          onChange={(e) => {
            const id = e.target.value
            setSelectedThemeId(id)
            localStorage.setItem(`student:theme:${sessionId}`, id)
          }}
        >
          {themes.map((theme) => (
            <option key={theme.id} value={theme.id}>
              {theme.title}
            </option>
          ))}
        </select>
      </section>

      {activeGoal && (
        <article className="space-y-6">
          {/* ── Data-driven sections ── */}
          {sections.map((section, i) => renderBriefingSection(section, i))}

          {/* ── Learning log (always last, needs interactivity) ── */}
          <div className="rounded-xl border border-student-border-primary bg-student-bg-secondary p-6 md:p-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-student-text-disabled">Reflection</p>
            <h3 className="mt-2 text-lg font-semibold text-student-text-primary">振り返り（学習ログ）</h3>
            <textarea
              value={drafts[activeGoal.key] || ''}
              onChange={(e) => setDrafts((prev) => ({ ...prev, [activeGoal.key]: e.target.value }))}
              className="mt-4 h-28 w-full rounded-md border border-student-border-primary bg-student-bg-primary px-4 py-3 text-sm text-student-text-primary focus:outline-none focus:ring-2 focus:ring-student-text-primary"
              placeholder="読み物を通して気づいたことを記録してください"
            />
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-student-text-disabled">
                {logs[activeGoal.key]
                  ? `最終保存: ${new Date(logs[activeGoal.key].updatedAt).toLocaleString('ja-JP')}`
                  : '未保存'}
              </p>
              <Button onClick={() => void save(activeGoal.key)} disabled={savingKey === activeGoal.key} size="sm">
                {savingKey === activeGoal.key ? '保存中...' : '保存'}
              </Button>
            </div>
          </div>
        </article>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <Button variant="secondary" onClick={() => router.push(`/student/session/${encodeURIComponent(sessionId)}/themes`)}>
          テーマ選択に戻る
        </Button>
        <Button
          onClick={() => {
            const next = selectedThemeId
              ? `/student/session/${encodeURIComponent(sessionId)}/questions?themeId=${encodeURIComponent(selectedThemeId)}`
              : `/student/session/${encodeURIComponent(sessionId)}/questions`
            router.push(next)
          }}
        >
          設問ページへ進む
        </Button>
      </div>
    </main>
  )
}
