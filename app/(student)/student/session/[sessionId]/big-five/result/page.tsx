'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui'
import { StepIndicator } from '@/components/common/StepIndicator'
import { buildStudentSteps, completedStepKeys } from '@/lib/constants/student-flow'

type Result = {
  extraversion: number
  agreeableness: number
  conscientiousness: number
  neuroticism: number
  openness: number
  completedAt: string
}

const AXES = [
  { key: 'extraversion' as const, label: '外への関心' },
  { key: 'agreeableness' as const, label: 'まわりとの調和' },
  { key: 'conscientiousness' as const, label: '計画と実行' },
  { key: 'neuroticism' as const, label: '感受性の豊かさ' },
  { key: 'openness' as const, label: '新しいものへの興味' },
]

const INTERPRETATIONS: Record<(typeof AXES)[number]['key'], { low: string; mid: string; high: string }> = {
  extraversion: {
    low: '一人の時間で考えを深めるタイプです。',
    mid: '場面に応じて一人時間と対話を使い分けられます。',
    high: '人と話しながら考えを広げるのが得意です。',
  },
  agreeableness: {
    low: '自分の視点をはっきり出す傾向があります。',
    mid: '相手への配慮と自分の意見のバランスが取れています。',
    high: '相手の立場をくみ取りながら進める力が高いです。',
  },
  conscientiousness: {
    low: '柔軟に進めるスタイルで、状況対応が得意です。',
    mid: '計画性と柔軟性のバランスが取れています。',
    high: '見通しを立てて着実に進める力が高いです。',
  },
  neuroticism: {
    low: '気持ちの変化が比較的安定している傾向です。',
    mid: '状況に応じて感情の揺れを適切に扱えます。',
    high: '変化に敏感で、細かな違いによく気づけます。',
  },
  openness: {
    low: '実践的で、具体的な方法を重視する傾向です。',
    mid: '新しさと現実性を両方見ながら判断できます。',
    high: '新しい発想や未知のテーマに前向きです。',
  },
}

function getInterpretation(key: (typeof AXES)[number]['key'], value: number) {
  if (value <= 2) return INTERPRETATIONS[key].low
  if (value <= 5) return INTERPRETATIONS[key].mid
  return INTERPRETATIONS[key].high
}

function RadarChart({ result }: { result: Result }) {
  const size = 300
  const center = size / 2
  const max = 8
  const radius = 110
  const points = AXES.map((axis, index) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / AXES.length
    const value = result[axis.key]
    const r = (value / max) * radius
    return { x: center + Math.cos(angle) * r, y: center + Math.sin(angle) * r, angle, value, axis }
  })
  const polygon = points.map((point) => `${point.x},${point.y}`).join(' ')

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto block" role="img" aria-label="Big Five レーダーチャート">
      {[0.25, 0.5, 0.75, 1].map((t) => {
        const ring = AXES.map((_, index) => {
          const angle = -Math.PI / 2 + (index * 2 * Math.PI) / AXES.length
          return `${center + Math.cos(angle) * radius * t},${center + Math.sin(angle) * radius * t}`
        }).join(' ')
        return <polygon key={t} points={ring} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      })}
      {points.map((point, index) => (
        <line
          key={index}
          x1={center}
          y1={center}
          x2={center + Math.cos(point.angle) * radius}
          y2={center + Math.sin(point.angle) * radius}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="1"
        />
      ))}
      <polygon points={polygon} fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" />
      {points.map((point, index) => (
        <circle key={index} cx={point.x} cy={point.y} r="4" fill="rgba(255,255,255,0.85)" />
      ))}
      {points.map((point, index) => {
        const labelR = radius + 22
        const x = center + Math.cos(point.angle) * labelR
        const y = center + Math.sin(point.angle) * labelR
        return (
          <text key={index} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.5)" fontSize="11">
            {point.axis.label}
          </text>
        )
      })}
    </svg>
  )
}

export default function BigFiveResultPage({ params }: { params: { sessionId: string } }) {
  const router = useRouter()
  const sessionId = params.sessionId
  const [result, setResult] = useState<Result | null>(null)
  const [loading, setLoading] = useState(true)
  const steps = useMemo(() => buildStudentSteps(sessionId), [sessionId])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const local = localStorage.getItem(`bigfive:result:${sessionId}`)
        if (local) {
          const parsed = JSON.parse(local) as Result
          if (!cancelled) setResult(parsed)
        }
      } catch {
        // ignore
      }

      try {
        const res = await fetch(`/api/big-five/results?sessionId=${encodeURIComponent(sessionId)}`, { cache: 'no-store' })
        const json = await res.json()
        if (res.ok && json?.data?.result && !cancelled) {
          setResult(json.data.result)
          localStorage.setItem(`bigfive:result:${sessionId}`, JSON.stringify(json.data.result))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [sessionId])

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-student-text-tertiary">読み込み中...</p>
      </main>
    )
  }

  return (
    <main className="matte-texture flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl">
        <StepIndicator
          steps={steps}
          currentKey="big-five-result"
          completedKeys={completedStepKeys('big-five-result')}
          onNavigate={(path) => router.push(path)}
        />

        <div className="float-up text-center">
          <p className="font-mono text-xs tracking-[0.2em] text-student-text-disabled">タイプ診断の結果</p>
          <h1 className="mt-3 font-heading text-3xl font-bold text-student-text-primary">あなたの考え方のタイプ</h1>
          <p className="mt-3 text-sm leading-relaxed text-student-text-tertiary">
            ここで表示しているのは現時点での傾向です。良し悪しではなく、対話の出発点として使ってください。
          </p>
        </div>

        {!result ? (
          <p className="mt-8 text-center text-student-text-tertiary">結果が見つかりませんでした。参加情報を確認してください。</p>
        ) : (
          <div className="mt-8 space-y-8 fade-in" style={{ animationDelay: '200ms' }}>
            <RadarChart result={result} />
            <div className="space-y-3">
              {AXES.map((axis) => {
                const value = result[axis.key]
                return (
                  <div key={axis.key} className="rounded-lg bg-student-bg-secondary px-5 py-4">
                    <div className="mb-2 flex items-center gap-4">
                      <div className="flex-1 text-sm text-student-text-primary">{axis.label}</div>
                      <div className="w-24">
                        <div className="h-1 rounded-full bg-student-bg-elevated">
                          <div className="h-full rounded-full bg-student-text-primary/60" style={{ width: `${(value / 8) * 100}%` }} />
                        </div>
                      </div>
                      <span className="w-8 text-right font-mono text-sm text-student-text-primary">{value}</span>
                    </div>
                    <p className="text-xs text-student-text-secondary">{getInterpretation(axis.key, value)}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="mt-10 text-center">
          <Button onClick={() => router.push(`/student/session/${encodeURIComponent(sessionId)}/themes`)} className="rounded-xl px-12 py-6 text-base">
            テーマを選ぶ
          </Button>
        </div>
      </div>
    </main>
  )
}
