import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ISO_8601_UTC_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type CursorPayload = { created_at: string; id: string }

// Cursor format (base64url JSON): {"created_at":"...","id":"..."}
// Legacy format (fallback): `${created_at}|${id}`
function parseCursor(cursor: string | null): { cursor: CursorPayload | null; error: string | null } {
  if (!cursor) return { cursor: null, error: null }

  let parsed: CursorPayload | null = null

  try {
    const decoded = Buffer.from(cursor, "base64url").toString("utf8")
    const json = JSON.parse(decoded) as Partial<CursorPayload> | null
    if (json && typeof json === "object" && typeof json.created_at === "string" && typeof json.id === "string") {
      parsed = { created_at: json.created_at, id: json.id }
    }
  } catch {
    // Ignore base64/json errors and fall back to legacy parsing below.
  }

  if (!parsed) {
    const [created_at, id] = cursor.split("|")
    if (created_at && id) {
      parsed = { created_at, id }
    }
  }

  if (!parsed) {
    return { cursor: null, error: "Invalid cursor format." }
  }

  if (!ISO_8601_UTC_REGEX.test(parsed.created_at)) {
    return { cursor: null, error: "Invalid cursor created_at; expected strict ISO-8601 format." }
  }

  if (!UUID_REGEX.test(parsed.id)) {
    return { cursor: null, error: "Invalid cursor id; expected UUID format." }
  }

  return { cursor: parsed, error: null }
}

function makeCursor(row: CursorPayload) {
  return Buffer.from(JSON.stringify({ created_at: row.created_at, id: row.id }), "utf8").toString("base64url")
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

    const { cursor, error: cursorError } = parseCursor(searchParams.get("cursor"))
    if (cursorError) {
      return NextResponse.json({ error: cursorError }, { status: 400 })
    }

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
      query = query.or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`)
    }

    const { data, error, count } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const activities = data ?? []
    const nextCursor =
      activities.length === limit
        ? makeCursor({
            created_at: activities[activities.length - 1].created_at,
            id: activities[activities.length - 1].id,
          })
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
