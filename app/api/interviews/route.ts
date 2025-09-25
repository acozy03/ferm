import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { CreateInterviewData } from "@/lib/types/database"

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

    const job_application_id = searchParams.get("job_application_id")
    const upcoming_only = searchParams.get("upcoming_only") === "true"

    let query = supabase
      .from("interviews")
      .select(`
        *,
        job_applications(company_name, position_title)
      `)
      .eq("user_id", user.id)

    if (job_application_id) {
      query = query.eq("job_application_id", job_application_id)
    }

    if (upcoming_only) {
      query = query.gte("scheduled_date", new Date().toISOString()).eq("status", "Scheduled")
    }

    const { data, error } = await query.order("scheduled_date", { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Failed to load interviews", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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
    const body: CreateInterviewData = await request.json()

    const { data, error } = await supabase
      .from("interviews")
      .insert([{ ...body, user_id: user.id }])
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error("Failed to create interview", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
