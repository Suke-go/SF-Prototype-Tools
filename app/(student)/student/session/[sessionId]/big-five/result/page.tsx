'use client'

import { useMemo } from 'react'
import { Button } from '@/components/ui'

type Result = {
  extraversion: number
  agreeableness: number
  conscientiousness: number
  neuroticism: number
  openness: number
  completedAt: string
}

const AXES = [
  { key: 'extraversion' as const, label: '外向性', desc: '人と関わることへのエネルギー' },
  { key: 'agreeableness' as const, label: '協調性', desc: '他者への思いやりと協力' },
  { key: 'conscientiousness' as const, label: '誠実性', desc: '計画性と責任感' },
  { key: 'neuroticism' as const, label: '神経症傾向', desc: '感情の起伏の大きさ' },
  { key: 'openness' as const, label: '開放性', desc: '新しい経験への好奇心' },
]

function RadarChart({ result }: { result: Result }) {
  const size = 300
  const cx = size / 2
  const cy = size / 2
  const max = 8
  const radius = 110

  const points = AXES.map((axis, i) => {
    const angle = (-Math.PI / 2) + (i * (2 * Math.PI) / AXES.length)
    const value = result[axis.key]
    const r = (value / max) * radius
    return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r, angle, value, axis }
  })

  const polygon = points.map((p) => `${p.x},${p.y}`).join(' ')

  const grid = [0.25, 0.5, 0.75, 1].map((t) => {
    const r = radius * t
    const ring = AXES.map((_, i) => {
      const angle = (-Math.PI / 2) + (i * (2 * Math.PI) / AXES.length)
      return `${cx + Math.cos(angle) * r},${cy + Math.sin(angle) * r}`
    }).join(' ')
    return { ring, t }
  })

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto block"
      role="img"
      aria-label="Big Five レーダーチャート"
    >
      {grid.map((g) => (
        <polygon key={g.t} points={g.ring} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      ))}
      {points.map((p, idx) => (
        <line key={idx} x1={cx} y1={cy} x2={cx + Math.cos(p.angle) * radius} y2={cy + Math.sin(p.angle) * radius} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      ))}
      <polygon points={polygon} fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" />
      {points.map((p, idx) => (
        <circle key={idx} cx={p.x} cy={p.y} r="4" fill="rgba(255,255,255,0.85)" />
      ))}
      {/* 軸ラベル */}
      {points.map((p, idx) => {
        const labelR = radius + 22
        const lx = cx + Math.cos(p.angle) * labelR
        const ly = cy + Math.sin(p.angle) * labelR
        return (
          <text key={idx} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.5)" fontSize="11" fontFamily="Noto Sans JP, sans-serif">
            {p.axis.label}
          </text>
        )
      })}
    </svg>
  )
}

export default function BigFiveResultPage({ params }: { params: { sessionId: string } }) {
  const sessionId = params.sessionId

  const result = useMemo(() => {
    if (typeof window === 'undefined') return null
    const raw = localStorage.getItem(`bigfive:result:${sessionId}`)
    if (!raw) return null
    try { return JSON.parse(raw) as Result } catch { return null }
  }, [sessionId])

  return (
    <main className="matte-texture flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg">
        <div className="float-up text-center">
          <p className="font-mono text-xs tracking-[0.2em] text-student-text-disabled">DIAGNOSIS COMPLETE</p>
          <h1 className="mt-3 font-heading text-3xl font-bold text-student-text-primary">
            あなたの性格特性
          </h1>
        </div>

        {!result ? (
          <p className="mt-8 text-center text-student-text-tertiary">結果が見つかりません。再度診断してください。</p>
        ) : (
          <div className="mt-8 space-y-8 fade-in" style={{ animationDelay: '200ms' }}>
            <RadarChart result={result} />

            {/* スコア詳細 */}
            <div className="space-y-2">
              {AXES.map((a) => {
                const val = result[a.key]
                return (
                  <div key={a.key} className="flex items-center gap-4 rounded-lg bg-student-bg-secondary px-4 py-3">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-student-text-primary">{a.label}</div>
                      <div className="text-xs text-student-text-disabled">{a.desc}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-20">
                        <div className="h-1 rounded-full bg-student-bg-elevated">
                          <div className="h-full rounded-full bg-student-text-primary/60 transition-all duration-slow" style={{ width: `${(val / 8) * 100}%` }} />
                        </div>
                      </div>
                      <span className="w-8 text-right font-mono text-sm text-student-text-primary">{val}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            <p className="text-center text-xs text-student-text-disabled">
              ※ 自己理解のための簡易診断です。優劣の評価ではありません。
            </p>
          </div>
        )}

        <div className="mt-10 text-center fade-in" style={{ animationDelay: '400ms' }}>
          <Button
            onClick={() => (window.location.href = `/student/session/${encodeURIComponent(sessionId)}/themes`)}
            className="rounded-xl px-10 py-4 text-base"
          >
            テーマ選択へ進む
          </Button>
          <div className="mt-3">
            <button
              onClick={() => (window.location.href = `/student/session/${encodeURIComponent(sessionId)}`)}
              className="text-xs text-student-text-disabled transition-colors hover:text-student-text-tertiary"
            >
              ← 戻る
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
