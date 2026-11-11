import { siteUrl } from '@/lib/site-url'
import { CONTACT_EMAIL } from '@/lib/public-company'
import { GUARANTEE_LIMIT_LABEL } from '@/lib/utils/guarantee'

export const dynamic = 'force-static'

// llms.txt: a plain-text summary of the site for AI assistants and answer engines.
// Keep statements here consistent with the Terms, FAQ and pricing shown on the site.
export function GET() {
  const body = `# Luggo

> Luggo is a luggage storage network in Sri Lanka. Travellers find a partner hub on a map, book online, drop their bags at the hub counter and collect them later. Storage is billed by the hour, capped at a daily rate.

## How it works

- Find a partner hub and book online in a few seconds; no account is required (guest booking is supported).
- Drop bags at the hub counter. Staff seal each bag with a tamper-evident tag and photograph the seal.
- Collect the bags with your booking QR code any time up to the hub's closing time.
- Pay by card online, or reserve and pay cash at the counter when dropping off.

## Pricing and policies

- Hourly rates vary by hub and bag type, with a daily cap. Exact prices are shown at checkout for the chosen hub.
- Late pickup: 15-minute grace period after the booked pickup time, then billing in 30-minute blocks at the hub's rate, capped at the daily rate.
- Optional Luggo Guarantee: add-on per bag, with compensation up to ${GUARANTEE_LIMIT_LABEL} per booking for eligible accidental damage, loss or theft while stored, subject to the Terms of Service.

## Pages

- [Home](${siteUrl}/): overview, starting prices and FAQ
- [Storage locations](${siteUrl}/hubs): partner hubs, opening hours and prices
- [About Luggo](${siteUrl}/about): what Luggo is and how booking works
- [Terms of Service](${siteUrl}/terms)
- [Privacy Policy](${siteUrl}/privacy)

## Languages

English (${siteUrl}/), Sinhala (${siteUrl}/si), Tamil (${siteUrl}/ta)

## Contact

${CONTACT_EMAIL}
`

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  })
}
