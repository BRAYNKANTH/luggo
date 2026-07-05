import { Metadata } from 'next'

export const metadata: Metadata = {
  manifest: '/api/manifest/admin',
}

// Admin route group layout.
// Each protected page wraps itself in <AdminShell> for the sidebar.
// Login page renders standalone (no shell).
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
