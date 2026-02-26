const memoryStore = new Map<string, number[]>()
const MAX_STORE_SIZE = 10_000
let lastGc = 0
const GC_INTERVAL_MS = 60_000

function gcStore(now: number) {
  if (now - lastGc < GC_INTERVAL_MS) return
  lastGc = now
  for (const [key, timestamps] of memoryStore) {
    const recent = timestamps.filter((t) => now - t < 30 * 60 * 1000)
    if (recent.length === 0) {
      memoryStore.delete(key)
    } else {
      memoryStore.set(key, recent)
    }
  }
  if (memoryStore.size > MAX_STORE_SIZE) {
    const toDelete = memoryStore.size - MAX_STORE_SIZE
    const keys = memoryStore.keys()
    for (let i = 0; i < toDelete; i++) {
      const next = keys.next()
      if (!next.done) memoryStore.delete(next.value)
    }
  }
}

export type RateLimitResult = {
  ok: boolean
  remaining: number
  retryAfterSec: number
}

export function rateLimitByIp(
  key: string,
  opts: { limit: number; windowMs: number; now?: number } = { limit: 10, windowMs: 5 * 60 * 1000 }
): RateLimitResult {
  const now = opts.now ?? Date.now()
  gcStore(now)
  const since = now - opts.windowMs
  const history = (memoryStore.get(key) || []).filter((timestamp) => timestamp > since)

  if (history.length >= opts.limit) {
    const retryAfterSec = Math.max(1, Math.ceil((history[0] + opts.windowMs - now) / 1000))
    memoryStore.set(key, history)
    return { ok: false, remaining: 0, retryAfterSec }
  }

  history.push(now)
  memoryStore.set(key, history)
  return { ok: true, remaining: Math.max(0, opts.limit - history.length), retryAfterSec: 0 }
}
