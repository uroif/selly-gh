'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SessionUser, UserRole } from '@/types'

interface AuthState {
  user: SessionUser | null
  loading: boolean
  error: string | null
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  })
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    
    const getUser = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError || !user) {
          setState({ user: null, loading: false, error: null })
          return
        }

        
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, username, role')
          .eq('id', user.id)
          .single()

        if (profileError || !profile) {
          console.error('[useAuth] Profile fetch failed:', profileError)
          setState({ user: null, loading: false, error: 'Profile not found' })
          return
        }

        setState({
          user: {
            id: profile.id,
            username: profile.username,
            role: profile.role as UserRole,
          },
          loading: false,
          error: null,
        })
      } catch (err) {
        console.error('[useAuth] Error in getUser:', err)
        setState({
          user: null,
          loading: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    getUser()

    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      
      async (event: any, session: any) => {
        if (event === 'SIGNED_OUT' || !session) {
          setState({ user: null, loading: false, error: null })
          router.push('/login')
        } else if (event === 'SIGNED_IN' && session) {
          
          getUser()
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setState({ user: null, loading: false, error: null })
    router.push('/login')
  }

  return {
    user: state.user,
    loading: state.loading,
    error: state.error,
    signOut,
    isOwner: state.user?.role === 'owner',
    isStaff: state.user?.role === 'staff',
  }
}
