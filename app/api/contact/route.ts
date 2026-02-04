import { createHash } from "crypto"
import { type NextRequest, NextResponse } from "next/server"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { z } from "zod"
import { Resend } from "resend"

import { getAuthedClient, requireCookieCsrf } from "@/lib/api/auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ContactSchema = z.object({
  topic: z.string().min(1),
  details: z.string().min(1),
})

const RATE_LIMIT_MAX_REQUESTS = 5
const RATE_LIMIT_WINDOW = "1 h"
const MAX_PAYLOAD_CHARS = 4000
const DUPLICATE_WINDOW_SECONDS = 300

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null

const contactRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW),
      analytics: true,
      prefix: "contact",
    })
  : null

function normalizePayload(topic: string, details: string) {
  return JSON.stringify({
    topic: topic.trim(),
    details: details.trim(),
  })
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

  const contentLength = request.headers.get("content-length")
  if (contentLength && Number.parseInt(contentLength, 10) > MAX_PAYLOAD_CHARS) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 })
  }

  let rawBody = ""

  try {
    rawBody = await request.text()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  if (rawBody.length > MAX_PAYLOAD_CHARS) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 })
  }

  let parsedBody: unknown

  try {
    parsedBody = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const payload = ContactSchema.safeParse(parsedBody)
  if (!payload.success) {
    return NextResponse.json({ error: payload.error.message }, { status: 400 })
  }

  const resendApiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.CONTACT_FROM_EMAIL ?? process.env.FOLLOW_UP_FROM_EMAIL

  if (!resendApiKey || !fromEmail) {
    return NextResponse.json({ error: "Contact email configuration missing" }, { status: 500 })
  }

  const { supabase } = auth
  const { data: profile, error: profileError } = await supabase.auth.getUser()

  if (profileError || !profile?.user?.email) {
    return NextResponse.json({ error: "Unable to determine user profile" }, { status: 500 })
  }

  if (!redis || !contactRateLimiter) {
    console.error("Contact rate limiting not configured")
    return NextResponse.json({ error: "Rate limit configuration missing" }, { status: 500 })
  }

  const { topic, details } = payload.data
  const userEmail = profile.user.email
  const userId = profile.user.id

  const rateLimitResult = await contactRateLimiter.limit(userId)
  if (!rateLimitResult.success) {
    console.warn("Contact rate limit exceeded", {
      userId,
      userEmail,
      reset: rateLimitResult.reset,
    })
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 })
  }

  if (rateLimitResult.remaining <= 1) {
    console.warn("Contact rate limit nearing exhaustion", {
      userId,
      userEmail,
      remaining: rateLimitResult.remaining,
    })
  }

  const payloadFingerprint = createHash("sha256")
    .update(normalizePayload(topic, details))
    .digest("hex")
  const duplicateKey = `contact:payload:${userId}:${payloadFingerprint}`
  const duplicateSet = await redis.set(duplicateKey, "1", {
    ex: DUPLICATE_WINDOW_SECONDS,
    nx: true,
  })

  if (!duplicateSet) {
    return NextResponse.json(
      { error: "Duplicate request detected. Please wait before retrying." },
      { status: 409 },
    )
  }

  const formattedTopic = topic.replace(/_/g, " ")
  const subject = `Contact request: ${formattedTopic}`
  const messageBody = `New contact request from ${userEmail}\n\nTopic: ${formattedTopic}\n\nDetails:\n${details.trim()}`

  const resend = new Resend(resendApiKey)

  try {
    await resend.emails.send({
      from: `ferm.dev <${fromEmail}>`,
      to: ["adrian@ferm.dev"],
      replyTo: userEmail,
      subject,
      text: messageBody,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to send contact email"
    return NextResponse.json({ error: errorMessage }, { status: 502 })
  }

  return NextResponse.json({ success: true })
}
