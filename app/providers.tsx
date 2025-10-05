"use client"

import type { ReactNode } from "react"

import { SupabaseProvider } from "@/components/supabase-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { SettingsProvider } from "@/components/settings-provider"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <SettingsProvider>
        <SupabaseProvider>{children}</SupabaseProvider>
      </SettingsProvider>
    </ThemeProvider>
  )
}
