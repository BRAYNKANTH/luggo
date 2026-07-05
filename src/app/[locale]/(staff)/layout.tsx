import { StaffBottomNav } from '@/components/staff/StaffBottomNav'
import { Metadata } from 'next'

export const metadata: Metadata = {
  manifest: '/api/manifest/staff',
}

// Staff PWA layout — dedicated Android phone at hub
export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ocean-900 text-white pb-20">
      <main className="max-w-md mx-auto">{children}</main>
      <StaffBottomNav />
    </div>
  )
}
