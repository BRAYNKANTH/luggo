'use client'

import { useState, useRef, useEffect } from 'react'
import { Bell, Check, Trash2, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'

type Notification = {
  id: string
  message: string
  type: string
  read: boolean
  created_at: string
}

interface NotificationBellProps {
  initialNotifications: Notification[]
  userId: string
}

export function NotificationBell({ initialNotifications, userId }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const unreadCount = notifications.filter(n => !n.read).length

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const markAsRead = async (id: string) => {
    const { error } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('notifications') as any)
      .update({ read: true })
      .eq('id', id)

    if (!error) {
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      )
    }
  }

  const markAllAsRead = async () => {
    const { error } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('notifications') as any)
      .update({ read: true })
      .eq('user_id', userId)

    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    }
  }

  const deleteNotification = async (id: string) => {
    const { error } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('notifications') as any)
      .delete()
      .eq('id', id)

    if (!error) {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-white/70 hover:text-white transition-colors outline-none"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-brand text-[10px] flex items-center justify-center rounded-full text-white font-bold border-2 border-ocean-900">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-3 w-80 md:w-96 bg-white rounded-3xl shadow-2xl border border-gray-100 z-50 overflow-hidden"
          >
            <div className="p-5 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-ocean-900">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllAsRead}
                    className="text-[10px] font-black uppercase tracking-widest text-brand hover:opacity-70 transition-opacity"
                  >
                    Mark all read
                  </button>
                )}
                <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-ocean-900">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto scrollbar-hide">
              {notifications.length > 0 ? (
                <div className="divide-y divide-gray-50">
                  {notifications.map((n) => (
                    <div 
                      key={n.id} 
                      className={`p-4 hover:bg-gray-50 transition-colors group flex gap-3 ${!n.read ? 'bg-brand/5' : ''}`}
                    >
                      <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${!n.read ? 'bg-brand' : 'bg-transparent'}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-relaxed ${!n.read ? 'text-ocean-900 font-bold' : 'text-gray-500'}`}>
                          {n.message}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-1 font-medium">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!n.read && (
                          <button 
                            onClick={() => markAsRead(n.id)}
                            className="p-1.5 bg-white shadow-sm border border-gray-100 rounded-lg text-brand hover:bg-brand hover:text-white transition-all"
                            title="Mark as read"
                          >
                            <Check size={12} />
                          </button>
                        )}
                        <button 
                          onClick={() => deleteNotification(n.id)}
                          className="p-1.5 bg-white shadow-sm border border-gray-100 rounded-lg text-red-500 hover:bg-red-500 hover:text-white transition-all"
                          title="Delete"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-center px-6">
                  <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mb-3 text-gray-200">
                    <Bell size={24} />
                  </div>
                  <p className="font-bold text-ocean-900 text-sm">All caught up!</p>
                  <p className="text-xs text-gray-400 mt-1">No new notifications at the moment.</p>
                </div>
              )}
            </div>

            {notifications.length > 0 && (
              <div className="p-4 bg-gray-50/50 text-center">
                <Link 
                  href="/notifications" 
                  onClick={() => setIsOpen(false)}
                  className="text-xs font-bold text-gray-500 hover:text-brand transition-colors"
                >
                  See all notifications
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
