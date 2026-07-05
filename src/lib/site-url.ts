const DEFAULT_SITE_URL = 'https://luggo.lk'

function normalizeSiteUrl(value: string | undefined) {
  if (!value) {
    return DEFAULT_SITE_URL
  }

  try {
    const url = new URL(value)

    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      return DEFAULT_SITE_URL
    }

    url.pathname = ''
    url.search = ''
    url.hash = ''

    return url.toString().replace(/\/$/, '')
  } catch {
    return DEFAULT_SITE_URL
  }
}

export const siteUrl = normalizeSiteUrl(process.env.NEXT_PUBLIC_APP_URL)
export const canonicalHost = new URL(siteUrl).host
