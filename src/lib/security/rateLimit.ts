const buckets = new Map<string, number[]>()

function prune(now: number, windowMs: number, timestamps: number[]) {
  return timestamps.filter((timestamp) => now - timestamp < windowMs)
}

export function hitRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  const current = prune(now, windowMs, buckets.get(key) ?? [])

  if (current.length >= limit) {
    buckets.set(key, current)
    return {
      allowed: false,
      retryAfterMs: Math.max(windowMs - (now - current[0]), 1000),
    }
  }

  current.push(now)
  buckets.set(key, current)

  return {
    allowed: true,
    retryAfterMs: 0,
  }
}

export function clearRateLimit(key: string) {
  buckets.delete(key)
}
