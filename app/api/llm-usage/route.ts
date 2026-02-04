// app/api/llm-usage/route.ts
import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { createClient } from "@supabase/supabase-js"

const DAILY_LIMIT = 20
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean)

const baseCorsHeaders = {
  "Access-Control-Allow-Methods": "GET, OPTIONS",
}

function getCorsHeaders(origin: string | null) {
  const headers: Record<string, string> = {
    ...baseCorsHeaders,
    "Access-Control-Allow-Headers": "content-type",
  }

  if (origin && allowedOrigins.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin
    headers["Access-Control-Allow-Headers"] = "authorization, content-type"
    headers["Vary"] = "Origin"
  }

  return headers
}

export async function OPTIONS() {
  const origin = headers().get("origin")
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(origin) })
}

export async function GET() {
  try {
    const hdrs = headers()
    const corsHeaders = getCorsHeaders(hdrs.get("origin"))
    const authHeader = hdrs.get("authorization") || ""
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 401, headers: corsHeaders })
    }

    // 1) Validate token with Supabase Auth
    const userResp = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    })

    if (!userResp.ok) {
      const detail = await userResp.text()
      return NextResponse.json({ error: "Invalid token", detail }, { status: 401, headers: corsHeaders })
    }

    const user = await userResp.json() as { id: string }
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders })
    }

    // 2) Create a Supabase client bound to THIS token so RLS works
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: { Authorization: `Bearer ${token}` },
        },
      }
    )

    // 3) Do the query as the authed user
    const today = new Date().toISOString().split("T")[0]
    const { data, error } = await supabase
      .from("llm_usage")
      .select("job_scrapes_count")
      .eq("user_id", user.id)
      .eq("date", today)
      .single()

    // PGRST116 = no rows
    if (error && error.code !== "PGRST116") {
      console.error("Database error fetching LLM usage:", error)
      return NextResponse.json({ error: "Database error" }, { status: 500, headers: corsHeaders })
    }

    const jobScrapesCount = data?.job_scrapes_count ?? 0
    const remaining = Math.max(0, DAILY_LIMIT - jobScrapesCount)

    return NextResponse.json(
      { job_scrapes_count: jobScrapesCount, limit: DAILY_LIMIT, remaining },
      { headers: corsHeaders },
    )
  } catch (e: unknown) {
    console.error("llm-usage handler error:", e)
    return NextResponse.json({ error: "Server error" }, { status: 500, headers: corsHeaders })
  }
}
