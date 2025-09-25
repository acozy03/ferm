import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { CreateJobApplicationData } from "@/lib/types/database"

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

    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const include_interviews = searchParams.get("include_interviews") === "true"
    const include_activity = searchParams.get("include_activity") === "true"

    // Parse filters
    const status = searchParams.get("status")?.split(",")
    const priority = searchParams.get("priority")?.split(",")
    const company_name = searchParams.get("company_name")
    const search = searchParams.get("search")
    const date_from = searchParams.get("date_from")
    const date_to = searchParams.get("date_to")

    // Parse sort
    const sort_field = searchParams.get("sort_field") || "created_at"
    const sort_direction = searchParams.get("sort_direction") || "desc"

    let query = supabase
      .from("job_applications")
      .select(
        `
        *
        ${include_interviews ? ", interviews(*)" : ""}
        ${include_activity ? ", activity_log(*)" : ""}
      `,
        { count: "exact" },
      )
      .eq("user_id", user.id)

    // Apply filters
    if (status && status.length > 0) {
      query = query.in("status", status)
    }
    if (priority && priority.length > 0) {
      query = query.in("priority", priority)
    }
    if (company_name) {
      query = query.ilike("company_name", `%${company_name}%`)
    }
    if (search) {
      const sanitizedSearch = search.replace(/,/g, "\\,")
      query = query.or(
        [
          `company_name.ilike.%${sanitizedSearch}%`,
          `position_title.ilike.%${sanitizedSearch}%`,
          `contact_person.ilike.%${sanitizedSearch}%`,
          `contact_email.ilike.%${sanitizedSearch}%`,
          `notes.ilike.%${sanitizedSearch}%`,
          `location.ilike.%${sanitizedSearch}%`,
        ].join(","),
      )
    }
    if (date_from) {
      query = query.gte("application_date", date_from)
    }
    if (date_to) {
      query = query.lte("application_date", date_to)
    }

    // Apply sorting and pagination
    const { data, error, count } = await query
      .order(sort_field, { ascending: sort_direction === "asc" })
      .range((page - 1) * limit, page * limit - 1)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      data,
      count,
      page,
      limit,
      total_pages: Math.ceil((count || 0) / limit),
    })
  } catch (error) {
    console.error("Failed to load job applications", error)
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
    const body: CreateJobApplicationData = await request.json()

    const insertData = {
      ...body,
      user_id: user.id,
    }

    const { data, error } = await supabase.from("job_applications").insert([insertData]).select().single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error("Failed to create job application", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
