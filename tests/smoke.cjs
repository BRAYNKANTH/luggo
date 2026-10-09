const assert = require('node:assert/strict')
const base = process.env.SMOKE_BASE_URL || 'http://localhost:3001'
async function check(path, status, options = {}) {
  const res = await fetch(`${base}${path}`, { redirect: 'manual', ...options })
  assert.equal(res.status, status, `${path}: unexpected status ${res.status}`)
  console.log(`${path}: ${res.status}`)
  return res
}
async function main() {
  await check('/', 200)
  await check('/api/bookings', 401)
  for (const path of ['/api/auth/phone/send', '/api/auth/phone/verify', '/api/auth/check-exists']) {
    await check(path, 400, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
  }
  const worker = await check('/sw.js', 200)
  assert.match(worker.headers.get('content-type'), /javascript/)
  // Node fetch may replace Host. Use HTTP directly to test hostname routing.
  const url = new URL(base)
  for (const [path, locale] of [['/', 'en'], ['/si', 'si']]) {
    const staff = await new Promise((resolve, reject) => {
      require('node:http').get({ hostname: url.hostname, port: url.port, path, headers: { host: `staff.localhost:${url.port}` } }, res => {
        resolve({ status: res.statusCode, location: res.headers.location }); res.resume()
      }).on('error', reject)
    })
    assert.equal(staff.status, 307)
    assert.match(staff.location, new RegExp(`/${locale}/staff/login$`))
    console.log(`staff hostname ${path}: ${staff.status}`)
  }
  console.log('All server smoke checks passed.')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
