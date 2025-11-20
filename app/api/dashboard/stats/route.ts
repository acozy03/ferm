import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { getStatusStage } from "@/lib/status"

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

    const stageTotals = (statusData ?? []).reduce(
      (acc, app) => {
        const stage = getStatusStage(app.status)

        switch (stage) {
          case "applied":
            acc.applied += 1
            break
          case "interview":
            acc.interviews += 1
            break
          case "offer":
            acc.offers += 1
            break
          case "accepted":
            acc.accepted += 1
            break
          case "rejected":
            acc.rejected += 1
            break
          case "ghosted":
            acc.ghosted += 1
            break
          case "withdrawn":
            acc.withdrawn += 1
            break
          default:
            break
        }

        return acc
      },
      {
        applied: 0,
        interviews: 0,
        offers: 0,
        accepted: 0,
        rejected: 0,
        ghosted: 0,
        withdrawn: 0,
      },
    )

    // Get upcoming interviews count
    const { count: upcoming_interviews } = await supabase
      .from("interviews")
      .select("*", { count: "exact", head: true })
      .gte("scheduled_date", new Date().toISOString())
      .eq("status", "Scheduled")
      .eq("user_id", user.id)

    // Calculate response rate (interviews + offers + rejected) / total
    const responses = stageTotals.interviews + stageTotals.offers + stageTotals.rejected
    const response_rate = total_applications ? (responses / total_applications) * 100 : 0

    const stats = {
      total_applications: total_applications || 0,
      applied: stageTotals.applied,
      interviews: stageTotals.interviews,
      offers: stageTotals.offers,
      accepted: stageTotals.accepted,
      rejected: stageTotals.rejected,
      ghosted: stageTotals.ghosted,
      withdrawn: stageTotals.withdrawn,
      upcoming_interviews: upcoming_interviews || 0,
      response_rate: Math.round(response_rate * 100) / 100,
    }

    return NextResponse.json({ data: stats }, {
      headers: {
        "Cache-Control": "s-maxage=60, stale-while-revalidate=300",
      },
    })
  } catch (error) {
    console.error("Failed to load dashboard stats", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
