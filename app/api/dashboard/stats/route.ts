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

    const date_from = searchParams.get("date_from")
    const date_to = searchParams.get("date_to")

    // Get total applications count
    let totalQuery = supabase
      .from("job_applications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)

    if (date_from) totalQuery = totalQuery.gte("application_date", date_from)
    if (date_to) totalQuery = totalQuery.lte("application_date", date_to)

    const { count: total_applications } = await totalQuery

    // Get status counts
    let statusQuery = supabase.from("job_applications").select("status").eq("user_id", user.id)

    if (date_from) statusQuery = statusQuery.gte("application_date", date_from)
    if (date_to) statusQuery = statusQuery.lte("application_date", date_to)

    const { data: statusData } = await statusQuery

    const statusCounts =
      statusData?.reduce(
        (acc, app) => {
          acc[app.status] = (acc[app.status] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      ) || {}

    // Get upcoming interviews count
    const { count: upcoming_interviews } = await supabase
      .from("interviews")
      .select("*", { count: "exact", head: true })
      .gte("scheduled_date", new Date().toISOString())
      .eq("status", "Scheduled")
      .eq("user_id", user.id)

    // Calculate response rate (interviews + offers + rejected) / total
    const responses = (statusCounts.Interview || 0) + (statusCounts.Offer || 0) + (statusCounts.Rejected || 0)
    const response_rate = total_applications ? (responses / total_applications) * 100 : 0

    const stats = {
      total_applications: total_applications || 0,
      applied: statusCounts.Applied || 0,
      interviews: statusCounts.Interview || 0,
      offers: statusCounts.Offer || 0,
      accepted: statusCounts.Accepted || 0,
      rejected: statusCounts.Rejected || 0,
      withdrawn: statusCounts.Withdrawn || 0,
      upcoming_interviews: upcoming_interviews || 0,
      response_rate: Math.round(response_rate * 100) / 100,
    }

    return NextResponse.json({ data: stats })
  } catch (error) {
    console.error("Failed to load dashboard stats", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
