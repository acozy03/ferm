import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getAuthedClient } from "@/lib/api/auth"

const CreateChatSchema = z.object({
  interviewId: z.string().uuid().nullable().optional(),
  title: z.string().min(1).max(200).optional(),
})

export const dynamic = "force-dynamic"

function buildInterviewSeedTitle(interview: {
  interview_round?: number | null
  interview_type?: string | null
  job_applications?: { position_title?: string | null; company_name?: string | null } | null
}) {
  const role = interview.job_applications?.position_title?.trim()
  const company = interview.job_applications?.company_name?.trim()
  const interviewLabel =
    interview.interview_round && interview.interview_round > 0
      ? `Interview Round ${interview.interview_round}`
      : interview.interview_type
        ? `${interview.interview_type} Interview`
        : "Interview"

  if (role && company) return `${role} @ ${company}`
  if (role) return `${role} prep`
  if (company) return `${interviewLabel} · ${company}`
  return `${interviewLabel}`
}

export async function GET(request: NextRequest) {
  const auth = await getAuthedClient(request)
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status })
  }

  const searchParams = new URL(request.url).searchParams
  const interviewId = searchParams.get("interviewId")

  let query = auth.supabase
    .from("prep_chats")
    .select("id, title, interview_id, created_at")
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false })

  if (searchParams.has("interviewId")) {
    query = interviewId ? query.eq("interview_id", interviewId) : query.is("interview_id", null)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: "Unable to load chats." }, { status: 500 })
  }

  return NextResponse.json({ data: data ?? [] })
}

export async function POST(request: NextRequest) {
  const auth = await getAuthedClient(request)
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status })
  }

  let payload: z.infer<typeof CreateChatSchema>

  try {
    payload = CreateChatSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 })
  }

  let derivedTitle = payload.title?.trim()

  if (payload.interviewId) {
    const { data: interview, error: interviewError } = await auth.supabase
      .from("interviews")
      .select("id, interview_round, interview_type, job_applications(position_title, company_name)")
      .eq("id", payload.interviewId)
      .eq("user_id", auth.userId)
      .maybeSingle()

    if (interviewError) {
      return NextResponse.json({ error: "Unable to verify interview." }, { status: 500 })
    }

    if (!interview) {
      return NextResponse.json({ error: "Interview not found." }, { status: 404 })
    }

    if (!derivedTitle) {
      derivedTitle = buildInterviewSeedTitle(interview)
    }
  }

  if (!derivedTitle) {
    const now = new Date()
    derivedTitle = `Prep chat · ${now.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
  }

  const { data, error } = await auth.supabase
    .from("prep_chats")
    .insert({
      user_id: auth.userId,
      interview_id: payload.interviewId ?? null,
      title: derivedTitle,
    })
    .select("id, title, interview_id, created_at")
    .single()

  if (error) {
    return NextResponse.json({ error: "Unable to create chat." }, { status: 500 })
  }

  return NextResponse.json({ data })
}
