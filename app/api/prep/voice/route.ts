import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  return new OpenAI({ apiKey });
}

export async function POST(request: NextRequest) {
  const openai = getOpenAIClient()

  const formData = await request.formData()
  const audioFile = formData.get("audio") as File | null
  const history = formData.get("messages") as string | null
  const jobContext = formData.get("jobContext") as string | null

  if (!audioFile) {
    return NextResponse.json({ error: "Audio file is required." }, { status: 400 })
  }

  const messageHistory = history ? (JSON.parse(history) as { role: string; content: string }[]) : []

  const contextText = jobContext
    ? (() => {
        try {
          const parsed = JSON.parse(jobContext) as { role?: string | null; company?: string | null; latestNote?: string | null }
          return `You are prepping the user for ${parsed.role ?? "their role"} at ${parsed.company ?? "their company"}.` +
            (parsed.latestNote ? ` Keep this note in mind: ${parsed.latestNote}` : "")
        } catch {
          return ""
        }
      })()
    : ""

  try {
    const transcription = await openai.audio.transcriptions.create({
      model: "whisper-1",
      file: audioFile,
      response_format: "text",
      temperature: 0.2,
    })

    const messages = [
      {
        role: "system" as const,
        content:
          "You are Prep, a concise mock interview partner. Keep responses under 120 words and keep a coaching tone. " +
          "Do not repeat the transcript back; move the conversation forward with a new question or feedback. " +
          contextText,
      },
      ...messageHistory.map((message) => ({ role: message.role as "user" | "assistant", content: message.content })),
      { role: "user" as const, content: transcription },
    ]

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.7,
    })

    const replyText = completion.choices[0]?.message?.content?.trim() ?? "I heard you. Let's keep practicing."

    const speech = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: replyText,
      format: "mp3",
    })

    const audioBuffer = Buffer.from(await speech.arrayBuffer())
    const audioBase64 = audioBuffer.toString("base64")

    return NextResponse.json({ transcript: transcription, reply: replyText, audioBase64 })
  } catch (error) {
    console.error("Voice pipeline error", error)
    return NextResponse.json({ error: "Unable to process voice input right now." }, { status: 500 })
  }
}
