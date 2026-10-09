"use client"

import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export function Dialog({ open, onClose, title, children, className, dismissible = true }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; className?: string; dismissible?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current
    if (!dialog || !open) return
    const previousOverflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    return () => { dialog.close(); document.body.style.overflow = previousOverflow }
  }, [open])
  return (
    <dialog ref={ref} aria-labelledby={titleId}
      onCancel={event => { event.preventDefault(); if (dismissible) onClose() }}
      onClick={event => {
        if (!dismissible || event.target !== event.currentTarget) return
        const bounds = event.currentTarget.getBoundingClientRect()
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose()
      }}
      className={cn('app-dialog m-auto w-[calc(100%_-_2rem)] max-w-lg max-h-[85dvh] overflow-y-auto overscroll-contain rounded-3xl bg-white p-0 text-ocean-900 shadow-2xl', className)}>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-white px-6 py-4 border-b border-gray-100">
        <h2 id={titleId} className="text-xl font-bold min-w-0 break-words">{title}</h2>
        <button type="button" aria-label={`Close ${title.toLowerCase()}`} disabled={!dismissible} onClick={onClose}
          className="min-h-11 min-w-11 flex shrink-0 items-center justify-center rounded-xl text-gray-600 hover:bg-gray-100 disabled:opacity-40"><X size={22} /></button>
      </div>
      <div className="p-6">{children}</div>
    </dialog>
  )
}
