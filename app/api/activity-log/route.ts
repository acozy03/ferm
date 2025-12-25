import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Cursor format: `${created_at}|${id}`
// Example: 2025-12-24T12:34:56.789Z|a9939d4d-7082-47f1-b60f-76f0721fe2f5
function parseCursor(cursor: string | null) {
  if (!cursor) return null
  const [created_at, id] = cursor.split("|")
  if (!created_at || !id) return null
  return { created_at, id }
}

function makeCursor(row: { created_at: string; id: string }) {
  return `${row.created_at}|${row.id}`
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) return NextResponse.json({ error: authError.message }, { status: 401 })
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(request.url)

    const limitRaw = Number.parseInt(searchParams.get("limit") || "50", 10)
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 50

    const cursor = parseCursor(searchParams.get("cursor"))

    let query = supabase
      .from("activity_log")
      .select(
        `
          *,
          job_applications(company_name, position_title)
        `,
        { count: "exact" },
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit)

    // If cursor is provided, fetch items *older than* the cursor using (created_at, id) as a tie-breaker
    if (cursor) {
      // PostgREST OR syntax:
      // (created_at < cursor.created_at) OR (created_at == cursor.created_at AND id < cursor.id)
      query = query.or(
        `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`,
      )
    }

    const { data, error, count } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const activities = data ?? []
    const nextCursor =
      activities.length === limit
        ? makeCursor({ created_at: activities[activities.length - 1].created_at, id: activities[activities.length - 1].id })
        : null

    return NextResponse.json(
      {
        activities,
        nextCursor,
        totalCount: count ?? activities.length,
      },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    console.error("Failed to load activity log", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
