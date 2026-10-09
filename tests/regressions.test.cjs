const test = require('node:test')
const assert = require('node:assert/strict')
const { createHash } = require('node:crypto')
const { bookingReferenceRange } = require('../src/lib/utils/bookingReference.ts')
const { parseExtensionOrder } = require('../src/lib/utils/paymentOrder.ts')
const { normalizePhone, sendPhoneCodeSchema, verifyPhoneCodeSchema } = require('../src/lib/validators/phone.ts')
const { createBookingSchema } = require('../src/lib/validators/booking.ts')
const { calculateBagPriceForHours, calculateLateFee } = require('../src/lib/utils/pricing.ts')
const { verifyPayhereIPN } = require('../src/lib/utils/payhere.ts')
const { verifyCron } = require('../src/lib/utils/cron.ts')
const { NextRequest } = require('next/server')
const id = '12345678-abcd-1234-abcd-123456789abc'

test('walk-in and partial UUID references produce a valid UUID range', () => {
  assert.deepEqual(bookingReferenceRange('WI-ABCDEF12'), {
    lower: 'abcdef12-0000-0000-0000-000000000000', upper: 'abcdef12-ffff-ffff-ffff-ffffffffffff',
  })
  assert.deepEqual(bookingReferenceRange(id), { lower: id, upper: id })
  for (const value of ['123', 'WI-invalid!', '%', 'abcdef12345678901234567890123456789']) assert.equal(bookingReferenceRange(value), null)
})
test('extension order parser preserves UUID hyphens, duration, and quoted end time', () => {
  const end = Date.UTC(2026, 9, 10, 12)
  assert.deepEqual(parseExtensionOrder(`ext_${id}_24_${end}`), { paymentId: id, hours: 24, endTime: new Date(end).toISOString() })
  assert.deepEqual(parseExtensionOrder(`ext-${id}-4`), { paymentId: id, hours: 4, endTime: null })
  for (const value of [`ext_${id}_0`, `ext_${id}_169`, `ext_${id}_2.5`, `ext_${id}_4oops`, `ext_bad_4`, `ext_${id}_4_9999999999999999999`]) assert.equal(parseExtensionOrder(value), null)
})
test('phone aliases share the same canonical identity and rate-limit key', () => {
  for (const value of ['0771234567', '+94 77 123 4567', '94771234567', '771234567']) assert.equal(normalizePhone(value), '+94771234567')
  for (const value of ['garbage0771234567', '123', '++x', '']) assert.equal(sendPhoneCodeSchema.safeParse({ phone: value }).success, false)
  assert.equal(verifyPhoneCodeSchema.safeParse({ phone: '0771234567', otp: '123456', name: 9 }).success, false)
  assert.equal(verifyPhoneCodeSchema.safeParse({ phone: '0771234567', otp: 123456 }).success, false)
  assert.equal(verifyPhoneCodeSchema.safeParse({ phone: '0771234567', otp: '123456' }).success, true)
})
test('daily caps allow a zero-cost extension and late fees respect grace and half hours', () => {
  assert.equal(calculateBagPriceForHours('small', 8), 600)
  assert.equal(calculateBagPriceForHours('small', 10), 600)
  assert.equal(calculateBagPriceForHours('small', 25), 680)
  const start = new Date('2026-10-10T10:00:00Z'), end = new Date('2026-10-10T11:00:00Z')
  assert.equal(calculateLateFee([{ bag_type: 'small' }], start, end, new Date('2026-10-10T11:15:00Z')), 0)
  assert.equal(calculateLateFee([{ bag_type: 'small' }], start, end, new Date('2026-10-10T11:16:00Z')), 40)
})
test('booking validation rejects malformed dates, missing terms and zero duration', () => {
  const valid = { hub_id: id, start_time: '2099-01-01T10:00:00+05:30', end_time: '2099-01-01T11:00:00+05:30', bags: [{ bag_type: 'small' }], terms_accepted: true }
  assert.equal(createBookingSchema.safeParse(valid).success, true)
  for (const overrides of [{ end_time: valid.start_time }, { terms_accepted: false }, { bags: [] }, { start_time: 'bad' }]) assert.equal(createBookingSchema.safeParse({ ...valid, ...overrides }).success, false)
})
test('payment signature cannot confirm a changed amount or unsuccessful payment', () => {
  const params = { merchant_id: 'merchant', order_id: id, payhere_amount: '120.00', payhere_currency: 'LKR', status_code: '2', merchant_secret: 'test-secret' }
  const md5 = value => createHash('md5').update(value).digest('hex').toUpperCase()
  const md5sig = md5(params.merchant_id + id + '120.00LKR2' + md5(params.merchant_secret))
  assert.equal(verifyPayhereIPN({ ...params, md5sig }), true)
  assert.equal(verifyPayhereIPN({ ...params, md5sig, payhere_amount: '1.00' }), false)
  assert.equal(verifyPayhereIPN({ ...params, md5sig, status_code: '0' }), false)
})
test('cron endpoints require the configured bearer secret', () => {
  const previous = process.env.CRON_SECRET
  process.env.CRON_SECRET = 'test-cron'
  try {
    assert.equal(verifyCron(new NextRequest('http://localhost/api/cron/expire-bookings')).status, 401)
    assert.equal(verifyCron(new NextRequest('http://localhost/api/cron/expire-bookings', { headers: { authorization: 'Bearer test-cron' } })), null)
  } finally {
    if (previous === undefined) delete process.env.CRON_SECRET
    else process.env.CRON_SECRET = previous
  }
})

const serviceModule = require('../src/lib/supabase/service.ts')
const webhook = require('../src/app/api/webhooks/payhere/route.ts')
function signedNotification(orderId = `ext_${id}_4_1791633600000`) {
  const values = { merchant_id: 'test-merchant', order_id: orderId, payment_id: 'gateway-123', payhere_amount: '120.00', payhere_currency: 'LKR', status_code: '2' }
  const md5 = value => createHash('md5').update(value).digest('hex').toUpperCase()
  values.md5sig = md5(values.merchant_id + values.order_id + values.payhere_amount + values.payhere_currency + values.status_code + md5('test-secret'))
  return new NextRequest('http://localhost/api/webhooks/payhere', { method: 'POST', body: new URLSearchParams(values) })
}
test('webhook asks the gateway to retry when the database transaction fails', async () => {
  const original = serviceModule.createServiceClient
  const previousMerchant = process.env.NEXT_PUBLIC_PAYHERE_MERCHANT_ID
  const previousSecret = process.env.PAYHERE_MERCHANT_SECRET
  process.env.NEXT_PUBLIC_PAYHERE_MERCHANT_ID = 'test-merchant'
  process.env.PAYHERE_MERCHANT_SECRET = 'test-secret'
  let called = false
  serviceModule.createServiceClient = () => ({
    from: () => { const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: { type: 'extension' }, error: null }) }; return query },
    rpc: async (name, args) => { called = true; assert.equal(name, 'apply_payhere_payment'); assert.equal(args.p_extension_hours, 4); assert.equal(args.p_payment_id, id); return { error: { message: 'simulated database failure' } } },
  })
  try { assert.equal((await webhook.POST(signedNotification())).status, 500); assert.equal(called, true) }
  finally {
    serviceModule.createServiceClient = original
    if (previousMerchant === undefined) delete process.env.NEXT_PUBLIC_PAYHERE_MERCHANT_ID; else process.env.NEXT_PUBLIC_PAYHERE_MERCHANT_ID = previousMerchant
    if (previousSecret === undefined) delete process.env.PAYHERE_MERCHANT_SECRET; else process.env.PAYHERE_MERCHANT_SECRET = previousSecret
  }
})
test('concurrently consumed OTP cannot establish another session', async () => {
  const original = serviceModule.createServiceClient
  let calls = 0
  serviceModule.createServiceClient = () => ({ from: () => {
    const query = { select: () => query, eq: () => query, is: () => query, gte: () => query, order: () => query, limit: () => query,
      single: async () => ({ data: { otp: 'hash', expires_at: '2099-01-01' } }), update: () => query,
      then: resolve => { calls++; return Promise.resolve({ data: [], error: null }).then(resolve) } }
    return query
  } })
  try {
    const { POST } = require('../src/app/api/auth/phone/verify/route.ts')
    const req = new NextRequest('http://localhost/api/auth/phone/verify', { method: 'POST', body: JSON.stringify({ phone: '0771234567', otp: '123456' }), headers: { 'content-type': 'application/json' } })
    assert.equal((await POST(req)).status, 400)
    assert.equal(calls, 1)
  } finally { serviceModule.createServiceClient = original }
})

test('a reminder already claimed by another request sends no notification', async () => {
  const original = serviceModule.createServiceClient
  const previous = process.env.CRON_SECRET
  process.env.CRON_SECRET = 'test-cron'
  const filters = []
  let claimAttempted = false
  serviceModule.createServiceClient = () => ({ from: table => {
    assert.equal(table, 'bookings')
    const query = { select: () => query, eq: (column, value) => { filters.push([column, value]); return query },
      is: (column, value) => { filters.push([column, value]); return query }, gt: () => query, lte: () => query,
      update: () => { claimAttempted = true; return query }, maybeSingle: async () => ({ data: null, error: null }),
      then: resolve => Promise.resolve({ data: [{ id, end_time: new Date(Date.now() + 60 * 60000).toISOString(), users: { id, name: 'Test' }, hubs: { name: 'Hub' } }], error: null }).then(resolve) }
    return query
  } })
  try {
    const { GET } = require('../src/app/api/cron/pickup-reminders/route.ts')
    const response = await GET(new NextRequest('http://localhost/api/cron/pickup-reminders', { headers: { authorization: 'Bearer test-cron' } }))
    assert.deepEqual(await response.json(), { sent: 0 })
    assert.equal(claimAttempted, true)
    assert.ok(filters.some(([column, value]) => column === 'reminder_sent_at' && value === null))
    assert.ok(filters.some(([column, value]) => column === 'status' && value === 'active_storage'))
  } finally {
    serviceModule.createServiceClient = original
    if (previous === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = previous
  }
})
