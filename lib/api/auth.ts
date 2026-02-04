import { type NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"

import { createServerSupabaseClient } from "@/lib/supabase/server"

type SupabaseClientInstance = Awaited<ReturnType<typeof createServerSupabaseClient>>

type AuthSuccess = {
  supabase: SupabaseClientInstance
  userId: string
}

type AuthError = { error: { status: number; message: string } }

export type AuthedClientResult = AuthSuccess | AuthError

const SAFE_HTTP_METHODS = new Set(["GET", "HEAD", "OPTIONS"])
const CSRF_COOKIE_NAME = "csrf-token"
const CSRF_HEADER_NAME = "x-csrf-token"

// Expects a csrf-token cookie (minted server-side) that matches the x-csrf-token header.
export function requireCookieCsrf(request: NextRequest): AuthError | null {
  const authHeader = request.headers.get("authorization") || ""
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""

  if (bearer || SAFE_HTTP_METHODS.has(request.method)) {
    return null
  }

  const csrfHeader = request.headers.get(CSRF_HEADER_NAME) || ""
  const csrfCookie = request.cookies.get(CSRF_COOKIE_NAME)?.value || ""

  if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
    return { error: { status: 403, message: "Missing or invalid CSRF token." } }
  }

  return null
}

/**
 * Authenticate via Bearer (extension) OR cookies (web app),
 * and return a Supabase client bound to the user + the user's id.
 */
export async function getAuthedClient(request: NextRequest): Promise<AuthedClientResult> {
  const authHeader = request.headers.get("authorization") || ""
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""

  if (bearer) {
    const userResp = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${bearer}`,
      },
      cache: "no-store",
    })

    if (!userResp.ok) {
      return { error: { status: 401, message: "Unauthorized (invalid token)" } }
    }

    const user = (await userResp.json()) as { id?: string }
    if (!user?.id) {
      return { error: { status: 401, message: "Unauthorized (no user id)" } }
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${bearer}` } } },
    ) as unknown as SupabaseClientInstance

    return { supabase, userId: user.id }
  }

  const cookieClient = await createServerSupabaseClient()
  const {
    data: { user },
    error,
  } = await cookieClient.auth.getUser()

  if (error || !user) {
    return { error: { status: 401, message: "Unauthorized" } }
  }

  return { supabase: cookieClient, userId: user.id }
}
