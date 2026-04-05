import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/PageHeader'
import { Bell, CheckCheck, Package, ShieldCheck, Clock, AlertTriangle, MessageSquare, Info } from 'lucide-react'
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns'
import { type NotificationType } from '@/types/database'
import { markAllNotificationsRead } from '@/lib/auth/actions'

type Notif = {
  id: string
  type: NotificationType
  message: string
  read: boolean
  created_at: string
}

const TYPE_ICON: Record<NotificationType, React.ReactNode> = {
  booking_confirmed:  <Package size={16} className="text-blue-500" />,
  seal_ready:         <ShieldCheck size={16} className="text-amber-500" />,
  pickup_reminder:    <Clock size={16} className="text-violet-500" />,
  late_fee:           <AlertTriangle size={16} className="text-red-500" />,
  complaint_update:   <MessageSquare size={16} className="text-orange-500" />,
  general:            <Info size={16} className="text-gray-400" />,
}

const TYPE_BG: Record<NotificationType, string> = {
  booking_confirmed:  'bg-blue-50',
  seal_ready:         'bg-amber-50',
  pickup_reminder:    'bg-violet-50',
  late_fee:           'bg-red-50',
  complaint_update:   'bg-orange-50',
  general:            'bg-gray-50',
}

function groupByDate(notifs: Notif[]) {
  const groups: Record<string, Notif[]> = {}
  for (const n of notifs) {
    const d = new Date(n.created_at)
    const key = isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'dd MMM yyyy')
    if (!groups[key]) groups[key] = []
    groups[key].push(n)
  }
  return groups
}

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: notifs } = await supabase
    .from('notifications')
    .select('id, type, message, read, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100) as { data: Notif[] | null }

  const all = notifs ?? []
  const unread = all.filter(n => !n.read).length
  const groups = groupByDate(all)

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title="Notifications"
        subtitle={unread > 0 ? `${unread} unread` : 'All caught up'}
        action={
          unread > 0 ? (
            <form action={markAllNotificationsRead}>
              <button
                type="submit"
                className="flex items-center gap-1.5 text-xs font-semibold text-brand hover:text-ocean-700 px-3 py-2 rounded-xl hover:bg-brand/5 transition-colors"
              >
                <CheckCheck size={14} />
                Mark all read
              </button>
            </form>
          ) : undefined
        }
      />

      <div className="px-4 md:px-6 py-4 pb-24">
        {all.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <Bell size={28} className="text-gray-300" />
            </div>
            <p className="font-bold text-gray-500">No notifications yet</p>
            <p className="text-sm text-gray-400 mt-1">
              We&apos;ll notify you about your bookings, seals, and pickups.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groups).map(([date, items]) => (
              <section key={date}>
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 px-1">
                  {date}
                </p>
                <div className="space-y-2">
                  {items.map((n) => (
                    <div
                      key={n.id}
                      className={`relative flex items-start gap-3 rounded-2xl px-4 py-3.5 border transition-all ${
                        n.read
                          ? 'bg-white border-gray-100'
                          : 'bg-brand/5 border-brand/20'
                      }`}
                    >
                      {/* Unread dot */}
                      {!n.read && (
                        <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-brand" />
                      )}

                      {/* Icon */}
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${TYPE_BG[n.type] ?? 'bg-gray-50'}`}>
                        {TYPE_ICON[n.type] ?? <Info size={16} className="text-gray-400" />}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pr-4">
                        <p className={`text-sm leading-relaxed ${n.read ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>
                          {n.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
