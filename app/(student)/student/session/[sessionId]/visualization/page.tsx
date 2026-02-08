'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Accordion, Button, Card, CardContent, CardHeader, CardTitle, LoadingSpinner } from '@/components/ui'
import { StepIndicator } from '@/components/common/StepIndicator'
import { buildStudentSteps, completedStepKeys } from '@/lib/constants/student-flow'
import { fetchWithRetry } from '@/lib/fetch-with-retry'
import type { UMAPInput, UMAPResult } from '@/lib/visualization/umap'

type ClusterShape = 'circle' | 'triangle' | 'square' | 'diamond' | 'star'

const CLUSTER_PALETTE: { fill: string; shape: ClusterShape; label: string }[] = [
  { fill: 'rgba(78,121,167,0.85)', shape: 'circle', label: 'タイプA' },
  { fill: 'rgba(242,142,43,0.85)', shape: 'triangle', label: 'タイプB' },
  { fill: 'rgba(225,87,89,0.85)', shape: 'square', label: 'タイプC' },
  { fill: 'rgba(118,183,178,0.85)', shape: 'diamond', label: 'タイプD' },
  { fill: 'rgba(89,161,79,0.85)', shape: 'star', label: 'タイプE' },
]

type SessionResponses = {
  sessionId: string
  selectedThemeId?: string | null
  questions: { id: string; order: number; text: string; themeId?: string }[]
  students: { id: string; name: string | null; progressStatus: string }[]
  vectors: UMAPInput[]
  questionDistributions?: { questionId: string; yes: number; no: number; unknown: number }[]
  responseMap?: Record<string, Record<string, 'YES' | 'NO' | 'UNKNOWN'>>
}

type Point = UMAPResult & { cluster: number }

type Tooltip = {
  x: number
  y: number
  text: string
}

function drawShape(ctx: CanvasRenderingContext2D, shape: ClusterShape, x: number, y: number, r: number) {
  ctx.beginPath()
  switch (shape) {
    case 'circle':
      ctx.arc(x, y, r, 0, Math.PI * 2)
      break
    case 'triangle':
      ctx.moveTo(x, y - r)
      ctx.lineTo(x - r, y + r)
      ctx.lineTo(x + r, y + r)
      ctx.closePath()
      break
    case 'square':
      ctx.rect(x - r, y - r, r * 2, r * 2)
      break
    case 'diamond':
      ctx.moveTo(x, y - r)
      ctx.lineTo(x + r, y)
      ctx.lineTo(x, y + r)
      ctx.lineTo(x - r, y)
      ctx.closePath()
      break
    case 'star':
      for (let i = 0; i < 5; i += 1) {
        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 5
        const innerAngle = angle + Math.PI / 5
        if (i === 0) ctx.moveTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r)
        else ctx.lineTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r)
        ctx.lineTo(x + Math.cos(innerAngle) * (r * 0.45), y + Math.sin(innerAngle) * (r * 0.45))
      }
      ctx.closePath()
      break
  }
  ctx.fill()
}

export default function VisualizationPage({ params }: { params: { sessionId: string } }) {
  const sessionId = params.sessionId
  const router = useRouter()
  const selectedThemeId = useMemo(() => {
    if (typeof window === 'undefined') return ''
    const queryThemeId = new URLSearchParams(window.location.search).get('themeId')
    if (queryThemeId) {
      localStorage.setItem(`student:theme:${sessionId}`, queryThemeId)
      return queryThemeId
    }
    return localStorage.getItem(`student:theme:${sessionId}`) || ''
  }, [sessionId])
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [loading, setLoading] = useState(true)
  const [stage, setStage] = useState<'FETCH' | 'COMPUTE'>('FETCH')
  const [error, setError] = useState<string | null>(null)
  const [umapResults, setUmapResults] = useState<Point[]>([])
  const [tooltip, setTooltip] = useState<Tooltip | null>(null)
  const [selected, setSelected] = useState<Point | null>(null)
  const [sessionData, setSessionData] = useState<SessionResponses | null>(null)
  const [showGuide, setShowGuide] = useState(false)

  const workerRef = useRef<Worker | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setStage('FETCH')
        setSelected(null)
        setUmapResults([])
        const query = new URLSearchParams({ sessionId })
        if (selectedThemeId) query.set('themeId', selectedThemeId)
        const res = await fetchWithRetry(`/api/session/responses?${query.toString()}`, { cache: 'no-store' })
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error?.message || 'データ取得に失敗しました')

        const data: SessionResponses = json.data
        if (!cancelled) setSessionData(data)

        const vectors = data.vectors
        if (vectors.length === 0) throw new Error('回答データがありません')
        if (vectors.length < 15) return

        setStage('COMPUTE')

        if (!workerRef.current) {
          workerRef.current = new Worker(new URL('@/lib/visualization/umap.worker.ts', import.meta.url))
        }

        const worker = workerRef.current
        const computed: Point[] = await new Promise((resolve, reject) => {
          const onMessage = (ev: MessageEvent<any>) => {
            if (ev.data?.type === 'result') {
              cleanup()
              resolve(ev.data.payload.points)
            } else if (ev.data?.type === 'error') {
              cleanup()
              reject(new Error(ev.data.payload?.message || 'UMAP worker error'))
            }
          }

          const onError = () => {
            cleanup()
            reject(new Error('UMAP worker error'))
          }

          const cleanup = () => {
            worker.removeEventListener('message', onMessage)
            worker.removeEventListener('error', onError)
          }

          worker.addEventListener('message', onMessage)
          worker.addEventListener('error', onError)
          worker.postMessage({ type: 'compute', payload: { vectors, k: Math.min(5, vectors.length) } })
        })

        if (!cancelled) setUmapResults(computed)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'データ取得に失敗しました')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [sessionId, selectedThemeId])

  useEffect(() => {
    const key = `visualization:onboarded:${sessionId}`
    const onboarded = sessionStorage.getItem(key)
    if (!onboarded) setShowGuide(true)
  }, [sessionId])

  useEffect(() => {
    return () => {
      workerRef.current?.terminate()
      workerRef.current = null
    }
  }, [])

  const projection = useMemo(() => {
    if (umapResults.length === 0) return null
    const xs = umapResults.map((r) => r.x)
    const ys = umapResults.map((r) => r.y)
    const xMin = Math.min(...xs)
    const xMax = Math.max(...xs)
    const yMin = Math.min(...ys)
    const yMax = Math.max(...ys)
    return {
      xMin,
      xMax,
      yMin,
      yMax,
      xRange: xMax - xMin || 1,
      yRange: yMax - yMin || 1,
      pad: 40,
    }
  }, [umapResults])

  const toCanvas = useCallback((point: Point, width: number, height: number) => {
    if (!projection) return { x: 0, y: 0 }
    const x = projection.pad + ((point.x - projection.xMin) / projection.xRange) * (width - projection.pad * 2)
    const y = projection.pad + ((point.y - projection.yMin) / projection.yRange) * (height - projection.pad * 2)
    return { x, y }
  }, [projection])

  useEffect(() => {
    if (umapResults.length === 0) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = Math.max(1, Math.floor(rect.width * dpr))
    canvas.height = Math.max(1, Math.floor(rect.height * dpr))
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const W = rect.width
    const H = rect.height

    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, W, H)

    if (!projection) return

    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.lineWidth = 1
    for (let i = 0; i <= 4; i += 1) {
      const gx = projection.pad + (i / 4) * (W - projection.pad * 2)
      const gy = projection.pad + (i / 4) * (H - projection.pad * 2)
      ctx.beginPath()
      ctx.moveTo(gx, projection.pad)
      ctx.lineTo(gx, H - projection.pad)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(projection.pad, gy)
      ctx.lineTo(W - projection.pad, gy)
      ctx.stroke()
    }

    for (const point of umapResults) {
      const { x, y } = toCanvas(point, W, H)
      const isMe = Boolean(point.isSelf)

      if (isMe) {
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(x, y, 8, 0, Math.PI * 2)
        ctx.fill()

        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(x, y, 12, 0, Math.PI * 2)
        ctx.stroke()
      } else {
        const palette = CLUSTER_PALETTE[point.cluster % CLUSTER_PALETTE.length]
        ctx.fillStyle = palette.fill
        drawShape(ctx, palette.shape, x, y, 6)
      }

      if (selected?.studentId === point.studentId) {
        ctx.strokeStyle = 'rgba(255,255,255,0.8)'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(x, y, 14, 0, Math.PI * 2)
        ctx.stroke()
      }
    }

    const legendY = H - 14
    const legendX0 = projection.pad
    ctx.font = '11px sans-serif'
    CLUSTER_PALETTE.forEach((palette, i) => {
      const lx = legendX0 + i * 95
      ctx.fillStyle = palette.fill
      drawShape(ctx, palette.shape, lx, legendY, 5)
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.fillText(palette.label, lx + 10, legendY + 4)
    })
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.fillText('◎ あなたの位置', legendX0 + CLUSTER_PALETTE.length * 95, legendY + 4)
  }, [projection, selected, toCanvas, umapResults])

  function pickPoint(clientX: number, clientY: number): Point | null {
    const canvas = canvasRef.current
    if (!canvas || umapResults.length === 0) return null
    const rect = canvas.getBoundingClientRect()
    const mx = clientX - rect.left
    const my = clientY - rect.top

    let found: Point | null = null
    for (const point of umapResults) {
      const { x, y } = toCanvas(point, rect.width, rect.height)
      const dx = mx - x
      const dy = my - y
      if (dx * dx + dy * dy <= 13 * 13) {
        found = point
        break
      }
    }
    return found
  }

  function handleCanvasMove(event: MouseEvent<HTMLCanvasElement>) {
    const point = pickPoint(event.clientX, event.clientY)
    if (!point) {
      setTooltip(null)
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    setTooltip({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top - 30,
      text: point.isSelf ? 'あなたの位置' : CLUSTER_PALETTE[point.cluster % CLUSTER_PALETTE.length].label,
    })
  }

  function handleCanvasClick(event: MouseEvent<HTMLCanvasElement>) {
    const point = pickPoint(event.clientX, event.clientY)
    setSelected(point)
  }

  const clusterCounts = useMemo(() => {
    const counts = new Map<number, number>()
    for (const point of umapResults) counts.set(point.cluster, (counts.get(point.cluster) || 0) + 1)
    return Array.from(counts.entries()).sort((a, b) => a[0] - b[0])
  }, [umapResults])

  const responseDistributions = useMemo(() => {
    if (!sessionData) return []
    // サーバーから集計済みデータを使用（生徒には responseMap が送られないため）
    if (sessionData.questionDistributions) {
      return sessionData.questions.map((question) => {
        const dist = sessionData.questionDistributions!.find((d) => d.questionId === question.id)
        const yes = dist?.yes ?? 0
        const no = dist?.no ?? 0
        const unknown = dist?.unknown ?? 0
        const total = yes + no + unknown || 1
        return {
          question,
          yes,
          no,
          unknown,
          yesPct: Math.round((yes / total) * 100),
          noPct: Math.round((no / total) * 100),
          unknownPct: Math.round((unknown / total) * 100),
        }
      })
    }
    // フォールバック: responseMap がある場合（教員向け）
    if (!sessionData.responseMap) return []
    return sessionData.questions.map((question) => {
      let yes = 0
      let no = 0
      let unknown = 0
      for (const studentResponses of Object.values(sessionData.responseMap!)) {
        const value = studentResponses[question.id]
        if (value === 'YES') yes += 1
        else if (value === 'NO') no += 1
        else unknown += 1
      }
      const total = yes + no + unknown || 1
      return {
        question,
        yes,
        no,
        unknown,
        yesPct: Math.round((yes / total) * 100),
        noPct: Math.round((no / total) * 100),
        unknownPct: Math.round((unknown / total) * 100),
      }
    })
  }, [sessionData])

  const useFallbackVisualization = Boolean(sessionData && sessionData.vectors.length < 15)

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-student-text-tertiary">{stage === 'FETCH' ? 'データ取得中...' : '計算中...'}</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <Card>
          <CardContent>
            <p className="text-student-text-primary">{error}</p>
            <Button className="mt-4" variant="secondary" onClick={() => router.refresh()}>
              再読み込み
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="safe-area-main mx-auto max-w-6xl py-4 md:py-8">
      <StepIndicator
        steps={buildStudentSteps(sessionId)}
        currentKey="visualization"
        completedKeys={completedStepKeys('visualization')}
        onNavigate={(path) => router.push(path)}
      />

      <div className="mb-6">
        <h1 className="font-heading text-3xl font-bold text-student-text-primary">みんなの考えマップ</h1>
        <p className="mt-1 text-sm text-student-text-tertiary">回答が似ている人ほど近くに表示されます。座標の数字そのものには意味はありません。</p>
        {(selectedThemeId || sessionData?.selectedThemeId) && (
          <p className="mt-2 text-xs text-student-text-disabled">選択テーマに合わせた可視化です。</p>
        )}
      </div>

      {showGuide && (
        <Card className="mb-4 border border-student-border-primary bg-student-bg-secondary p-4">
          <CardContent>
            <h2 className="text-sm font-semibold text-student-text-primary">この図の読み方</h2>
            <p className="mt-2 text-sm text-student-text-secondary">
              点は参加者を表します。近い点ほど回答傾向が近く、離れている点ほど傾向が異なります。
              点をタップすると、あなたとの比較を右側で確認できます。
            </p>
            <Button
              size="sm"
              className="mt-3"
              onClick={() => {
                sessionStorage.setItem(`visualization:onboarded:${sessionId}`, '1')
                setShowGuide(false)
              }}
            >
              わかりました
            </Button>
          </CardContent>
        </Card>
      )}

      {!useFallbackVisualization ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          <div className="relative rounded-lg border border-student-border-primary bg-student-bg-primary">
            <canvas
              ref={canvasRef}
              className="w-full rounded-lg"
              style={{ aspectRatio: '4 / 3' }}
              role="img"
              aria-label={`意見マップ: ${umapResults.length}人の回答を${new Set(umapResults.map((r) => r.cluster)).size}個のタイプに分類した散布図`}
              onMouseMove={handleCanvasMove}
              onClick={handleCanvasClick}
              onMouseLeave={() => setTooltip(null)}
            />
            {tooltip && (
              <div
                className="pointer-events-none absolute rounded bg-student-bg-elevated px-2 py-1 text-xs text-student-text-primary shadow"
                style={{ left: tooltip.x, top: tooltip.y }}
              >
                {tooltip.text}
              </div>
            )}

            <table className="sr-only" aria-label="タイプ別集計">
              <thead>
                <tr>
                  <th>タイプ</th>
                  <th>人数</th>
                  <th>あなたの所属</th>
                </tr>
              </thead>
              <tbody>
                {clusterCounts.map(([cluster, count]) => {
                  const palette = CLUSTER_PALETTE[cluster % CLUSTER_PALETTE.length]
                  const isMyCluster = umapResults.find((point) => point.isSelf)?.cluster === cluster
                  return (
                    <tr key={cluster}>
                      <td>{palette.label}</td>
                      <td>{count}人</td>
                      <td>{isMyCluster ? 'はい' : ''}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <aside className="space-y-3">
            <Card className="p-0">
              <CardHeader className="px-6 pb-2 pt-6">
                <CardTitle className="text-lg">サマリー</CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <Accordion title="全体" defaultOpen>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-student-text-tertiary">参加者</span>
                      <span className="font-medium text-student-text-primary">{sessionData?.students.length ?? 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-student-text-tertiary">設問数</span>
                      <span className="font-medium text-student-text-primary">{sessionData?.questions.length ?? 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-student-text-tertiary">タイプ数</span>
                      <span className="font-medium text-student-text-primary">{clusterCounts.length}</span>
                    </div>
                  </div>
                </Accordion>

                <Accordion title="タイプ人数">
                  <div className="space-y-2 text-sm">
                    {clusterCounts.map(([cluster, count]) => {
                      const palette = CLUSTER_PALETTE[cluster % CLUSTER_PALETTE.length]
                      return (
                        <div key={cluster} className="flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: palette.fill }} />
                            <span className="text-student-text-secondary">{palette.label}</span>
                          </span>
                          <span className="font-medium text-student-text-primary">{count}</span>
                        </div>
                      )
                    })}
                  </div>
                </Accordion>
              </CardContent>
            </Card>

            {selected && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">選択中の点</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-student-text-secondary">
                    {selected.isSelf ? 'あなたの点です。' : `${CLUSTER_PALETTE[selected.cluster % CLUSTER_PALETTE.length].label} の点です。`}
                  </p>
                  <p className="mt-2 text-xs text-student-text-tertiary">
                    X/Y座標は比較用の位置です。値そのものに意味はありません。
                  </p>
                </CardContent>
              </Card>
            )}
          </aside>
        </div>
      ) : (
        <Card className="mb-6 border border-student-border-primary bg-student-bg-secondary">
          <CardHeader>
            <CardTitle className="text-base">分布表示モード</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-student-text-secondary">
              参加者が15人未満のため、誤解を避ける目的でマップ表示は行わず、設問ごとの回答分布を表示します。
            </p>
          </CardContent>
        </Card>
      )}

      <section className="mt-6 rounded-lg border border-student-border-primary bg-student-bg-secondary p-4">
        <h2 className="text-sm font-semibold text-student-text-primary">
          {useFallbackVisualization ? '回答分布（全設問）' : '回答分布（上位6問）'}
        </h2>
        <div className="mt-3 space-y-3">
          {(useFallbackVisualization ? responseDistributions : responseDistributions.slice(0, 6)).map((row) => (
            <div key={row.question.id} className="text-sm">
              <p className="mb-1 truncate text-student-text-secondary">Q{row.question.order}. {row.question.text}</p>
              <div className="flex h-3 w-full overflow-hidden rounded-full">
                <div className="bg-emerald-500" style={{ width: `${row.yesPct}%` }} />
                <div className="bg-amber-400" style={{ width: `${row.unknownPct}%` }} />
                <div className="bg-rose-400" style={{ width: `${row.noPct}%` }} />
              </div>
              <p className="mt-1 text-xs text-student-text-tertiary">
                はい {row.yes} ({row.yesPct}%) / わからない {row.unknown} ({row.unknownPct}%) / いいえ {row.no} ({row.noPct}%)
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-6 flex gap-3">
        <Button
          variant="secondary"
          onClick={() => {
            const next = selectedThemeId
              ? `/student/session/${encodeURIComponent(sessionId)}/questions/complete?themeId=${encodeURIComponent(selectedThemeId)}`
              : `/student/session/${encodeURIComponent(sessionId)}/questions/complete`
            router.push(next)
          }}
        >
          回答完了画面に戻る
        </Button>
      </div>
    </main>
  )
}
