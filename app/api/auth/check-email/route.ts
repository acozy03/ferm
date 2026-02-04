// app/api/auth/check-email/route.ts
import { NextResponse, type NextRequest } from "next/server"
import { getAuthedClient } from "@/lib/api/auth"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"

interface RequestBody {
  email?: string
}

type RateLimitEntry = {
  count: number
  resetAt: number
}

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const RATE_LIMIT_MAX_ATTEMPTS = 10
const rateLimitStore = new Map<string, RateLimitEntry>()

function getClientIdentifier(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")
  const ip = forwardedFor?.split(",")[0]?.trim()
  return (
    ip ||
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    "unknown"
  )
}

function isRateLimited(request: NextRequest) {
  const identifier = getClientIdentifier(request)
  const now = Date.now()
  const entry = rateLimitStore.get(identifier)

  if (!entry || entry.resetAt <= now) {
    rateLimitStore.set(identifier, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  if (entry.count >= RATE_LIMIT_MAX_ATTEMPTS) {
    return true
  }

  entry.count += 1
  return false
}

function hasTrustedSecret(request: NextRequest) {
  const secret = process.env.CHECK_EMAIL_API_SECRET
  if (!secret) {
    return false
  }

  return request.headers.get("x-check-email-secret") === secret
}

export async function POST(request: NextRequest) {
  if (isRateLimited(request)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 })
  }

  if (!hasTrustedSecret(request)) {
    const auth = await getAuthedClient(request)
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error.message }, { status: auth.error.status })
    }
  }

  let body: RequestBody

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const email = typeof body.email === "string" ? body.email.trim() : ""
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 })
  }

  const emailLower = email.toLowerCase()

  const perPage = 200
  const maxPages = 50

  try {
    const supabase = createAdminSupabaseClient()

    let page = 1
    let exists = false

    for (let i = 0; i < maxPages; i++) {
      const { data, error } = await supabase.auth.admin.listUsers({
        page,
        perPage,
        emailFilter: email,
      })

      if (error) {
        throw error
      }

      const found = data.users.find(
        (user) => (user.email ?? "").toLowerCase() === emailLower,
      )
      if (found) {
        exists = true
        break
      }

      if (!data.nextPage || page >= data.lastPage) {
        break
      }

      page = data.nextPage
    }

    return NextResponse.json({ exists })
  } catch {
    return NextResponse.json({ error: "Unable to verify email" }, { status: 500 })
  }
}
