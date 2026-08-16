"use client"

import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react"
import type { Session, SupabaseClient, User } from "@supabase/supabase-js"

import { createClient } from "@/lib/supabase/client"

interface SupabaseContextValue {
  supabase: SupabaseClient
  session: Session | null
  user: User | null
  isLoading: boolean
}

const SupabaseContext = createContext<SupabaseContextValue | undefined>(undefined)

const subscribeToHydration = () => () => undefined
const getClientSnapshot = () => true
const getServerSnapshot = () => false

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState(() => createClient())
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const loadSession = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        if (mounted) {
          setSession(data.session ?? null)
          setIsLoading(false)
        }
      } catch {
        if (mounted) {
          setSession(null)
          setIsLoading(false)
        }
      }
    }

    void loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setIsLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase])

  const value = useMemo(
    () => ({
      supabase,
      session,
      user: session?.user ?? null,
      isLoading,
    }),
    [isLoading, session, supabase],
  )

  return <SupabaseContext.Provider value={value}>{children}</SupabaseContext.Provider>
}

export function useSupabase() {
  const context = useContext(SupabaseContext)
  const hasHydrated = useSyncExternalStore(subscribeToHydration, getClientSnapshot, getServerSnapshot)

  if (!context) {
    throw new Error("useSupabase must be used within a SupabaseProvider")
  }

  if (!hasHydrated) {
    return { ...context, session: null, user: null, isLoading: true }
  }

  return context
}
