import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 401 })
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { searchParams } = new URL(request.url)

    const limit = Number.parseInt(searchParams.get("limit") || "50")

    const { data, error } = await supabase
      .from("activity_log")
      .select(`
        *,
        job_applications(company_name, position_title)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Failed to load activity log", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
