const buckets = new Map<string, { timestamps: number[]; expiresAt: number }>()
let nextCleanup = 0

function prune(now: number, windowMs: number, timestamps: number[]) {
  return timestamps.filter((timestamp) => now - timestamp < windowMs)
}

export function hitRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  if (now >= nextCleanup) {
    buckets.forEach((bucket, bucketKey) => {
      if (bucket.expiresAt <= now) buckets.delete(bucketKey)
    })
    nextCleanup = now + 60_000
  }
  const current = prune(now, windowMs, buckets.get(key)?.timestamps ?? [])

  if (current.length >= limit) {
    buckets.set(key, { timestamps: current, expiresAt: now + windowMs })
    return {
      allowed: false,
      retryAfterMs: Math.max(windowMs - (now - current[0]), 1000),
    }
  }

  current.push(now)
  buckets.set(key, { timestamps: current, expiresAt: now + windowMs })

  return {
    allowed: true,
    retryAfterMs: 0,
  }
}

export function clearRateLimit(key: string) {
  buckets.delete(key)
}
