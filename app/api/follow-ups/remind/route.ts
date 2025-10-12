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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function getAppUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://ferm.dev"

  try {
    return new URL(path, base).toString()
  } catch {
    return `https://ferm.dev${path}`
  }
}

function formatMessageParagraphs(message: string) {
  return message
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0)
    .map((paragraph) => {
      const escaped = escapeHtml(paragraph).replace(/\n/g, "<br/>")
      return `<p style="margin: 0 0 16px 0;">${escaped}</p>`
    })
    .join("")
}

function buildReminderHtml(message: string, options: { company: string | null }) {
  const logoUrl = getAppUrl("/logo.png")
  const dashboardUrl = getAppUrl("/follow-ups")
  const companyHeadline = options.company ? `Follow up with ${escapeHtml(options.company)}` : "Time to follow up"
  const messageHtml = formatMessageParagraphs(message) ||
    `<p style="margin: 0;">${escapeHtml(message)}</p>`

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${companyHeadline}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Inter',system-ui,-apple-system,'Segoe UI',sans-serif;color:#18181b;">
    <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" style="background-color:#f4f4f5;padding:32px 0;">
      <tr>
        <td align="center" style="padding:0 16px;">
          <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" style="max-width:520px;background-color:#ffffff;border-radius:20px;padding:40px 32px 32px;box-shadow:0 18px 48px rgba(15,23,42,0.12);">
            <tr>
              <td align="center" style="padding-bottom:24px;">
                <img src="${logoUrl}" alt="ferm" width="48" height="48" style="display:block;" />
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-bottom:16px;">
                <h1 style="margin:0;font-size:22px;line-height:32px;font-weight:600;color:#18181b;">${companyHeadline}</h1>
              </td>
            </tr>
            <tr>
              <td style="font-size:15px;line-height:24px;color:#3f3f46;padding-bottom:24px;">
                ${messageHtml}
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-bottom:24px;">
                <a
                  href="${dashboardUrl}"
                  style="display:inline-block;padding:12px 28px;background-color:#4338ca;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;border-radius:9999px;"
                >
                  Open ferm.dev
                </a>
              </td>
            </tr>
            <tr>
              <td style="font-size:13px;line-height:20px;color:#71717a;text-align:center;">
                You are receiving this reminder because you asked ferm.dev to nudge you about job applications. Manage notifications from your follow-up settings.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
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
      from: `ferm.dev <${fromEmail}>`,
      to: [recipient],
      subject: emailSubject,
      text: messageBody,
      html: buildReminderHtml(messageBody, { company: application.company_name }),
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
