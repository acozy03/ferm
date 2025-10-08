// app/api/job-applications/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"
import { z } from "zod"

import type { CreateJobApplicationData } from "@/lib/types/database"
import { getLatestResumeText } from "@/lib/resume/server"
import { toNullableString } from "@/lib/utils"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // tighten to your extension origin if you want
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const RESUME_SCORING_TIMEOUT_MS = 15_000

const ResumeScoreSchema = z.object({
  score: z.number(),
  summary: z.string().optional().nullable(),
})

interface ResumeScoringPayload {
  job: {
    company_name: string
    position_title: string
    job_description?: string | null
    qualifications?: string | null
    job_responsibilities?: string | null
    notes?: string | null
  }
  resumeText: string
}

async function generateResumeMatchScore({ job, resumeText }: ResumeScoringPayload) {
  if (!OPENAI_API_KEY) {
    return null
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort()
  }, RESUME_SCORING_TIMEOUT_MS)

  const systemPrompt =
    "You are an expert career coach. Compare the candidate's resume against the job listing and respond with strict JSON. " +
    "Return keys `score` (0-10 with one decimal) and `summary` (<=75 words).";

  const userPrompt = `Job application details:\n${JSON.stringify(job, null, 2)}\n\nCandidate resume:\n"""\n${resumeText}\n"""`

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Resume scoring OpenAI error:", errorText)
      return null
    }

    const json = await response.json()
    const content = json?.choices?.[0]?.message?.content

    if (!content) {
      console.error("Resume scoring response missing content", json)
      return null
    }

    let parsed: unknown

    try {
      parsed = JSON.parse(content)
    } catch (error) {
      console.error("Resume scoring JSON parse error", error, content)
      return null
    }

    const validation = ResumeScoreSchema.safeParse(parsed)

    if (!validation.success) {
      console.error("Resume scoring schema validation failed", validation.error)
      return null
    }

    const rawScore = validation.data.score
    const clampedScore = Math.min(10, Math.max(0, rawScore))
    const roundedScore = Math.round(clampedScore * 10) / 10

    return {
      score: roundedScore,
      summary: validation.data.summary?.trim() || null,
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error("Resume scoring request timed out")
      return null
    }

    console.error("Resume scoring request failed", error)
    return null
  } finally {
    clearTimeout(timeoutId)
  }
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
    const include_status_history = searchParams.get("include_status_history") === "true"

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
        ${include_status_history ? ", status_history:job_application_status_history(*)" : ""}
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

    const normalizedData = include_status_history
      ? data?.map((application) => ({
          ...application,
          status_history: [...(application.status_history ?? [])].sort(
            (left, right) => new Date(left.changed_at).getTime() - new Date(right.changed_at).getTime(),
          ),
        })) ?? []
      : data ?? []

    return NextResponse.json(
      {
        data: normalizedData,
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
      resume_match_score: null as number | null,
      resume_match_summary: null as string | null,
    }

    const { data, error } = await supabase.from("job_applications").insert([insertData]).select().single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders })
    }

    if (data?.id && data?.status) {
      const { error: historyError } = await supabase.from("job_application_status_history").insert({
        job_application_id: data.id,
        user_id: userId,
        status: data.status,
        changed_at: data.created_at ?? new Date().toISOString(),
      })

      if (historyError) {
        console.error("Failed to record status history for new application", historyError)
      }
    }

    if (!OPENAI_API_KEY) {
      console.info("Resume match scoring: skipped, missing OPENAI_API_KEY")
    } else if (!data?.id) {
      console.error("Resume match scoring: skipped, inserted record missing id")
    } else {
      const jobContext = {
        company_name: body.company_name,
        position_title: body.position_title,
        job_description: body.job_description ?? null,
        qualifications: body.qualifications ?? null,
        job_responsibilities: body.job_responsibilities ?? null,
        notes: body.notes ?? null,
      }

      void (async () => {
        try {
          const resume = await getLatestResumeText(userId)

          if (!resume?.text) {
            console.info("Resume match scoring: no resume text available", { userId })
            return
          }

          console.info("Resume match scoring: found resume text for user, initiating scoring", { userId })
          const scoringResult = await generateResumeMatchScore({ job: jobContext, resumeText: resume.text })

          if (!scoringResult) {
            console.info("Resume match scoring: no score returned", {
              userId,
              company: jobContext.company_name,
              position: jobContext.position_title,
            })
            return
          }

          console.info("Resume match scoring: score computed", {
            userId,
            resumeMatchScore: scoringResult.score,
            hasSummary: Boolean(scoringResult.summary),
          })

          const { error: updateError } = await supabase
            .from("job_applications")
            .update({
              resume_match_score: scoringResult.score,
              resume_match_summary: toNullableString(scoringResult.summary ?? null),
            })
            .eq("id", data.id)

          if (updateError) {
            console.error("Resume match scoring: failed to update job application", updateError)
          }
        } catch (error) {
          console.error("Resume match scoring: failed to generate score", error)
        }
      })()
    }

    return NextResponse.json({ data }, { status: 201, headers: corsHeaders })
  } catch (error) {
    console.error("Failed to create job application", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders })
  }
}
