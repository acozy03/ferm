import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getAuthedClient } from "@/lib/api/auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const DraftSchema = z.object({
  job_application_id: z.string().uuid(),
  companyName: z.string().min(1),
  positionTitle: z.string().min(1),
  contactName: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  jobDescription: z.string().optional().nullable(),
  appliedAt: z.string().optional().nullable(),
  intervalDays: z.number().int().min(1).max(60),
})

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

export async function POST(request: NextRequest) {
  
  const auth = await getAuthedClient(request)
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status })
  }

  if (!OPENAI_API_KEY) {
    return NextResponse.json({ error: "OpenAI API key is not configured" }, { status: 500 })
  }

  const payload = DraftSchema.safeParse(await request.json())
  if (!payload.success) {
    return NextResponse.json({ error: payload.error.message }, { status: 400 })
  }

  const { supabase, userId } = auth
  const { job_application_id, companyName, positionTitle, contactName, notes, jobDescription, appliedAt, intervalDays } =
    payload.data

  const { data: application, error: applicationError } = await supabase
    .from("job_applications")
    .select("id")
    .eq("id", job_application_id)
    .eq("user_id", userId)
    .maybeSingle()

  if (applicationError) {
    return NextResponse.json({ error: applicationError.message }, { status: 500 })
  }

  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 })
  }
  
  const { data: profile, error: profileError } = await supabase.auth.getUser()
  
  if (profileError) {
    return NextResponse.json({ error: "Unable to determine user profile" }, { status: 500 })
  }

  const userEmail = profile.user.email
  
  const userPrompt = `You are drafting a concise, professional follow-up email.\n\nContext:\n- Candidate email: ${userEmail}\n- Company: ${companyName}\n- Role: ${positionTitle}\n- Contact: ${contactName ?? "Hiring manager"}\n- Days since application: ${intervalDays}\n- Application date: ${appliedAt ?? "Unknown"}\n- Notes: ${notes ?? "None"}\n- Job description excerpt: ${jobDescription ? jobDescription.slice(0, 1200) : "Not provided"}\n\nWrite a friendly, confident follow-up email encouraging a response. Return only the email body.`

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an expert job search coach helping candidates follow up with prospective employers. Provide thoughtful emails that show enthusiasm without being pushy.",
        },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.6,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    return NextResponse.json({ error: errorText || "Failed to generate follow-up draft" }, { status: response.status })
  }

  const completion = (await response.json()) as {
    choices?: { message?: { content?: string | null } }[]
  }

  const draft = completion?.choices?.[0]?.message?.content?.trim()

  if (!draft) {
    return NextResponse.json({ error: "Draft generation did not return any content" }, { status: 502 })
  }

  return NextResponse.json({ data: { draft } })
}
