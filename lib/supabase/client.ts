import { createBrowserClient } from "@supabase/ssr"

import { getSupabaseConfig } from "@/lib/supabase/config"

export function createClient() {
  const { url, anonKey } = getSupabaseConfig()

  return createBrowserClient(url, anonKey, {
    auth: {
      experimental: {
        appendPkceFlowIdToRedirects: true,
      },
    },
  })
}
