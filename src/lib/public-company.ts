export const CONTACT_EMAIL = 'info@luggo.lk'

function companyLinkedInUrl(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined
  try {
    const url = new URL(value.trim())
    if (url.protocol !== 'https:' || url.hostname !== 'www.linkedin.com' || !/^\/company\/[^/]+\/?$/.test(url.pathname) || url.username || url.password || url.port) return undefined
    url.search = ''
    url.hash = ''
    return url.toString()
  } catch { return undefined }
}

// Set this to the verified company page; never guess a LinkedIn slug.
export const LINKEDIN_URL = companyLinkedInUrl(process.env.NEXT_PUBLIC_LINKEDIN_URL)
export const SOCIAL_LINKS = [
  { label: 'Facebook', href: 'https://www.facebook.com/luggo.lk' },
  { label: 'Instagram', href: 'https://www.instagram.com/luggo.lk' },
  ...(LINKEDIN_URL ? [{ label: 'LinkedIn', href: LINKEDIN_URL }] : []),
]
