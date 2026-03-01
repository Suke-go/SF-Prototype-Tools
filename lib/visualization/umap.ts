import { UMAP } from 'umap-js'

export interface UMAPInput {
  studentId: string
  name: string | null
  isSelf?: boolean
  vector: number[]
}

export interface UMAPResult {
  studentId: string
  name: string | null
  isSelf?: boolean
  x: number
  y: number
}

function createSeededRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function computeUMAP(
  inputs: UMAPInput[],
  options?: {
    nNeighbors?: number
    minDist?: number
    nComponents?: number
    seed?: number
  }
): UMAPResult[] {
  if (inputs.length < 2) {
    // UMAP requires at least 2 points.
    return inputs.map((input, index) => ({
      studentId: input.studentId,
      name: input.name,
      isSelf: input.isSelf,
      x: index * 0.5,
      y: 0,
    }))
  }

  const nNeighbors = Math.min(options?.nNeighbors ?? 15, inputs.length - 1)
  const minDist = options?.minDist ?? 0.2
  const random = createSeededRandom(options?.seed ?? 42)

  const umap = new UMAP({
    nNeighbors,
    minDist,
    nComponents: options?.nComponents ?? 2,
    random,
  })

  const data = inputs.map((input) => input.vector)
  const embedding = umap.fit(data)

  return inputs.map((input, index) => ({
    studentId: input.studentId,
    name: input.name,
    isSelf: input.isSelf,
    x: embedding[index][0],
    y: embedding[index][1],
  }))
}

export function kMeans(
  points: { x: number; y: number }[],
  options?: {
    k?: number
    maxIter?: number
    seed?: number
  }
): number[] {
  const k = options?.k ?? 3
  const maxIter = options?.maxIter ?? 100
  const random = createSeededRandom(options?.seed ?? 42)

  if (points.length === 0) return []
  if (points.length <= k) return points.map((_, index) => index)

  // k-means++ initialization to reduce unstable local minima.
  const centroids: { x: number; y: number }[] = []
  const firstIndex = Math.floor(random() * points.length)
  centroids.push({ x: points[firstIndex].x, y: points[firstIndex].y })

  while (centroids.length < k) {
    const distances = points.map((point) => {
      let minDist = Number.POSITIVE_INFINITY
      for (const centroid of centroids) {
        const dx = point.x - centroid.x
        const dy = point.y - centroid.y
        const dist = dx * dx + dy * dy
        if (dist < minDist) minDist = dist
      }
      return minDist
    })

    const total = distances.reduce((sum, value) => sum + value, 0)
    if (total <= 0) {
      const randomIndex = Math.floor(random() * points.length)
      centroids.push({ x: points[randomIndex].x, y: points[randomIndex].y })
      continue
    }

    let threshold = random() * total
    let chosenIndex = points.length - 1
    for (let index = 0; index < distances.length; index += 1) {
      threshold -= distances[index]
      if (threshold <= 0) {
        chosenIndex = index
        break
      }
    }
    centroids.push({ x: points[chosenIndex].x, y: points[chosenIndex].y })
  }

  let assignments = new Array(points.length).fill(0)

  for (let iteration = 0; iteration < maxIter; iteration += 1) {
    const nextAssignments = points.map((point) => {
      let closest = 0
      let bestDist = Number.POSITIVE_INFINITY
      for (let centroidIndex = 0; centroidIndex < k; centroidIndex += 1) {
        const dx = point.x - centroids[centroidIndex].x
        const dy = point.y - centroids[centroidIndex].y
        const dist = dx * dx + dy * dy
        if (dist < bestDist) {
          bestDist = dist
          closest = centroidIndex
        }
      }
      return closest
    })

    const changed = nextAssignments.some((cluster, index) => cluster !== assignments[index])
    assignments = nextAssignments
    if (!changed) break

    for (let centroidIndex = 0; centroidIndex < k; centroidIndex += 1) {
      const members = points.filter((_, pointIndex) => assignments[pointIndex] === centroidIndex)
      if (members.length === 0) {
        // Re-seed empty cluster to the farthest point from current centroids.
        let farthestIndex = 0
        let farthestDist = -1
        for (let pointIndex = 0; pointIndex < points.length; pointIndex += 1) {
          const point = points[pointIndex]
          let minDist = Number.POSITIVE_INFINITY
          for (const centroid of centroids) {
            const dx = point.x - centroid.x
            const dy = point.y - centroid.y
            const dist = dx * dx + dy * dy
            if (dist < minDist) minDist = dist
          }
          if (minDist > farthestDist) {
            farthestDist = minDist
            farthestIndex = pointIndex
          }
        }
        centroids[centroidIndex] = {
          x: points[farthestIndex].x,
          y: points[farthestIndex].y,
        }
        continue
      }

      centroids[centroidIndex] = {
        x: members.reduce((sum, point) => sum + point.x, 0) / members.length,
        y: members.reduce((sum, point) => sum + point.y, 0) / members.length,
      }
    }
  }

  return assignments
}
