'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Accordion, Button, Card, CardContent, CardHeader, CardTitle, LoadingSpinner } from '@/components/ui'
import type { UMAPInput, UMAPResult } from '@/lib/visualization/umap'

const CLUSTER_COLORS = [
  'rgba(255,255,255,0.85)',
  'rgba(180,180,180,0.85)',
  'rgba(120,120,120,0.85)',
  'rgba(200,200,200,0.85)',
  'rgba(160,160,160,0.85)',
]

type SessionResponses = {
  sessionId: string
  questions: { id: string; order: number; text: string }[]
  students: { id: string; name: string | null; progressStatus: string }[]
  vectors: UMAPInput[]
  responseMap: Record<string, Record<string, 'YES' | 'NO' | 'UNKNOWN'>>
}

function getStudentId(sessionId: string): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(`student:id:${sessionId}`)
}

export default function VisualizationPage({ params }: { params: { sessionId: string } }) {
  const sessionId = params.sessionId
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [loading, setLoading] = useState(true)
  const [stage, setStage] = useState<'FETCH' | 'COMPUTE'>('FETCH')
  const [error, setError] = useState<string | null>(null)
  const [umapResults, setUmapResults] = useState<(UMAPResult & { cluster: number })[]>([])
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null)
  const [sessionData, setSessionData] = useState<SessionResponses | null>(null)

  const workerRef = useRef<Worker | null>(null)

  const myStudentId = useMemo(() => getStudentId(sessionId), [sessionId])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setStage('FETCH')
        const res = await fetch(`/api/session/responses?sessionId=${sessionId}`, { cache: 'no-store' })
        const ct = res.headers.get('content-type') || ''
        if (!ct.includes('application/json')) throw new Error('サーバーエラー')
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error?.message || 'データの取得に失敗しました')

        const data: SessionResponses = json.data
        if (!cancelled) setSessionData(data)

        const vectors: UMAPInput[] = data.vectors
        if (vectors.length === 0) throw new Error('回答データがまだありません')

        setStage('COMPUTE')

        // Worker初期化（初回のみ）
        if (!workerRef.current) {
          workerRef.current = new Worker(new URL('@/lib/visualization/umap.worker.ts', import.meta.url))
        }

        const worker = workerRef.current
        const computed: (UMAPResult & { cluster: number })[] = await new Promise((resolve, reject) => {
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
          worker.postMessage({ type: 'compute', payload: { vectors, k: Math.min(3, vectors.length) } })
        })

        if (!cancelled) setUmapResults(computed)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'データの取得に失敗しました')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [sessionId])

  useEffect(() => {
    return () => {
      workerRef.current?.terminate()
      workerRef.current = null
    }
  }, [])

  // Canvas描画
  useEffect(() => {
    if (umapResults.length === 0) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.width
    const H = canvas.height
    const pad = 40

    // 座標範囲
    const xs = umapResults.map((r) => r.x)
    const ys = umapResults.map((r) => r.y)
    const xMin = Math.min(...xs)
    const xMax = Math.max(...xs)
    const yMin = Math.min(...ys)
    const yMax = Math.max(...ys)
    const xRange = xMax - xMin || 1
    const yRange = yMax - yMin || 1

    function toCanvasX(x: number) { return pad + ((x - xMin) / xRange) * (W - pad * 2) }
    function toCanvasY(y: number) { return pad + ((y - yMin) / yRange) * (H - pad * 2) }

    // 背景
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, W, H)

    // グリッド（薄く）
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.lineWidth = 1
    for (let i = 0; i <= 4; i++) {
      const gx = pad + (i / 4) * (W - pad * 2)
      const gy = pad + (i / 4) * (H - pad * 2)
      ctx.beginPath(); ctx.moveTo(gx, pad); ctx.lineTo(gx, H - pad); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(pad, gy); ctx.lineTo(W - pad, gy); ctx.stroke()
    }

    // 点の描画
    for (const r of umapResults) {
      const cx = toCanvasX(r.x)
      const cy = toCanvasY(r.y)
      const isMe = r.studentId === myStudentId
      const radius = isMe ? 8 : 5

      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.fillStyle = isMe ? '#ffffff' : CLUSTER_COLORS[r.cluster % CLUSTER_COLORS.length]
      ctx.fill()

      if (isMe) {
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(cx, cy, 12, 0, Math.PI * 2)
        ctx.stroke()
      }
    }

    // 凡例
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.font = '11px sans-serif'
    ctx.fillText('● 自分の位置（白い二重丸）', pad, H - 10)
  }, [umapResults, myStudentId])

  // ホバーでツールチップ
  function handleCanvasMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas || umapResults.length === 0) return
    const rect = canvas.getBoundingClientRect()
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width)
    const my = (e.clientY - rect.top) * (canvas.height / rect.height)

    const W = canvas.width
    const H = canvas.height
    const pad = 40
    const xs = umapResults.map((r) => r.x)
    const ys = umapResults.map((r) => r.y)
    const xMin = Math.min(...xs); const xMax = Math.max(...xs)
    const yMin = Math.min(...ys); const yMax = Math.max(...ys)
    const xRange = xMax - xMin || 1; const yRange = yMax - yMin || 1

    let found: typeof umapResults[0] | null = null
    for (const r of umapResults) {
      const cx = pad + ((r.x - xMin) / xRange) * (W - pad * 2)
      const cy = pad + ((r.y - yMin) / yRange) * (H - pad * 2)
      const dx = mx - cx; const dy = my - cy
      if (dx * dx + dy * dy < 100) { found = r; break }
    }

    if (found) {
      const isMe = found.studentId === myStudentId
      setTooltip({
        x: e.clientX - (canvasRef.current?.getBoundingClientRect().left ?? 0),
        y: e.clientY - (canvasRef.current?.getBoundingClientRect().top ?? 0) - 30,
        text: isMe ? 'あなたの位置' : `クラスタ ${found.cluster + 1}`,
      })
    } else {
      setTooltip(null)
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-student-text-tertiary">
            {stage === 'FETCH' ? 'データを取得中...' : '意見マップを計算中...'}
          </p>
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
            <Button className="mt-4" variant="secondary" onClick={() => window.location.reload()}>
              再読み込み
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-6xl p-4 md:p-8">
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-bold text-student-text-primary">意見マップ</h1>
        <p className="mt-1 text-sm text-student-text-tertiary">
          回答パターンが近い人ほど近くに配置されます。白い二重丸があなたの位置です。
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        {/* 可視化エリア */}
        <div className="relative rounded-lg border border-student-border-primary bg-student-bg-primary">
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            className="w-full"
            onMouseMove={handleCanvasMove}
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
        </div>

        {/* 階層パネル */}
        <aside className="space-y-3">
          <Card className="p-0">
            <CardHeader className="px-6 pt-6 pb-2">
              <CardTitle className="text-lg">分析（階層）</CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="space-y-3">
                <Accordion title="レベル1：全体サマリー" defaultOpen>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-student-text-tertiary">参加者</span>
                      <span className="text-student-text-primary font-medium">{sessionData?.students.length ?? 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-student-text-tertiary">質問数</span>
                      <span className="text-student-text-primary font-medium">{sessionData?.questions.length ?? 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-student-text-tertiary">クラスタ数</span>
                      <span className="text-student-text-primary font-medium">
                        {new Set(umapResults.map((r) => r.cluster)).size}
                      </span>
                    </div>
                  </div>
                </Accordion>

                <Accordion title="レベル2：クラスタ内訳">
                  <div className="space-y-2 text-sm">
                    {Array.from(new Set(umapResults.map((r) => r.cluster)))
                      .sort((a, b) => a - b)
                      .map((c) => {
                        const count = umapResults.filter((r) => r.cluster === c).length
                        return (
                          <div key={c} className="flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: CLUSTER_COLORS[c % CLUSTER_COLORS.length] }} />
                              <span className="text-student-text-secondary">クラスタ {c + 1}</span>
                            </span>
                            <span className="text-student-text-primary font-medium">{count}</span>
                          </div>
                        )
                      })}
                  </div>
                </Accordion>

                <Accordion title="レベル3：質問ごとの解答分布（全体）">
                  <div className="max-h-[340px] space-y-3 overflow-auto pr-1">
                    {(sessionData?.questions ?? []).map((q) => {
                      const dist = { YES: 0, NO: 0, UNKNOWN: 0 }
                      for (const sid of Object.keys(sessionData?.responseMap ?? {})) {
                        const v = sessionData?.responseMap?.[sid]?.[q.id]
                        if (v === 'YES') dist.YES++
                        else if (v === 'NO') dist.NO++
                        else dist.UNKNOWN++
                      }
                      const total = Math.max(1, dist.YES + dist.NO + dist.UNKNOWN)
                      return (
                        <div key={q.id} className="rounded-lg border border-student-border-secondary bg-student-bg-secondary p-3">
                          <div className="text-xs text-student-text-tertiary">Q{q.order}</div>
                          <div className="mt-1 text-sm text-student-text-primary leading-relaxed">{q.text}</div>
                          <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                            <div className="rounded bg-black/30 p-2">
                              <div className="text-white/70">はい</div>
                              <div className="text-white font-medium">{dist.YES} ({Math.round((dist.YES / total) * 100)}%)</div>
                            </div>
                            <div className="rounded bg-black/30 p-2">
                              <div className="text-white/70">わからない</div>
                              <div className="text-white font-medium">{dist.UNKNOWN} ({Math.round((dist.UNKNOWN / total) * 100)}%)</div>
                            </div>
                            <div className="rounded bg-black/30 p-2">
                              <div className="text-white/70">いいえ</div>
                              <div className="text-white font-medium">{dist.NO} ({Math.round((dist.NO / total) * 100)}%)</div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </Accordion>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>

      {/* 注記 */}
      <div className="mt-4 rounded-lg border border-student-border-secondary bg-student-bg-secondary p-3">
        <p className="text-xs text-student-text-tertiary">
          ※ 本結果は統計的傾向であり、個人評価を目的としません。
          位置関係は回答パターンの類似性を表しており、「正解」や「優劣」はありません。
        </p>
      </div>

      {/* ナビゲーション */}
      <div className="mt-6 flex gap-3">
        <Button
          variant="secondary"
          onClick={() => (window.location.href = `/student/session/${encodeURIComponent(sessionId)}`)}
        >
          セッションに戻る
        </Button>
      </div>
    </main>
  )
}
