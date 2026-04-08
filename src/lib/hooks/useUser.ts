'use client'

import { useEffect, useState } from 'react'
import { type User } from '@supabase/supabase-js'
import { type Database } from '@/types/database'

type UserProfile = Database['public']['Tables']['users']['Row']

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch('/api/me', { cache: 'no-store' })
        const data = await res.json()
        setUser(data.user ?? null)
        setProfile(data.profile ?? null)
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [])

  return { user, profile, loading }
}
