import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { z } from "zod"

import { getAuthedClient } from "@/lib/api/auth"
import { getLatestResumeText } from "@/lib/resume/server"

const BodySchema = z.object({
  applicationId: z.string().nullable().optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().min(1),
      }),
    )
    .min(1),
})

const MAX_SECTION_LENGTH = 1800
const MAX_INTERVIEW_HISTORY = 5

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set")
  }
  return new OpenAI({ apiKey })
}

function trimSection(input: string | null | undefined, maxLength = MAX_SECTION_LENGTH) {
  if (!input) return null
  if (input.length <= maxLength) return input
  return `${input.slice(0, maxLength)}\n...[trimmed]`
}

function formatInterviewHistory(interviews: Array<Record<string, string | null>>) {
  if (interviews.length === 0) return "No interviews logged yet."

  return interviews
    .slice(0, MAX_INTERVIEW_HISTORY)
    .map((interview, index) => {
      const details = [
        interview.interview_type ? `${interview.interview_type}` : null,
        interview.status ? `${interview.status}` : null,
        interview.scheduled_date ? new Date(interview.scheduled_date).toLocaleDateString() : null,
      ]
        .filter(Boolean)
        .join(" · ")

      const notes =
        trimSection(
          interview.post_interview_notes || interview.prep_notes || interview.notes || null,
          Math.round(MAX_SECTION_LENGTH / 4),
        ) || "No notes recorded."

      return `${index + 1}. ${details || "Interview"} — ${notes}`
    })
    .join("\n")
}

async function buildContext({
  supabase,
  userId,
  applicationId,
}: {
  supabase: Awaited<ReturnType<typeof getAuthedClient>> extends { supabase: infer T } ? T : never
  userId: string
  applicationId?: string | null
}) {
  const [resume, application] = await Promise.all([
    getLatestResumeText(userId).catch(() => null),
    applicationId
      ? supabase
          .from("job_applications")
          .select(
            "id, company_name, position_title, job_description, qualifications, job_responsibilities, notes, resume_match_summary",
          )
          .eq("id", applicationId)
          .eq("user_id", userId)
          .maybeSingle()
          .then((result) => result.data)
      : Promise.resolve(null),
  ])

  const interviews = applicationId
    ? await supabase
        .from("interviews")
        .select("interview_type, scheduled_date, status, notes, prep_notes, post_interview_notes")
        .eq("job_application_id", applicationId)
        .eq("user_id", userId)
        .order("scheduled_date", { ascending: false })
        .limit(MAX_INTERVIEW_HISTORY)
        .then((result) => result.data ?? [])
    : []

  const contextSections: string[] = [
    "You are Prep, a concise mock interview coach. Keep responses under 120 words and end with a targeted follow-up question.",
  ]

  if (resume?.text) {
    contextSections.push(`Resume (${resume.fileName ?? "upload"}, updated ${resume.updatedAt ?? "recently"}):\n${trimSection(resume.text)}`)
  } else {
    contextSections.push("No resume on file; rely on the job description and interview notes for guidance.")
  }

  if (application) {
    contextSections.push(
      [
        `Role: ${application.position_title ?? "Unknown title"} at ${application.company_name ?? "Unknown company"}`,
        application.job_description ? `Job description: ${trimSection(application.job_description)}` : null,
        application.qualifications ? `Qualifications: ${trimSection(application.qualifications)}` : null,
        application.job_responsibilities ? `Responsibilities: ${trimSection(application.job_responsibilities)}` : null,
        application.resume_match_summary ? `Resume fit summary: ${trimSection(application.resume_match_summary, 800)}` : null,
        application.notes ? `Recruiter or personal notes: ${trimSection(application.notes, 800)}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    )
  }

  if (interviews.length > 0) {
    contextSections.push(`Interview history (latest first):\n${formatInterviewHistory(interviews)}`)
  }

  return contextSections.join("\n\n")
}

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  let payload: z.infer<typeof BodySchema>

  try {
    payload = BodySchema.parse(await request.json())
  } catch (error) {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 })
  }

  const auth = await getAuthedClient(request)
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status })
  }

  try {
    const openai = getOpenAIClient()
    const context = await buildContext({
      supabase: auth.supabase,
      userId: auth.userId,
      applicationId: payload.applicationId ?? null,
    })

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      stream: true,
      temperature: 0.7,
      messages: [
        { role: "system" as const, content: context },
        ...payload.messages.map((message) => ({
          role: message.role as "user" | "assistant" | "system",
          content: message.content,
        })),
      ],
    })

    const encoder = new TextEncoder()
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content
            if (content) {
              controller.enqueue(encoder.encode(content))
            }
          }
        } catch (error) {
          console.error("Prep streaming error", error)
          controller.enqueue(encoder.encode("The assistant ran into an issue responding."))
        } finally {
          controller.close()
        }
      },
    })

    return new NextResponse(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    })
  } catch (error) {
    console.error("Prep request failed", error)
    return NextResponse.json({ error: "Unable to generate a response right now." }, { status: 500 })
  }
}
