import { createServiceClient } from '@/lib/supabase/service'

// Serverless instances don't share memory, so limits are kept in Postgres
// (see supabase/security_hardening_migration.sql). The in-memory buckets are
// only a fallback if the database call fails, so auth keeps working.
const buckets = new Map<string, { timestamps: number[]; expiresAt: number }>()
let nextCleanup = 0

type RateLimitResult = { allowed: boolean; retryAfterMs: number }

function hitMemoryRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  if (now >= nextCleanup) {
    buckets.forEach((bucket, bucketKey) => {
      if (bucket.expiresAt <= now) buckets.delete(bucketKey)
    })
    nextCleanup = now + 60_000
  }
  const current = (buckets.get(key)?.timestamps ?? []).filter((timestamp) => now - timestamp < windowMs)

  if (current.length >= limit) {
    buckets.set(key, { timestamps: current, expiresAt: now + windowMs })
    return { allowed: false, retryAfterMs: Math.max(windowMs - (now - current[0]), 1000) }
  }

  current.push(now)
  buckets.set(key, { timestamps: current, expiresAt: now + windowMs })
  return { allowed: true, retryAfterMs: 0 }
}

export async function hitRateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  try {
    const { data, error } = await createServiceClient().rpc('hit_rate_limit', {
      p_key: key,
      p_limit: limit,
      p_window_ms: windowMs,
    }) as { data: { allowed: boolean; retry_after_ms: number } | null; error: unknown }
    if (error || !data) throw error ?? new Error('No rate limit result')
    return { allowed: data.allowed, retryAfterMs: data.retry_after_ms }
  } catch (err) {
    console.error('[rateLimit] shared limiter unavailable, using in-memory fallback:', err)
    return hitMemoryRateLimit(key, limit, windowMs)
  }
}

export async function clearRateLimit(key: string): Promise<void> {
  buckets.delete(key)
  try {
    await createServiceClient().from('rate_limits' as never).delete().eq('key', key)
  } catch (err) {
    console.error('[rateLimit] failed to clear shared limit:', err)
  }
}
