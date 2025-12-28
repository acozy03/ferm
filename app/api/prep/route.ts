import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { z } from "zod"

import { getAuthedClient } from "@/lib/api/auth"
import { buildPrepContext } from "./context"

const BodySchema = z.object({
  applicationId: z.string().nullable().optional(),
  chatId: z.string().uuid(),
  assistantMessageId: z.string().uuid().nullable().optional(),
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
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 })
  }

  const auth = await getAuthedClient(request)
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status })
  }

  try {
    const { data: chat, error: chatError } = await auth.supabase
      .from("prep_chats")
      .select("id")
      .eq("id", payload.chatId)
      .eq("user_id", auth.userId)
      .maybeSingle()

    if (chatError) {
      return NextResponse.json({ error: "Unable to verify chat." }, { status: 500 })
    }

    if (!chat) {
      return NextResponse.json({ error: "Chat not found." }, { status: 404 })
    }

    const latestUserMessage = [...payload.messages].reverse().find((message) => message.role === "user")
    if (!latestUserMessage) {
      return NextResponse.json({ error: "A user prompt is required." }, { status: 400 })
    }

    let assistantMessageId = payload.assistantMessageId ?? null

    if (assistantMessageId) {
      const { data: assistantMessage, error: assistantLookupError } = await auth.supabase
        .from("prep_messages")
        .select("id, chat_id")
        .eq("id", assistantMessageId)
        .eq("chat_id", chat.id)
        .maybeSingle()

      if (assistantLookupError) {
        return NextResponse.json({ error: "Unable to verify assistant message." }, { status: 500 })
      }

      if (!assistantMessage) {
        return NextResponse.json({ error: "Assistant message not found for this chat." }, { status: 404 })
      }
    } else {
      const { data: insertedMessages, error: insertError } = await auth.supabase
        .from("prep_messages")
        .insert([
          {
            chat_id: chat.id,
            role: "user",
            content: latestUserMessage.content,
            metadata: { mode: "text" },
          },
          { chat_id: chat.id, role: "assistant", content: "", metadata: { mode: "text" } },
        ])
        .select("id, role")

      if (insertError) {
        return NextResponse.json({ error: "Unable to start chat." }, { status: 500 })
      }

      assistantMessageId = insertedMessages?.find((message) => message.role === "assistant")?.id ?? null
    }

    if (!assistantMessageId) {
      return NextResponse.json({ error: "Unable to track assistant message." }, { status: 500 })
    }

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
        let accumulated = ""

        try {
          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content
            if (content) {
              accumulated += content
              controller.enqueue(encoder.encode(content))

              if (assistantMessageId) {
                const { error: updateError } = await auth.supabase
                  .from("prep_messages")
                  .update({ content: accumulated })
                  .eq("id", assistantMessageId)

                if (updateError) {
                  console.error("Failed to update streaming message", updateError)
                }
              }
            }
          }
        } catch (error) {
          console.error("Prep streaming error", error)
          const fallback = "The assistant ran into an issue responding."
          controller.enqueue(encoder.encode(fallback))

          if (assistantMessageId) {
            const { error: updateError } = await auth.supabase
              .from("prep_messages")
              .update({ content: fallback })
              .eq("id", assistantMessageId)

            if (updateError) {
              console.error("Failed to persist fallback message", updateError)
            }
          }
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
