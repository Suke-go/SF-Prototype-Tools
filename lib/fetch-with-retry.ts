type FetchWithRetryOptions = RequestInit & {
  retries?: number
  backoffMs?: number
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function fetchWithRetry(input: RequestInfo | URL, options: FetchWithRetryOptions = {}): Promise<Response> {
  const { retries = 3, backoffMs = 1000, ...init } = options

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('ネットワークに接続されていません')
  }

  let attempt = 0
  let lastError: unknown

  while (attempt <= retries) {
    try {
      const response = await fetch(input, init)
      if (response.ok || response.status < 500) return response
      lastError = new Error(`request failed with status ${response.status}`)
    } catch (error) {
      lastError = error
    }

    if (attempt === retries) break
    await sleep(backoffMs * 2 ** attempt)
    attempt += 1
  }

  throw lastError instanceof Error ? lastError : new Error('request failed')
}
