import { SOCIAL_LINKS } from '@/lib/public-company'

export function SocialLinks() {
  return (
    <nav aria-label="Luggo social media" className="flex flex-wrap justify-center gap-x-5 gap-y-2">
      {SOCIAL_LINKS.map(({ label, href }) => (
        <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4 hover:opacity-80">
          {label}<span className="sr-only"> (opens in a new tab)</span>
        </a>
      ))}
    </nav>
  )
}
