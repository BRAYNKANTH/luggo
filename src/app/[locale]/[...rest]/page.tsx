import { notFound } from 'next/navigation'

// Unmatched URLs render the translated [locale]/not-found page instead of
// Next's default English 404.
export default function CatchAllPage() {
  notFound()
}
