/**
 * Arkiv — Auth Hook
 *
 * Wraps Supabase Auth for sign-up, sign-in, sign-out, and session listening.
 * Auth state is kept in a simple Zustand slice alongside the main store.
 */

import { useEffect, useCallback } from "react"
import { create } from "zustand"
import { supabase } from "@/lib/supabase"
import type { User, Session } from "@supabase/supabase-js"

// ---------------------------------------------------------------------------
// Auth Store (separate from shelf store — auth is orthogonal)
// ---------------------------------------------------------------------------

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  setAuth: (user: User | null, session: Session | null) => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,
  setAuth: (user, session) => set({ user, session, loading: false }),
  setLoading: (loading) => set({ loading }),
}))

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth() {
  const { user, session, loading, setAuth, setLoading } = useAuthStore()

  const getEmailRedirectTo = useCallback(() => {
    if (typeof window === "undefined") return undefined
    return new URL("/login", window.location.origin).toString()
  }, [])

  /**
   * Listen for auth state changes (sign-in, sign-out, token refresh).
   * Call this once in the app root.
   */
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuth(session?.user ?? null, session)
    })

    // Subscribe to changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setAuth(session?.user ?? null, session)
      }
    )

    return () => subscription.unsubscribe()
  }, [setAuth])

  /**
   * Sign up with email and password.
   */
  const signUp = useCallback(async (email: string, password: string) => {
    setLoading(true)
    try {
      const emailRedirectTo = getEmailRedirectTo()
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: emailRedirectTo ? { emailRedirectTo } : undefined,
      })
      if (error) throw error
      return data
    } finally {
      setLoading(false)
    }
  }, [getEmailRedirectTo, setLoading])

  /**
   * Sign in with email and password.
   */
  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      return data
    } finally {
      setLoading(false)
    }
  }, [setLoading])

  /**
   * Sign out the current user.
   */
  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [])

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  }
}
