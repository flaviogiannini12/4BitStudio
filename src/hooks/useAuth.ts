import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { cloudEnabled, supabase } from '../lib/supabase'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(cloudEnabled)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    void supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null)
      setLoading(false)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  return { user, loading, cloudEnabled }
}
