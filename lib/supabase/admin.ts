import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let cachedClient: SupabaseClient | null = null

export function createAdminSupabaseClient() {
  if (cachedClient) {
    return cachedClient
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase admin credentials are not configured")
  }

  cachedClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return cachedClient
}
