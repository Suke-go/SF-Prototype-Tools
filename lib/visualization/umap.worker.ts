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

// Keep worker typing local so tsconfig does not need the webworker lib globally.
const ctx = self as unknown as {
  onmessage: ((ev: MessageEvent<RequestMessage>) => void) | null
  postMessage: (message: ResponseMessage) => void
}

ctx.onmessage = (ev: MessageEvent<RequestMessage>) => {
  try {
    if (ev.data.type !== 'compute') return
    const { vectors, k, umap } = ev.data.payload
    const results = computeUMAP(vectors, umap)
    const kk = Math.min(k ?? 3, vectors.length)
    const clusters = kMeans(results, kk)
    const points = results.map((r, i) => ({ ...r, cluster: clusters[i] ?? 0 }))
    const message: ResponseMessage = { type: 'result', payload: { points } }
    ctx.postMessage(message)
  } catch (e) {
    const message: ResponseMessage = {
      type: 'error',
      payload: { message: e instanceof Error ? e.message : 'Worker error' },
    }
    ctx.postMessage(message)
  }
}

