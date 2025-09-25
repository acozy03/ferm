"use client"

import type { ReactNode } from "react"

import { SupabaseProvider } from "@/components/supabase-provider"

export function Providers({ children }: { children: ReactNode }) {
  return <SupabaseProvider>{children}</SupabaseProvider>
}
