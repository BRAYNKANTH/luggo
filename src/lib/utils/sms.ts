'use server'

import https from 'node:https'

const TEXTLK_ENDPOINT = 'https://app.text.lk/api/v3/sms/send'

export async function sendSMS(to: string, message: string): Promise<void> {
  const token    = process.env.TEXTLK_API_TOKEN
  const senderId = process.env.TEXTLK_SENDER_ID ?? 'Luggo'

  if (!token) {
    console.warn('SMS: TEXTLK_API_TOKEN not set — skipping')
    return
  }

  const recipient = normaliseLKPhone(to)
  if (!recipient) {
    console.warn('SMS: invalid phone number', to)
    return
  }

  const payload = JSON.stringify({ recipient, sender_id: senderId, message })

  await new Promise<void>((resolve, reject) => {
    const url = new URL(TEXTLK_ENDPOINT)
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      family: 4, // force IPv4 — Node.js on Windows tries IPv6 first which times out
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
        'Accept':        'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
      timeout: 15000,
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          console.log('SMS sent to', recipient, '→', data)
          resolve()
        } else {
          console.error('SMS send failed', res.statusCode, data)
          reject(new Error(`SMS failed: ${res.statusCode}`))
        }
      })
    })

    req.on('timeout', () => {
      req.destroy()
      reject(new Error('SMS request timed out'))
    })

    req.on('error', reject)
    req.write(payload)
    req.end()
  })
}

/** Normalise to +94XXXXXXXXX format required by text.lk */
function normaliseLKPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('94') && digits.length === 11) return `+${digits}`
  if (digits.startsWith('0')  && digits.length === 10) return `+94${digits.slice(1)}`
  if (digits.length === 9)                              return `+94${digits}`
  return null
}
