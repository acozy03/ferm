import { type NextRequest, NextResponse } from "next/server"
import Groq from "groq-sdk"
import { z } from "zod"

import { getAuthedClient, requireCookieCsrf } from "@/lib/api/auth"
import { enforceRateLimit } from "@/lib/api/rate-limit"
import { buildPrepContext } from "../context"

const MAX_AUDIO_BYTES = 10 * 1024 * 1024
const MAX_MULTIPART_BYTES = MAX_AUDIO_BYTES + 256 * 1024
const MAX_HISTORY_MESSAGES = 6
const CARTESIA_API_VERSION = "2026-08-14"
const SUPPORTED_AUDIO_TYPES = new Set(["audio/wav", "audio/x-wav"])

const VoiceRequestSchema = z.object({
  chatId: z.string().uuid(),
  applicationId: z.string().uuid().nullable(),
  voiceReplies: z.boolean(),
})

export const runtime = "nodejs"

function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not set")
  }
  return new Groq({ apiKey })
}

async function synthesizeCartesiaSpeech(text: string) {
  const apiKey = process.env.CARTESIA_API_KEY
  const voiceId = process.env.CARTESIA_VOICE_ID
  const model = process.env.CARTESIA_MODEL ?? "sonic-3"

  if (!apiKey || !voiceId) {
    throw new Error("Cartesia voice replies are not configured.")
  }

  const response = await fetch("https://api.cartesia.ai/tts/bytes", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Cartesia-Version": CARTESIA_API_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model_id: model,
      transcript: text,
      voice: { id: voiceId },
      output_format: {
        container: "mp3",
        sample_rate: 44100,
        bit_rate: 64000,
      },
      generation_config: {
        speed: 1,
        volume: 1,
      },
    }),
    signal: AbortSignal.timeout(20_000),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => "")
    console.error("Cartesia TTS error", response.status, errorText)
    throw new Error("Cartesia could not generate the spoken reply.")
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer())
  return { audioBase64: audioBuffer.toString("base64"), audioMimeType: "audio/mpeg" }
}

async function parseVoiceInput(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length"))
  if (Number.isFinite(contentLength) && contentLength > MAX_MULTIPART_BYTES) {
    return { response: NextResponse.json({ error: "Voice request is too large." }, { status: 413 }) }
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return { response: NextResponse.json({ error: "Invalid voice request." }, { status: 400 }) }
  }

  const audioEntry = formData.get("audio")
  if (!(audioEntry instanceof File)) {
    return { response: NextResponse.json({ error: "Audio file is required." }, { status: 400 }) }
  }

  if (!SUPPORTED_AUDIO_TYPES.has(audioEntry.type) || audioEntry.size === 0 || audioEntry.size > MAX_AUDIO_BYTES) {
    return {
      response: NextResponse.json({ error: "Audio must be a WAV file no larger than 10 MB." }, { status: 400 }),
    }
  }

  const rawApplicationId = formData.get("applicationId")
  const parsedRequest = VoiceRequestSchema.safeParse({
    chatId: formData.get("chatId"),
    applicationId: typeof rawApplicationId === "string" && rawApplicationId.length > 0 ? rawApplicationId : null,
    voiceReplies: formData.get("voiceReplies") !== "false",
  })

  if (!parsedRequest.success) {
    return { response: NextResponse.json({ error: "Invalid voice request." }, { status: 400 }) }
  }

  if (!process.env.GROQ_API_KEY) {
    return { response: NextResponse.json({ error: "Groq voice processing is not configured." }, { status: 500 }) }
  }

  if (parsedRequest.data.voiceReplies && (!process.env.CARTESIA_API_KEY || !process.env.CARTESIA_VOICE_ID)) {
    return { response: NextResponse.json({ error: "Cartesia voice replies are not configured." }, { status: 500 }) }
  }

  return { audioEntry, ...parsedRequest.data }
}

export async function POST(request: NextRequest) {
  const csrfError = requireCookieCsrf(request)
  if (csrfError) {
    return NextResponse.json({ error: csrfError.error.message }, { status: csrfError.error.status })
  }

  const auth = await getAuthedClient(request)
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status })
  }

  const voiceInput = await parseVoiceInput(request)
  if ("response" in voiceInput) {
    return voiceInput.response
  }
  const { applicationId, audioEntry, chatId, voiceReplies } = voiceInput

  const { data: chat, error: chatError } = await auth.supabase
    .from("prep_chats")
    .select("id")
    .eq("id", chatId)
    .eq("user_id", auth.userId)
    .maybeSingle()

  if (chatError) {
    return NextResponse.json({ error: "Unable to verify chat." }, { status: 500 })
  }

  if (!chat) {
    return NextResponse.json({ error: "Chat not found." }, { status: 404 })
  }

  const rateLimitResponse = await enforceRateLimit({
    request,
    userId: auth.userId,
    keyPrefix: "prep-voice",
    maxRequests: 10,
  })
  if (rateLimitResponse) return rateLimitResponse

  const { data: historyRows, error: historyError } = await auth.supabase
    .from("prep_messages")
    .select("role, content")
    .eq("chat_id", chat.id)
    .order("created_at", { ascending: false })
    .order("role", { ascending: true })
    .limit(MAX_HISTORY_MESSAGES)

  if (historyError) {
    return NextResponse.json({ error: "Unable to load chat history." }, { status: 500 })
  }

  const messageHistory = (historyRows ?? [])
    .toReversed()
    .filter(
      (message): message is { role: "user" | "assistant"; content: string } =>
        (message.role === "user" || message.role === "assistant") && message.content.trim().length > 0,
    )

  const groq = getGroqClient()

  try {
    const transcription = await groq.audio.transcriptions.create({
      model: process.env.GROQ_TRANSCRIPTION_MODEL ?? "whisper-large-v3",
      file: audioEntry,
      response_format: "text",
      temperature: 0,
    })

    const transcript = (typeof transcription === "string" ? transcription : transcription.text).trim()

    if (!transcript) {
      return NextResponse.json({
        transcript: "",
        reply: "",
        audioBase64: null,
        audioMimeType: null,
        voiceError: "I couldn't hear enough speech. Listening again...",
      })
    }

    const context = await buildPrepContext({
      supabase: auth.supabase,
      userId: auth.userId,
      applicationId,
    })

    const messages = [
      {
        role: "system" as const,
        content:
          context +
          "\n\nVoice session rules: Keep a coaching tone, stay under 120 words, and do not repeat the transcript back. Move the conversation forward with a new question or feedback.",
      },
      ...messageHistory.map((message) => ({ role: message.role as "user" | "assistant", content: message.content })),
      { role: "user" as const, content: transcript },
    ]

    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_CHAT_MODEL ?? "llama-3.3-70b-versatile",
      messages,
      temperature: 0.6,
      max_completion_tokens: 300,
    })

    const replyText = completion.choices[0]?.message?.content?.trim() ?? "I heard you. Let's keep practicing."

    let audioBase64: string | null = null
    let audioMimeType: string | null = null
    let voiceError: string | null = null

    if (voiceReplies) {
      try {
        const speech = await synthesizeCartesiaSpeech(replyText)
        audioBase64 = speech.audioBase64
        audioMimeType = speech.audioMimeType
      } catch (error) {
        console.error("Voice reply synthesis failed", error)
        voiceError = error instanceof Error ? error.message : "Unable to generate the spoken reply."
      }
    }

    const { error: insertError } = await auth.supabase.from("prep_messages").insert([
      { chat_id: chat.id, role: "user", content: transcript, metadata: { mode: "voice" } },
      {
        chat_id: chat.id,
        role: "assistant",
        content: replyText,
        metadata: { mode: "voice", hasAudio: Boolean(audioBase64) },
      },
    ])

    if (insertError) {
      return NextResponse.json({ error: "Unable to save voice exchange." }, { status: 500 })
    }

    return NextResponse.json({ transcript, reply: replyText, audioBase64, audioMimeType, voiceError })
  } catch (error) {
    console.error("Voice pipeline error", error)
    return NextResponse.json({ error: "Unable to process voice input right now." }, { status: 500 })
  }
}
