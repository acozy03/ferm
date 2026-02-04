import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { Resend } from "resend"

import { getAuthedClient, requireCookieCsrf } from "@/lib/api/auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ContactSchema = z.object({
  topic: z.string().min(1),
  details: z.string().min(1),
})

export async function POST(request: NextRequest) {
  const csrfError = requireCookieCsrf(request)
  if (csrfError) {
    return NextResponse.json({ error: csrfError.error.message }, { status: csrfError.error.status })
  }

  const auth = await getAuthedClient(request)
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status })
  }

  const payload = ContactSchema.safeParse(await request.json())
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

  const { topic, details } = payload.data
  const userEmail = profile.user.email

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
