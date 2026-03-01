import { computeUMAP, kMeans, type UMAPInput, type UMAPResult } from '@/lib/visualization/umap'

type RequestMessage =
  | {
      type: 'compute'
      payload: {
        vectors: UMAPInput[]
        k?: number
        umap?: {
          nNeighbors?: number
          minDist?: number
          nComponents?: number
        }
      }
    }

type ResponseMessage =
  | {
      type: 'result'
      payload: {
        points: (UMAPResult & { cluster: number })[]
      }
    }
  | { type: 'error'; payload: { message: string } }

function hashToSeed(value: string) {
  let hash = 2166136261 >>> 0
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function estimateClusterCount(sampleSize: number) {
  if (sampleSize <= 1) return 1
  if (sampleSize <= 4) return 2
  if (sampleSize <= 8) return 3
  return Math.min(8, Math.max(3, Math.round(Math.sqrt(sampleSize))))
}

// Keep worker typing local so tsconfig does not need the webworker lib globally.
const ctx = self as unknown as {
  onmessage: ((event: MessageEvent<RequestMessage>) => void) | null
  postMessage: (message: ResponseMessage) => void
}

ctx.onmessage = (event: MessageEvent<RequestMessage>) => {
  try {
    if (event.data.type !== 'compute') return
    const { vectors, k, umap } = event.data.payload
    if (vectors.length === 0) {
      const message: ResponseMessage = { type: 'result', payload: { points: [] } }
      ctx.postMessage(message)
      return
    }

    const seedInput = `${vectors.length}|${vectors[0]?.vector.length ?? 0}|${vectors.map((vector) => vector.studentId).join(',')}`
    const seed = hashToSeed(seedInput)

    const results = computeUMAP(vectors, { ...umap, seed })
    const estimated = estimateClusterCount(vectors.length)
    const clusterCount = Math.min(Math.max(k ?? estimated, 1), vectors.length)
    const clusters = kMeans(results, { k: clusterCount, seed })
    const points = results.map((result, index) => ({ ...result, cluster: clusters[index] ?? 0 }))
    const message: ResponseMessage = { type: 'result', payload: { points } }
    ctx.postMessage(message)
  } catch (error) {
    const message: ResponseMessage = {
      type: 'error',
      payload: { message: error instanceof Error ? error.message : 'Worker error' },
    }
    ctx.postMessage(message)
  }
}
