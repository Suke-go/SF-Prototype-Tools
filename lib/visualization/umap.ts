import { UMAP } from 'umap-js'

export interface UMAPInput {
  studentId: string
  name: string | null
  vector: number[]
}

export interface UMAPResult {
  studentId: string
  name: string | null
  x: number
  y: number
}

export function computeUMAP(
  inputs: UMAPInput[],
  options?: {
    nNeighbors?: number
    minDist?: number
    nComponents?: number
  }
): UMAPResult[] {
  if (inputs.length < 2) {
    // UMAP requires at least 2 points
    return inputs.map((inp, i) => ({
      studentId: inp.studentId,
      name: inp.name,
      x: i * 0.5,
      y: 0,
    }))
  }

  const nNeighbors = Math.min(options?.nNeighbors ?? 15, inputs.length - 1)
  const minDist = options?.minDist ?? 0.2

  const umap = new UMAP({
    nNeighbors,
    minDist,
    nComponents: options?.nComponents ?? 2,
  })

  const data = inputs.map((inp) => inp.vector)
  const embedding = umap.fit(data)

  return inputs.map((inp, i) => ({
    studentId: inp.studentId,
    name: inp.name,
    x: embedding[i][0],
    y: embedding[i][1],
  }))
}

// 簡易 K-means（クラスタ数自動決定はスキップ、固定3クラスタ）
export function kMeans(
  points: { x: number; y: number }[],
  k: number = 3,
  maxIter: number = 50
): number[] {
  if (points.length === 0) return []
  if (points.length <= k) return points.map((_, i) => i)

  // ランダム初期化
  const centroids = points.slice(0, k).map((p) => ({ x: p.x, y: p.y }))
  let assignments = new Array(points.length).fill(0)

  for (let iter = 0; iter < maxIter; iter++) {
    // 割り当て
    const newAssignments = points.map((p) => {
      let minDist = Infinity
      let minIdx = 0
      for (let c = 0; c < k; c++) {
        const dx = p.x - centroids[c].x
        const dy = p.y - centroids[c].y
        const dist = dx * dx + dy * dy
        if (dist < minDist) {
          minDist = dist
          minIdx = c
        }
      }
      return minIdx
    })

    // 収束チェック
    const changed = newAssignments.some((a, i) => a !== assignments[i])
    assignments = newAssignments
    if (!changed) break

    // 重心更新
    for (let c = 0; c < k; c++) {
      const members = points.filter((_, i) => assignments[i] === c)
      if (members.length === 0) continue
      centroids[c] = {
        x: members.reduce((s, p) => s + p.x, 0) / members.length,
        y: members.reduce((s, p) => s + p.y, 0) / members.length,
      }
    }
  }

  return assignments
}
