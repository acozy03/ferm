import { type NextRequest, NextResponse } from "next/server"
import { addDays, format } from "date-fns"
import { z } from "zod"
import { Resend } from "resend"

import { getAuthedClient } from "@/lib/api/auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ReminderSchema = z.object({
  job_application_id: z.string().uuid(),
  recipient: z.string().email(),
  subject: z.string().optional(),
  message: z.string().optional(),
})

function toHtml(message: string) {
  return message
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br/>")}</p>`)
    .join("")
}

export async function POST(request: NextRequest) {
  const auth = await getAuthedClient(request)
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status })
  }

  const payload = ReminderSchema.safeParse(await request.json())
  if (!payload.success) {
    return NextResponse.json({ error: payload.error.message }, { status: 400 })
  }

  const resendApiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.FOLLOW_UP_FROM_EMAIL

  if (!resendApiKey || !fromEmail) {
    return NextResponse.json({ error: "Follow-up email configuration missing" }, { status: 500 })
  }

  const resend = new Resend(resendApiKey)
  const { supabase, userId } = auth
  const { job_application_id, recipient, subject, message } = payload.data

  const { data: application, error: applicationError } = await supabase
    .from("job_applications")
    .select("company_name, position_title, application_date")
    .eq("id", job_application_id)
    .eq("user_id", userId)
    .maybeSingle()

  if (applicationError) {
    return NextResponse.json({ error: applicationError.message }, { status: 500 })
  }

  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 })
  }

  const { data: followUp, error: followUpError } = await supabase
    .from("application_follow_ups")
    .select("id, interval_days, enabled")
    .eq("job_application_id", job_application_id)
    .eq("user_id", userId)
    .maybeSingle()

  if (followUpError) {
    return NextResponse.json({ error: followUpError.message }, { status: 500 })
  }

  if (!followUp || !followUp.enabled) {
    return NextResponse.json({ error: "Follow-up reminders are not enabled for this application" }, { status: 400 })
  }

  const emailSubject = subject ?? `Reminder: Follow up with ${application.company_name}`
  const defaultMessage = `It’s time to follow up on ${application.position_title ?? "your application"} at ${
    application.company_name
  }.\n\nSign in at ferm.dev to send a quick note. Need help? We’ve prepped an AI draft for you on the Follow-up playbook.`
  const messageBody = message?.trim().length ? message : defaultMessage

  try {
    await resend.emails.send({
      from: fromEmail,
      to: [recipient],
      subject: emailSubject,
      text: messageBody,
      html: toHtml(messageBody),
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to send reminder"
    return NextResponse.json({ error: errorMessage }, { status: 502 })
  }

  const now = new Date()
  const nextDate = addDays(now, followUp.interval_days)
  const formattedNext = format(nextDate, "MMM d, yyyy")

  const { data, error } = await supabase
    .from("application_follow_ups")
    .update({
      last_notified_at: now.toISOString(),
      next_follow_up_date: nextDate.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("id", followUp.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: { ...data, next_follow_up_readable: formattedNext } })
}
