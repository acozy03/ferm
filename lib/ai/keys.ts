import { NextResponse } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"

export const USER_OPENAI_KEY_HEADER = "x-user-openai-key"
const PROVIDER = "openai"

function sanitizeKey(raw: string | null): string | null {
  if (!raw) return null
  const value = raw.trim()
  if (value.length < 20) return null
  if (!/^[A-Za-z0-9._:-]+$/.test(value)) return null
  return value
}

async function fetchStoredKey(
  supabase: SupabaseClient<unknown, "public", unknown> | null,
  userId: string | null,
): Promise<string | null> {
  if (!supabase || !userId) return null

  const { data, error } = await supabase
    .from("user_ai_keys")
    .select("encrypted_api_key")
    .eq("user_id", userId)
    .eq("provider", PROVIDER)
    .maybeSingle()

  if (error) {
    console.error("Failed to load stored AI key", { code: error.code })
    return null
  }

  const stored = sanitizeKey(data?.encrypted_api_key ?? null)
  return stored
}

type ResolvedKey = { apiKey: string; isUserProvided: boolean }

export async function resolveOpenAIApiKey({
  request,
  supabase,
  userId,
}: {
  request: Request
  supabase?: SupabaseClient<unknown, "public", unknown> | null
  userId?: string | null
}): Promise<ResolvedKey | { error: NextResponse }> {
  const headerKey = sanitizeKey(request.headers.get(USER_OPENAI_KEY_HEADER))
  if (headerKey) {
    return { apiKey: headerKey, isUserProvided: true }
  }

  const storedKey = await fetchStoredKey(supabase ?? null, userId ?? null)
  if (storedKey) {
    return { apiKey: storedKey, isUserProvided: true }
  }

  const envKey = sanitizeKey(process.env.OPENAI_API_KEY ?? null)
  if (envKey) {
    return { apiKey: envKey, isUserProvided: false }
  }

  return {
    error: NextResponse.json(
      { error: "The service is not configured with an OpenAI API key." },
      { status: 500 },
    ),
  }
}

export type { ResolvedKey }
