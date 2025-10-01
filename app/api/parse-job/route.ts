// app/api/parse-job/route.ts
import { NextResponse } from "next/server"
import { z } from "zod"
import { headers } from "next/headers"
import { createClient } from "@supabase/supabase-js"
const RequestBodySchema = z.object({
  raw_text: z.string().min(1, "raw_text required"),
  job_url: z.string().url(),
})

/** Normalize Employment Type coming from LLM (robust to variants) */
function normalizeEmploymentType(v: unknown) {
  if (typeof v !== "string") return null
  const s = v.toLowerCase().replace(/\s+/g, "")
  if (s.includes("full")) return "Full-time"
  if (s.includes("part")) return "Part-time"
  if (s.includes("contract") || s.includes("temp")) return "Contract"
  if (s.includes("intern")) return "Internship"
  return null
}

const LLMResponseSchema = z.object({
  // classification
  is_valid_job_posting: z.boolean(),
  reason: z.string().nullable().optional(),

  // fields (nullable if not present)
  company_name: z.string().nullable(),
  position_title: z.string().nullable(),
  location: z.string().nullable(),
  salary_range: z.string().nullable(),
  employment_type: z.preprocess(
    normalizeEmploymentType,
    z.enum(["Full-time", "Part-time", "Contract", "Internship"]).nullable()
  ),
  contact_person: z.string().nullable(),
  contact_email: z.string().email().nullable(),
})

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const hdrs = headers()
  const authHeader = hdrs.get("authorization") || ""
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 401 })
  }

  // validate token against Supabase
  const userResp = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  })

  if (!userResp.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await userResp.json() as { id: string }
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  // 1) Parse input
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const parsed = RequestBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input data", details: parsed.error.flatten() },
      { status: 400 }
    )
  }
  const { raw_text, job_url } = parsed.data


  // 2) Env
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY
  if (!OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not configured" }, { status: 500 })
  }

  // 3) Prompt: classify + extract in one JSON return
  const prompt = `
You are a strict job-posting classifier and parser.

Task A (classify):
Return "is_valid_job_posting": true if the text is a genuine job posting (contains hiring intent and role details), otherwise false.
If false, provide a brief "reason" (e.g., "company about page", "press release", "generic landing page", "too little content").

Task B (extract):
If valid, extract the following fields when possible. Use null if not found.
- company_name (string | null)
- position_title (string | null)
- location (string | null; e.g., "Remote" or "Austin, TX")
- salary_range (string | null; e.g., "$120k–$160k")
- employment_type (one of: "Full-time", "Part-time", "Contract", "Internship", or null)
- contact_person (string | null)
- contact_email (string | null; must be a valid email if present)

Return a single JSON object with EXACTLY these keys:
{
  "is_valid_job_posting": boolean,
  "reason": string | null,
  "company_name": string | null,
  "position_title": string | null,
  "location": string | null,
  "salary_range": string | null,
  "employment_type": "Full-time" | "Part-time" | "Contract" | "Internship" | null,
  "contact_person": string | null,
  "contact_email": string | null
}

Here is the raw text to analyze:
---
${raw_text}
---
URL: ${job_url}
`

  try {
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.1,
      }),
    })

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text()
      return NextResponse.json({ error: "LLM API call failed", details: errorText }, { status: openaiResponse.status })
    }

    const llmJson = await openaiResponse.json()
    const messageContent = llmJson?.choices?.[0]?.message?.content
    const usage = llmJson?.usage ?? null

    if (!messageContent) {
      return NextResponse.json({ error: "LLM response format is invalid" }, { status: 500 })
    }

    // 4) Validate + normalize
    let raw
    try {
      raw = JSON.parse(messageContent)
    } catch {
      return NextResponse.json({ error: "LLM did not return valid JSON" }, { status: 500 })
    }

    const validated = LLMResponseSchema.safeParse(raw)
    if (!validated.success) {
      // If LLM messed up the shape, treat as invalid posting with reason
      return NextResponse.json(
        {
          is_valid_job_posting: false,
          reason: "LLM returned malformed data",
          usage,
        },
        { status: 200 }
      )
    }

    // 5) Always include is_valid_job_posting (client relies on it)
    return NextResponse.json({ ...validated.data, usage }, { status: 200 })
  } catch (error) {
    console.error("parse-job error:", error)
    return NextResponse.json({ error: "Internal server error during parsing" }, { status: 500 })
  }
}
