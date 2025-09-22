import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import type { Family } from '../services/dataService'
import { dataService } from '../services/dataService'

type MembershipRow = {
  family_id: number
  role: string | null
  name: string | null
  families?: Family | null
}

type AuthContextValue = {
  session: Session | null
  user: User | null
  family: Family | null
  membership: MembershipRow | null
  loading: boolean
  membershipLoading: boolean
  membershipError: string | null
  isAuthenticated: boolean
  signIn: (credentials: { email: string; password: string }) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshMembership: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const defaultValue: AuthContextValue = {
  session: null,
  user: null,
  family: null,
  membership: null,
  loading: true,
  membershipLoading: true,
  membershipError: null,
  isAuthenticated: false,
  signIn: async () => ({ error: 'Not initialised' }),
  signOut: async () => undefined,
  refreshMembership: async () => undefined,
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [family, setFamily] = useState<Family | null>(null)
  const [membership, setMembership] = useState<MembershipRow | null>(null)
  const [membershipLoading, setMembershipLoading] = useState<boolean>(false)
  const [membershipError, setMembershipError] = useState<string | null>(null)
  const [initialising, setInitialising] = useState<boolean>(true)

  useEffect(() => {
    let isMounted = true

    const initialise = async () => {
      try {
        const { data } = await supabase.auth.getSession()

        if (!isMounted) {
          return
        }

        setSession(data.session)
        setUser(data.session?.user ?? null)
      } catch (error) {
        console.error('Unable to load session', error)
      } finally {
        if (isMounted) {
          setInitialising(false)
        }
      }
    }

    initialise()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
    })

    return () => {
      isMounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const loadMembership = useCallback(async (currentUser: User | null) => {
    if (!currentUser) {
      setMembership(null)
      setFamily(null)
      dataService.configure({
        familyId: null,
        authorId: null,
        authorName: null,
        authorRole: null,
      })
      return
    }

    setMembershipLoading(true)
    setMembershipError(null)

    const { data, error } = await supabase
      .from('family_members')
      .select(`
        family_id,
        role,
        name,
        families:families ( id, name, created_at )
      `)
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle<MembershipRow & { families: Family | null }>()

    if (error) {
      if (error.code !== 'PGRST116') {
        console.error('Unable to load family membership', error)
        setMembershipError(error.message)
      }

      setMembership(null)
      setFamily(null)
      dataService.configure({
        familyId: null,
        authorId: currentUser.id,
        authorName: currentUser.email ?? null,
        authorRole: null,
      })
      setMembershipLoading(false)
      return
    }

    const resolvedFamily = data?.families ?? null

    setMembership(data ?? null)
    setFamily(resolvedFamily)

    dataService.configure({
      familyId: data?.family_id ?? null,
      authorId: currentUser.id,
      authorName: data?.name ?? currentUser.email ?? null,
      authorRole: data?.role ?? null,
    })

    setMembershipLoading(false)
  }, [])

  useEffect(() => {
    loadMembership(user)
  }, [user, loadMembership])

  const signIn = useCallback(async ({ email, password }: { email: string; password: string }) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        return { error: error.message }
      }

      return { error: null }
    } catch (error) {
      console.error('Sign-in failed', error)
      return { error: 'Unexpected error while signing in' }
    }
  }, [])

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Sign-out failed', error)
    }
  }, [])

  const refreshMembership = useCallback(async () => {
    await loadMembership(user)
  }, [loadMembership, user])

  const value = useMemo<AuthContextValue>(() => {
    const isAuthenticated = Boolean(session?.user)
    const loading = initialising || (isAuthenticated && membershipLoading)

    return {
      session,
      user,
      family,
      membership,
      loading,
      membershipLoading,
      membershipError,
      isAuthenticated,
      signIn,
      signOut,
      refreshMembership,
    }
  }, [session, user, family, membership, initialising, membershipLoading, membershipError, signIn, signOut, refreshMembership])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    return defaultValue
  }

  return context
}
