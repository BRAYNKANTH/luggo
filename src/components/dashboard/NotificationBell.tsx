"use client"

import { useState, useRef, useEffect, useId } from 'react'
import { Bell, Check, Trash2, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { Link } from '@/navigation'
import { formatDistanceToNow } from 'date-fns'

type Notification = { id: string; message: string; type: string; read: boolean; created_at: string }
export function NotificationBell({ initialNotifications }: { initialNotifications: Notification[] }) {
  const [notifications, setNotifications] = useState(initialNotifications)
  const [isOpen, setIsOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const [position, setPosition] = useState({ left: 16, top: 80, width: 288, maxHeight: 400 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  const unreadCount = notifications.filter(n => !n.read).length
  useEffect(() => setNotifications(initialNotifications), [initialNotifications])
  function close() { setIsOpen(false); triggerRef.current?.focus() }
  useEffect(() => {
    if (!isOpen) return
    const reposition = () => {
      const bounds = triggerRef.current?.getBoundingClientRect()
      if (!bounds) return
      const width = Math.min(384, window.innerWidth - 32)
      const top = Math.min(bounds.bottom + 8, Math.max(16, window.innerHeight - 250))
      setPosition({ left: Math.max(16, Math.min(bounds.right - width, window.innerWidth - width - 16)), top, width, maxHeight: Math.max(48, window.innerHeight - top - 80) })
    }
    reposition()
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    closeRef.current?.focus()
    const outside = (event: PointerEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node) && !panelRef.current?.contains(event.target as Node)) setIsOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setIsOpen(false); triggerRef.current?.focus() }
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => { window.removeEventListener('resize', reposition); window.removeEventListener('scroll', reposition, true); document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape) }
  }, [isOpen])
  async function update(action: 'read' | 'all' | 'delete', id?: string) {
    if (pending) return
    setPending(true); setError(null)
    try {
      const res = await fetch('/api/notifications', {
        method: action === 'delete' ? 'DELETE' : 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action === 'all' ? { action: 'mark_all_read' } : { id }),
      })
      if (!res.ok) throw new Error('Update failed')
      setNotifications(current => action === 'delete' ? current.filter(n => n.id !== id) : current.map(n => action === 'all' || n.id === id ? { ...n, read: true } : n))
    } catch { setError('Unable to update notifications. Please try again.') }
    finally { setPending(false) }
  }
  return <div className="relative" ref={dropdownRef}>
    <button ref={triggerRef} type="button" onClick={() => setIsOpen(open => !open)}
      aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`} aria-expanded={isOpen} aria-controls={panelId}
      className="relative min-h-11 min-w-11 flex items-center justify-center rounded-xl text-gray-600 hover:text-ocean-900">
      <Bell size={22} />
      {unreadCount > 0 && <span aria-hidden="true" className="absolute top-1 right-1 w-5 h-5 bg-ocean-600 text-xs flex items-center justify-center rounded-full text-white font-bold">{unreadCount > 9 ? '9+' : unreadCount}</span>}
    </button>
    {isOpen && createPortal(<section ref={panelRef} style={position} id={panelId} aria-label="Notifications" aria-busy={pending}
      className="fixed bg-white text-ocean-900 rounded-3xl shadow-2xl border border-gray-200 z-[150] overflow-y-auto overscroll-contain">
      <div className="sticky top-0 z-10 p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2 bg-white">
        <h2 className="font-bold">Notifications</h2>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && <button type="button" disabled={pending} onClick={() => update('all')} className="min-h-11 px-2 text-xs font-bold text-ocean-600 disabled:opacity-50">Mark all read</button>}
          <button ref={closeRef} type="button" aria-label="Close notifications" onClick={close} className="min-h-11 min-w-11 flex items-center justify-center rounded-xl text-gray-600 hover:bg-gray-100"><X size={20} /></button>
        </div>
      </div>
      {error && <p role="alert" className="p-4 text-sm text-red-700 bg-red-50">{error}</p>}
      {notifications.length ? <div className="divide-y divide-gray-100">
        {notifications.map(n => <div key={n.id} className={`p-4 flex gap-3 ${!n.read ? 'bg-ocean-50' : ''}`}>
          <div className="flex-1 min-w-0">
            <p className={`text-sm leading-relaxed break-words ${!n.read ? 'text-ocean-900 font-semibold' : 'text-gray-600'}`}>{n.message}</p>
            <p className="text-xs text-gray-600 mt-1">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
          </div>
          <div className="flex flex-col gap-1 shrink-0">
            {!n.read && <button type="button" disabled={pending} aria-label="Mark notification as read" onClick={() => update('read', n.id)} className="min-h-11 min-w-11 flex items-center justify-center bg-white border border-gray-200 rounded-xl text-ocean-600 disabled:opacity-50"><Check size={18} /></button>}
            <button type="button" disabled={pending} aria-label="Delete notification" onClick={() => update('delete', n.id)} className="min-h-11 min-w-11 flex items-center justify-center bg-white border border-gray-200 rounded-xl text-red-700 disabled:opacity-50"><Trash2 size={18} /></button>
          </div>
        </div>)}
      </div> : <div className="py-10 px-6 text-center"><p className="font-bold">All caught up!</p><p className="text-sm text-gray-600 mt-1">No notifications at the moment.</p></div>}
      {!!notifications.length && <div className="p-4 text-center border-t border-gray-100"><Link href="/notifications" onClick={() => setIsOpen(false)} className="inline-flex min-h-11 items-center text-sm font-semibold text-ocean-600">See all notifications</Link></div>}
    </section>, document.body)}
  </div>
}
