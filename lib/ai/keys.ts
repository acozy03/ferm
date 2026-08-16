import { NextResponse } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto"

export const USER_OPENAI_KEY_HEADER = "x-user-openai-key"
const PROVIDER = "openai"
const ENCRYPTION_ALGORITHM = "aes-256-gcm"
const AUTH_TAG_LENGTH = 16

type UserAiKeyRow = {
  user_id: string
  provider: string
  encrypted_api_key: string | null
  encryption_iv: string | null
}

type AiKeysDatabase = {
  public: {
    Tables: {
      user_ai_keys: {
        Row: UserAiKeyRow
        Insert: UserAiKeyRow
        Update: Partial<UserAiKeyRow>
        Relationships: []
      }
    }
    Views: Record<never, never>
    Functions: Record<never, never>
    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
}

type AiKeysSupabaseClient = SupabaseClient<AiKeysDatabase>

export function normalizeApiKey(raw: string | null): string | null {
  if (!raw) return null
  const value = raw.trim()
  if (value.length < 20) return null
  if (!/^[A-Za-z0-9._:-]+$/.test(value)) return null
  return value
}

function getEncryptionKey(): Buffer | null {
  const secret = process.env.AI_KEY_ENCRYPTION_SECRET
  if (!secret) return null
  return createHash("sha256").update(secret).digest()
}

export function encryptApiKey(apiKey: string): { encryptedApiKey: string; encryptionIv: string } {
  const key = getEncryptionKey()
  if (!key) {
    throw new Error("AI_KEY_ENCRYPTION_SECRET is not configured.")
  }

  const iv = randomBytes(12)
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(apiKey, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()
  const payload = Buffer.concat([encrypted, authTag])

  return {
    encryptedApiKey: payload.toString("base64"),
    encryptionIv: iv.toString("base64"),
  }
}

export function decryptApiKey(encryptedApiKey: string, encryptionIv: string): string | null {
  const key = getEncryptionKey()
  if (!key) return null

  try {
    const iv = Buffer.from(encryptionIv, "base64")
    const payload = Buffer.from(encryptedApiKey, "base64")
    if (payload.length <= AUTH_TAG_LENGTH) return null

    const authTag = payload.subarray(payload.length - AUTH_TAG_LENGTH)
    const ciphertext = payload.subarray(0, payload.length - AUTH_TAG_LENGTH)
    const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
    return decrypted.toString("utf8")
  } catch (error) {
    console.error("Failed to decrypt stored AI key", error)
    return null
  }
}

async function fetchStoredKey(supabase: AiKeysSupabaseClient | null, userId: string | null): Promise<string | null> {
  if (!supabase || !userId) return null

  const { data, error } = await supabase
    .from("user_ai_keys")
    .select("encrypted_api_key, encryption_iv")
    .eq("user_id", userId)
    .eq("provider", PROVIDER)
    .maybeSingle()

  if (error) {
    console.error("Failed to load stored AI key", { code: error.code })
    return null
  }

  if (!data?.encrypted_api_key || !data?.encryption_iv) return null

  const decrypted = decryptApiKey(data.encrypted_api_key, data.encryption_iv)
  return normalizeApiKey(decrypted)
}

type ResolvedKey = { apiKey: string; isUserProvided: boolean }
type ResolvedKeys = { userKey: string | null; sharedKey: string | null }

export async function resolveOpenAIKeys({
  request,
  supabase,
  userId,
}: {
  request: Request
  supabase?: AiKeysSupabaseClient | null
  userId?: string | null
}): Promise<ResolvedKeys> {
  const headerKey = normalizeApiKey(request.headers.get(USER_OPENAI_KEY_HEADER))
  if (headerKey) {
    return { userKey: headerKey, sharedKey: normalizeApiKey(process.env.OPENAI_API_KEY ?? null) }
  }

  const storedKey = await fetchStoredKey(supabase ?? null, userId ?? null)
  if (storedKey) {
    return { userKey: storedKey, sharedKey: normalizeApiKey(process.env.OPENAI_API_KEY ?? null) }
  }

  return { userKey: null, sharedKey: normalizeApiKey(process.env.OPENAI_API_KEY ?? null) }
}

export async function resolveOpenAIApiKey({
  request,
  supabase,
  userId,
}: {
  request: Request
  supabase?: AiKeysSupabaseClient | null
  userId?: string | null
}): Promise<ResolvedKey | { error: NextResponse }> {
  const { userKey, sharedKey } = await resolveOpenAIKeys({
    request,
    supabase,
    userId,
  })

  if (userKey) {
    return { apiKey: userKey, isUserProvided: true }
  }

  if (sharedKey) {
    return { apiKey: sharedKey, isUserProvided: false }
  }

  return {
    error: NextResponse.json({ error: "The service is not configured with an OpenAI API key." }, { status: 500 }),
  }
}

export type { ResolvedKey, ResolvedKeys }
