// Works out which marketing "city" cards have a partner hub that is actually live.
// Derived from the database (active hubs) so the landing page never claims coverage we don't have.

export const MARKETING_CITIES = ['colombo', 'kandy', 'galle', 'ella', 'mirissa', 'negombo', 'airport'] as const
export type MarketingCity = (typeof MARKETING_CITIES)[number]

const CITY_PATTERNS: Record<MarketingCity, RegExp> = {
  colombo: /\bcolombo\b/i,
  kandy: /\bkandy\b/i,
  galle: /\bgalle\b/i,
  ella: /\bella\b/i,
  mirissa: /\bmirissa\b/i,
  negombo: /\bnegombo\b/i,
  airport: /\b(airport|bia|katunayake|bandaranaike)\b/i,
}

type HubLike = { name?: string | null; alias?: string | null; location?: string | null; address?: string | null }

export function liveCitiesFromHubs(hubs: HubLike[]): MarketingCity[] {
  const text = hubs.map(h => [h.name, h.alias, h.location, h.address].filter(Boolean).join(' '))
  return MARKETING_CITIES.filter(city => text.some(t => CITY_PATTERNS[city].test(t)))
}
