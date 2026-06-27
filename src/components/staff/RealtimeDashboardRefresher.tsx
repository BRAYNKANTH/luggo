'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface RealtimeDashboardRefresherProps {
  hubId: string
}

export function RealtimeDashboardRefresher({ hubId }: RealtimeDashboardRefresherProps) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    
    const playChime = () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
        
        // Premium soft dual-tone chime (E5 -> A5)
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        
        osc.connect(gain)
        gain.connect(ctx.destination)
        
        osc.type = 'sine'
        osc.frequency.setValueAtTime(659.25, ctx.currentTime) // E5 note
        osc.frequency.exponentialRampToValueAtTime(880.00, ctx.currentTime + 0.12) // A5 note
        
        gain.gain.setValueAtTime(0.15, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.7)
        
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.7)
      } catch (err) {
        console.warn('Audio play blocked or unsupported:', err)
      }
    }

    const channel = supabase
      .channel(`staff-hub-changes-${hubId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `hub_id=eq.${hubId}`
        },
        (payload) => {
          console.log('[Realtime] Hub booking change received:', payload)
          playChime()
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel).catch(console.error)
    }
  }, [hubId, router])

  return null
}
