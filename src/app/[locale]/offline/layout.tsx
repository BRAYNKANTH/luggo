import { titleMetadata } from '@/lib/i18n/metadata'

export const generateMetadata = titleMetadata('offline')

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
