const memoryStore = new Map<string, number[]>()

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
