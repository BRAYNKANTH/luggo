import { type NextRequest, NextResponse } from 'next/server'

/**
 * Vercel Cron calls routes via GET with:
 *   Authorization: Bearer <CRON_SECRET>
 *
 * Returns a 401 NextResponse if the request is not authorised.
 * Returns null if the request is valid (caller should proceed).
 *
 * Set CRON_SECRET in your Vercel project env vars.
 * In development, set it in .env.local too.
 */
export function verifyCron(req: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('CRON_SECRET is not set — all cron routes are disabled')
    return NextResponse.json({ error: 'Cron not configured' }, { status: 500 })
  }

  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return null // authorised
}
