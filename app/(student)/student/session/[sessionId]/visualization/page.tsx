'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
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

const RESPONSE_LABELS: Record<ResponseState, string> = {
  YES: 'はい',
  NO: 'いいえ',
  UNKNOWN: 'わからない',
  UNANSWERED: '未回答',
}

type SessionResponses = {
  sessionId: string
  selectedThemeId?: string | null
  questions: { id: string; order: number; text: string; themeId?: string }[]
  students: { id: string; name: string | null; progressStatus: string }[]
  vectors: UMAPInput[]
  questionDistributions?: { questionId: string; yes: number; no: number; unknown: number; unanswered: number }[]
  responseMap?: Record<string, Record<string, 'YES' | 'NO' | 'UNKNOWN'>>
  surveyStatus?: {
    preCompleted: boolean
    postCompleted: boolean
    consentToResearch: boolean | null
  }
}

type Point = UMAPResult & { cluster: number }

type Tooltip = {
  x: number
  y: number
  text: string
}

type ProjectedPoint = {
  point: Point
  x: number
  y: number
}

type ResponseState = 'YES' | 'NO' | 'UNKNOWN' | 'UNANSWERED'

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
  const projectedPointsRef = useRef<ProjectedPoint[]>([])
  const moveFrameRef = useRef<number | null>(null)
  const pendingPointerRef = useRef<{ x: number; y: number } | null>(null)

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
          worker.postMessage({ type: 'compute', payload: { vectors } })
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

  useEffect(() => {
    return () => {
      if (moveFrameRef.current !== null) {
        cancelAnimationFrame(moveFrameRef.current)
        moveFrameRef.current = null
      }
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

    const projectedPoints: ProjectedPoint[] = []

    for (const point of umapResults) {
      const { x, y } = toCanvas(point, W, H)
      projectedPoints.push({ point, x, y })
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
    projectedPointsRef.current = projectedPoints
  }, [projection, selected, toCanvas, umapResults])

  useEffect(() => {
    if (umapResults.length > 0) return
    projectedPointsRef.current = []
  }, [umapResults.length])

  function pickPoint(clientX: number, clientY: number): Point | null {
    const canvas = canvasRef.current
    if (!canvas || umapResults.length === 0) return null
    const rect = canvas.getBoundingClientRect()
    const mx = clientX - rect.left
    const my = clientY - rect.top

    let found: Point | null = null
    for (const projected of projectedPointsRef.current) {
      const dx = mx - projected.x
      const dy = my - projected.y
      if (dx * dx + dy * dy <= 13 * 13) {
        found = projected.point
        break
      }
    }
    return found
  }

  function updateTooltip(clientX: number, clientY: number) {
    const point = pickPoint(clientX, clientY)
    if (!point) {
      setTooltip(null)
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    setTooltip({
      x: clientX - rect.left,
      y: clientY - rect.top - 30,
      text: point.isSelf ? 'あなたの位置' : CLUSTER_PALETTE[point.cluster % CLUSTER_PALETTE.length].label,
    })
  }

  function handleCanvasPointerMove(event: PointerEvent<HTMLCanvasElement>) {
    if (event.pointerType === 'touch') return
    pendingPointerRef.current = { x: event.clientX, y: event.clientY }
    if (moveFrameRef.current !== null) return
    moveFrameRef.current = requestAnimationFrame(() => {
      moveFrameRef.current = null
      const pending = pendingPointerRef.current
      pendingPointerRef.current = null
      if (!pending) return
      updateTooltip(pending.x, pending.y)
    })
  }

  function handleCanvasPointerDown(event: PointerEvent<HTMLCanvasElement>) {
    const point = pickPoint(event.clientX, event.clientY)
    setSelected(point)

    if (!point) {
      setTooltip(null)
      return
    }
    updateTooltip(event.clientX, event.clientY)
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
      const distByQuestionId = new Map(sessionData.questionDistributions.map((dist) => [dist.questionId, dist]))
      return sessionData.questions.map((question) => {
        const dist = distByQuestionId.get(question.id)
        const yes = dist?.yes ?? 0
        const no = dist?.no ?? 0
        const unknown = dist?.unknown ?? 0
        const unanswered = dist?.unanswered ?? 0
        const total = yes + no + unknown + unanswered || 1
        return {
          question,
          yes,
          no,
          unknown,
          unanswered,
          yesPct: Math.round((yes / total) * 100),
          noPct: Math.round((no / total) * 100),
          unknownPct: Math.round((unknown / total) * 100),
          unansweredPct: Math.round((unanswered / total) * 100),
        }
      })
    }
    // フォールバック: responseMap がある場合（教員向け）
    if (!sessionData.responseMap) return []
    return sessionData.questions.map((question) => {
      let yes = 0
      let no = 0
      let unknown = 0
      let unanswered = 0
      for (const studentResponses of Object.values(sessionData.responseMap!)) {
        const value = studentResponses[question.id]
        if (value === 'YES') yes += 1
        else if (value === 'NO') no += 1
        else if (value === 'UNKNOWN') unknown += 1
        else unanswered += 1
      }
      const total = yes + no + unknown + unanswered || 1
      return {
        question,
        yes,
        no,
        unknown,
        unanswered,
        yesPct: Math.round((yes / total) * 100),
        noPct: Math.round((no / total) * 100),
        unknownPct: Math.round((unknown / total) * 100),
        unansweredPct: Math.round((unanswered / total) * 100),
      }
    })
  }, [sessionData])

  const isSmallSample = (sessionData?.vectors.length ?? 0) < 15

  const vectorByStudentId = useMemo(() => {
    const map = new Map<string, number[]>()
    for (const vectorEntry of sessionData?.vectors || []) {
      map.set(vectorEntry.studentId, vectorEntry.vector)
    }
    return map
  }, [sessionData])

  const decodeResponseAt = useCallback(
    (vector: number[] | undefined, questionIndex: number): ResponseState => {
      if (!vector) return 'UNANSWERED'
      const base = questionIndex * 2
      const answerValue = vector[base] ?? 0
      const answeredFlag = vector[base + 1] ?? 0
      if (answeredFlag < 0.5) return 'UNANSWERED'
      if (answerValue > 0) return 'YES'
      if (answerValue < 0) return 'NO'
      return 'UNKNOWN'
    },
    []
  )

  const selectedComparison = useMemo(() => {
    if (!selected || !sessionData || selected.isSelf) return null
    const selfVector = sessionData.vectors.find((entry) => entry.isSelf)?.vector
    const targetVector = vectorByStudentId.get(selected.studentId)
    if (!selfVector || !targetVector) return null

    const disagreements: Array<{
      questionId: string
      order: number
      text: string
      mine: ResponseState
      other: ResponseState
      score: number
    }> = []
    const agreements: Array<{
      questionId: string
      order: number
      text: string
      mine: ResponseState
      other: ResponseState
      score: number
    }> = []

    const toPolarity = (state: ResponseState) => {
      if (state === 'YES') return 1
      if (state === 'NO') return -1
      return 0
    }

    for (let questionIndex = 0; questionIndex < sessionData.questions.length; questionIndex += 1) {
      const question = sessionData.questions[questionIndex]
      const mine = decodeResponseAt(selfVector, questionIndex)
      const other = decodeResponseAt(targetVector, questionIndex)
      if (mine === 'UNANSWERED' && other === 'UNANSWERED') continue

      if (mine === other && mine !== 'UNANSWERED') {
        agreements.push({
          questionId: question.id,
          order: question.order,
          text: question.text,
          mine,
          other,
          score: mine === 'UNKNOWN' ? 1 : 2,
        })
        continue
      }

      const score =
        mine === 'UNANSWERED' || other === 'UNANSWERED'
          ? 1
          : Math.abs(toPolarity(mine) - toPolarity(other))

      disagreements.push({
        questionId: question.id,
        order: question.order,
        text: question.text,
        mine,
        other,
        score,
      })
    }

    disagreements.sort((a, b) => b.score - a.score || a.order - b.order)
    agreements.sort((a, b) => b.score - a.score || a.order - b.order)

    return {
      disagreements: disagreements.slice(0, 3),
      agreements: agreements.slice(0, 3),
    }
  }, [decodeResponseAt, selected, sessionData, vectorByStudentId])

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
        <p className="mt-1 text-xs text-student-text-disabled">点にマウスを重ねるか、タップして詳細を確認できます。</p>
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

      {isSmallSample && (
        <Card className="mb-4 border border-student-border-primary bg-student-bg-secondary p-4">
          <CardContent>
            <h2 className="text-sm font-semibold text-student-text-primary">サンプル数に関する注意</h2>
            <p className="mt-2 text-sm text-student-text-secondary">
              参加者が15人未満のため、地図は参考表示です。分布とあわせて解釈してください。
            </p>
          </CardContent>
        </Card>
      )}

      {sessionData?.surveyStatus?.consentToResearch && !sessionData.surveyStatus.postCompleted && (
        <Card className="mb-4 border border-student-border-primary bg-student-bg-secondary p-4">
          <CardContent>
            <h2 className="text-sm font-semibold text-student-text-primary">授業後アンケート（約3分）</h2>
            <p className="mt-2 text-sm text-student-text-secondary">
              授業後の変化を記録すると、次回の授業改善と研究分析に役立ちます。
            </p>
            <Button
              className="mt-3"
              size="sm"
              onClick={() => router.push(`/student/session/${encodeURIComponent(sessionId)}/survey/post`)}
            >
              回答する
            </Button>
          </CardContent>
        </Card>
      )}

      {sessionData?.surveyStatus?.consentToResearch && sessionData.surveyStatus.postCompleted && (
        <Card className="mb-4 border border-student-border-primary bg-student-bg-secondary p-4">
          <CardContent>
            <h2 className="text-sm font-semibold text-student-text-primary">授業後アンケート</h2>
            <p className="mt-2 text-sm text-student-text-secondary">回答済みです。協力ありがとうございます。</p>
          </CardContent>
        </Card>
      )}

      {umapResults.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          <div className="relative rounded-lg border border-student-border-primary bg-student-bg-primary">
            <canvas
              ref={canvasRef}
              className="w-full rounded-lg"
              style={{ aspectRatio: '4 / 3' }}
              role="img"
              aria-label={`意見マップ: ${umapResults.length}人の回答を${new Set(umapResults.map((r) => r.cluster)).size}個のタイプに分類した散布図`}
              onPointerMove={handleCanvasPointerMove}
              onPointerDown={handleCanvasPointerDown}
              onPointerLeave={() => setTooltip(null)}
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

                  {!selected.isSelf && selectedComparison && (
                    <>
                      <div className="mt-4">
                        <p className="text-xs font-semibold text-student-text-primary">差が大きい設問</p>
                        {selectedComparison.disagreements.length === 0 ? (
                          <p className="mt-1 text-xs text-student-text-tertiary">大きな差分は見つかりませんでした。</p>
                        ) : (
                          <div className="mt-2 space-y-2">
                            {selectedComparison.disagreements.map((item) => (
                              <div key={item.questionId} className="rounded border border-student-border-primary bg-student-bg-primary p-2">
                                <p className="truncate text-xs text-student-text-secondary">Q{item.order}. {item.text}</p>
                                <p className="mt-1 text-xs text-student-text-tertiary">
                                  あなた: {RESPONSE_LABELS[item.mine]} / 相手: {RESPONSE_LABELS[item.other]}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="mt-4">
                        <p className="text-xs font-semibold text-student-text-primary">一致している設問</p>
                        {selectedComparison.agreements.length === 0 ? (
                          <p className="mt-1 text-xs text-student-text-tertiary">一致している設問はまだありません。</p>
                        ) : (
                          <div className="mt-2 space-y-2">
                            {selectedComparison.agreements.map((item) => (
                              <div key={item.questionId} className="rounded border border-student-border-primary bg-student-bg-primary p-2">
                                <p className="truncate text-xs text-student-text-secondary">Q{item.order}. {item.text}</p>
                                <p className="mt-1 text-xs text-student-text-tertiary">
                                  共通回答: {RESPONSE_LABELS[item.mine]}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </aside>
        </div>
      ) : (
        <Card className="mb-6 border border-student-border-primary bg-student-bg-secondary">
          <CardHeader>
            <CardTitle className="text-base">マップ表示を準備できませんでした</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-student-text-secondary">
              座標の生成に失敗したため、設問ごとの回答分布のみ表示します。
            </p>
          </CardContent>
        </Card>
      )}

      <section className="mt-6 rounded-lg border border-student-border-primary bg-student-bg-secondary p-4">
        <h2 className="text-sm font-semibold text-student-text-primary">
          {isSmallSample ? '回答分布（全設問）' : '回答分布（上位6問）'}
        </h2>
        <div className="mt-3 space-y-3">
          {(isSmallSample ? responseDistributions : responseDistributions.slice(0, 6)).map((row) => (
            <div key={row.question.id} className="text-sm">
              <p className="mb-1 truncate text-student-text-secondary">Q{row.question.order}. {row.question.text}</p>
              <div className="flex h-3 w-full overflow-hidden rounded-full">
                <div className="bg-emerald-500" style={{ width: `${row.yesPct}%` }} />
                <div className="bg-amber-400" style={{ width: `${row.unknownPct}%` }} />
                <div className="bg-rose-400" style={{ width: `${row.noPct}%` }} />
                <div className="bg-slate-500" style={{ width: `${row.unansweredPct}%` }} />
              </div>
              <p className="mt-1 text-xs text-student-text-tertiary">
                はい {row.yes} ({row.yesPct}%) / わからない {row.unknown} ({row.unknownPct}%) / いいえ {row.no} ({row.noPct}%)
                {' / '}未回答 {row.unanswered} ({row.unansweredPct}%)
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
