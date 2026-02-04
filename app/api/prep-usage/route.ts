import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { createClient } from "@supabase/supabase-js"

const DAILY_LIMIT = 20
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const requestId = headers().get("x-request-id") ?? crypto.randomUUID()
  const withRequestId = (response: NextResponse) => {
    response.headers.set("X-Request-Id", requestId)
    return response
  }

  try {
    const hdrs = headers()
    const authHeader = hdrs.get("authorization") || ""
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""

    if (!token) {
      return withRequestId(NextResponse.json({ error: "Missing token" }, { status: 401 }))
    }

    const userResp = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    })

    if (!userResp.ok) {
      const detail = await userResp.text()
      console.error("Invalid token response from Supabase auth", { requestId, detail })
      return withRequestId(NextResponse.json({ error: "Invalid token" }, { status: 401 }))
    }

    const user = await userResp.json() as { id: string }
    if (!user?.id) {
      return withRequestId(NextResponse.json({ error: "Unauthorized" }, { status: 401 }))
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: { Authorization: `Bearer ${token}` },
        },
      },
    )

    const today = new Date().toISOString().split("T")[0]
    const { data, error } = await supabase
      .from("llm_usage")
      .select("prep_messages_count")
      .eq("user_id", user.id)
      .eq("date", today)
      .single()

    if (error && error.code !== "PGRST116") {
      console.error("Database error fetching prep usage:", { requestId, error })
      return withRequestId(NextResponse.json({ error: "Database error" }, { status: 500 }))
    }

    const prepMessagesCount = data?.prep_messages_count ?? 0
    const remaining = Math.max(0, DAILY_LIMIT - prepMessagesCount)

    return withRequestId(
      NextResponse.json({ prep_messages_count: prepMessagesCount, limit: DAILY_LIMIT, remaining }),
    )
  } catch (e: unknown) {
    console.error("prep-usage handler error:", { requestId, error: e })
    return withRequestId(NextResponse.json({ error: "Server error" }, { status: 500 }))
  }
}
