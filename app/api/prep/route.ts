import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { z } from "zod"

import { getAuthedClient } from "@/lib/api/auth"
import { buildPrepContext } from "./context"

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

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set")
  }
  return new OpenAI({ apiKey })
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
    const context = await buildPrepContext({
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
