// app/api/job-applications/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"
import type { CreateJobApplicationData } from "@/lib/types/database"
import { toNullableString } from "@/lib/utils"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // tighten to your extension origin if you want
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

/**
 * Helper: authenticate via Bearer (extension) OR cookies (web app),
 * and return a Supabase client bound to the user + the user's id.
 */
async function getAuthedClient(request: NextRequest) {
  const authHeader = request.headers.get("authorization") || ""
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""

  if (bearer) {
    // Validate the token with Supabase Auth
    const userResp = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${bearer}`,
      },
      cache: "no-store",
    })

    if (!userResp.ok) {
      return { error: { status: 401, message: "Unauthorized (invalid token)" } as const }
    }

    const user = (await userResp.json()) as { id: string }
    if (!user?.id) {
      return { error: { status: 401, message: "Unauthorized (no user id)" } as const }
    }

    // Bind client to this token so RLS evaluates as the user
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${bearer}` } } }
    )

    return { supabase, userId: user.id } as const
  }

  // Fall back to cookie-based auth (SSR/CSR session)
  const cookieClient = await createServerSupabaseClient()
  const {
    data: { user },
    error,
  } = await cookieClient.auth.getUser()

  if (error || !user) {
    return { error: { status: 401, message: "Unauthorized" } as const }
  }

  return { supabase: cookieClient, userId: user.id } as const
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthedClient(request)
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error.message }, { status: auth.error.status, headers: corsHeaders })
    }

    const { supabase, userId } = auth
    const { searchParams } = new URL(request.url)

    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const include_interviews = searchParams.get("include_interviews") === "true"
    const include_activity = searchParams.get("include_activity") === "true"

    // Filters
    const status = searchParams.get("status")?.split(",")
    const priority = searchParams.get("priority")?.split(",")
    const company_name = searchParams.get("company_name")
    const search = searchParams.get("search")
    const date_from = searchParams.get("date_from")
    const date_to = searchParams.get("date_to")

    // Sort
    const sort_field = searchParams.get("sort_field") || "created_at"
    const sort_direction = (searchParams.get("sort_direction") || "desc").toLowerCase() === "asc" ? "asc" : "desc"

    let query = supabase
      .from("job_applications")
      .select(
        `
        *
        ${include_interviews ? ", interviews(*)" : ""}
        ${include_activity ? ", activity_log(*)" : ""}
      `,
        { count: "exact" }
      )
      // belt-and-suspenders: still filter by user_id even with RLS
      .eq("user_id", userId)

    if (status && status.length > 0) query = query.in("status", status)
    if (priority && priority.length > 0) query = query.in("priority", priority)
    if (company_name) query = query.ilike("company_name", `%${company_name}%`)

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
        ].join(",")
      )
    }

    if (date_from) query = query.gte("application_date", date_from)
    if (date_to) query = query.lte("application_date", date_to)

    const { data, error, count } = await query
      .order(sort_field, { ascending: sort_direction === "asc" })
      .range((page - 1) * limit, page * limit - 1)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders })
    }

    return NextResponse.json(
      {
        data,
        count,
        page,
        limit,
        total_pages: Math.ceil((count || 0) / limit),
      },
      { headers: corsHeaders }
    )
  } catch (error) {
    console.error("Failed to load job applications", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthedClient(request)
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error.message }, { status: auth.error.status, headers: corsHeaders })
    }

    const { supabase, userId } = auth
    const body: CreateJobApplicationData = await request.json()

    // Force user_id from server (never trust client)
    const insertData = {
      ...body,
      user_id: userId,
      location: toNullableString(body.location ?? null),
      salary_range: toNullableString(body.salary_range ?? null),
      notes: toNullableString(body.notes ?? null),
      job_url: toNullableString(body.job_url ?? null),
      contact_email: toNullableString(body.contact_email ?? null),
      contact_person: toNullableString(body.contact_person ?? null),
      job_description: toNullableString(body.job_description ?? null),
      qualifications: toNullableString(body.qualifications ?? null),
      job_responsibilities: toNullableString(body.job_responsibilities ?? null),
    }

    const { data, error } = await supabase.from("job_applications").insert([insertData]).select().single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders })
    }

    return NextResponse.json({ data }, { status: 201, headers: corsHeaders })
  } catch (error) {
    console.error("Failed to create job application", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders })
  }
}
