// app/api/auth/check-email/route.ts
import { NextResponse } from "next/server"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"

interface RequestBody {
  email?: string
}

export async function POST(request: Request) {
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
    let matchedUser: {
      id?: string
      email?: string | null
      created_at?: string
      confirmed_at?: string | null
      last_sign_in_at?: string | null
    } | null = null

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
        (u) => (u.email ?? "").toLowerCase() === emailLower,
      )
      if (found) {
        exists = true
        matchedUser = {
          id: found.id,
          email: found.email ?? null,
          created_at: (found as any).created_at,
          confirmed_at: (found as any).confirmed_at ?? null,
          last_sign_in_at: (found as any).last_sign_in_at ?? null,
        }
        break
      }

      if (!data.nextPage || page >= data.lastPage) {
        break
      }

      page = data.nextPage
    }

    return NextResponse.json({
      exists,
      matchedUser,
    })
  } catch {
    return NextResponse.json({ error: "Unable to verify email" }, { status: 500 })
  }
}
