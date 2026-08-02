// app/api/auth/check-email/route.ts
import { NextResponse, type NextRequest } from "next/server"
import { getAuthedClient, requireCookieCsrf } from "@/lib/api/auth"
import { checkEmailRateLimit } from "@/lib/rate-limit"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"

interface RequestBody {
  email?: string
}

function getClientIdentifier(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")
  const ip = forwardedFor?.split(",")[0]?.trim()
  return ip || request.headers.get("cf-connecting-ip") || request.headers.get("x-real-ip") || "unknown"
}

function hasTrustedSecret(request: NextRequest) {
  const secret = process.env.CHECK_EMAIL_API_SECRET
  if (!secret) {
    return false
  }

  return request.headers.get("x-check-email-secret") === secret
}

export async function POST(request: NextRequest) {
  const hasSecret = hasTrustedSecret(request)

  if (!hasSecret) {
    const csrfError = requireCookieCsrf(request)
    if (csrfError) {
      return NextResponse.json({ error: csrfError.error.message }, { status: csrfError.error.status })
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
  const identifier = getClientIdentifier(request)
  const rateLimitKey = `${identifier}:${emailLower}`
  const rateLimitResult = await checkEmailRateLimit(rateLimitKey)

  if (!rateLimitResult.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 })
  }

  if (!hasSecret) {
    const auth = await getAuthedClient(request)
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error.message }, { status: auth.error.status })
    }
  }

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
      })

      if (error) {
        throw error
      }

      const found = data.users.find((user) => (user.email ?? "").toLowerCase() === emailLower)
      if (found) {
        exists = true
        break
      }

      if (!data.nextPage || page >= data.lastPage) {
        break
      }

      page = data.nextPage
    }

    void exists
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Unable to verify email" }, { status: 500 })
  }
}
