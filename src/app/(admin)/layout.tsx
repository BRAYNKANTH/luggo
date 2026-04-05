// Admin route group layout.
// Each protected page wraps itself in <AdminShell> for the sidebar.
// Login page renders standalone (no shell).
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
