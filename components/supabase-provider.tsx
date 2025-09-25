"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import type { Session, SupabaseClient, User } from "@supabase/supabase-js"

import { createClient } from "@/lib/supabase/client"

interface SupabaseContextValue {
  supabase: SupabaseClient
  session: Session | null
  user: User | null
  isLoading: boolean
}

const SupabaseContext = createContext<SupabaseContextValue | undefined>(undefined)

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState(() => createClient())
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session ?? null)
        setIsLoading(false)
      }
    })

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

  if (!context) {
    throw new Error("useSupabase must be used within a SupabaseProvider")
  }

  return context
}
