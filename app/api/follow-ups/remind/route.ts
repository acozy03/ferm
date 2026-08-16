import { type NextRequest, NextResponse } from "next/server"
import { format } from "date-fns"
import { z } from "zod"
import { Resend } from "resend"

import { getAuthedClient, requireCookieCsrf } from "@/lib/api/auth"
import { type createServerSupabaseClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ReminderSchema = z.object({
  job_application_id: z.string().uuid(),
  recipient: z.string().email(),
  subject: z.string().optional(),
  message: z.string().optional(),
})

const RECENT_SEND_WINDOW_MS = 10 * 60 * 1000
const USER_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000
const USER_RATE_LIMIT_MAX = 5
const IP_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000
const IP_RATE_LIMIT_MAX = 15

function getAllowedDomains() {
  const raw = process.env.FOLLOW_UP_ALLOWED_DOMAINS ?? ""
  return raw
    .split(",")
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean)
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

function isAllowedRecipient(options: { recipient: string; allowedEmails: string[]; allowedDomains: string[] }) {
  const recipient = normalizeEmail(options.recipient)
  if (options.allowedEmails.some((email) => normalizeEmail(email) === recipient)) {
    return true
  }

  const domain = recipient.split("@")[1]
  if (!domain) {
    return false
  }

  return options.allowedDomains.includes(domain)
}

function getRequestIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || null
  }

  return request.headers.get("x-real-ip")?.trim() || null
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function getAppUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ferm.dev"

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
  const logoUrl = getAppUrl("/logo_full.png")
  const dashboardUrl = getAppUrl("/follow-ups")
  const companyHeadline = options.company ? `Follow up with ${escapeHtml(options.company)}` : "Time to follow up"
  const messageHtml = formatMessageParagraphs(message) || `<p style="margin: 0;">${escapeHtml(message)}</p>`

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="x-ua-compatible" content="ie=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${companyHeadline}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif,'Apple Color Emoji','Segoe UI Emoji';color:#11181c;">
    <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" style="width:100%;background-color:#f4f4f5;min-height:100vh;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="570" align="center" cellPadding="0" cellSpacing="0" style="max-width:570px;width:100%;margin:0 auto;background-color:#ffffff;border-radius:16px;border:1px solid #e4e4e7;box-shadow:0 24px 48px rgba(15,23,42,0.1);">
            <tr>
              <td style="padding:32px 40px 0 40px;text-align:center;font-size:16px;line-height:24px;">
                <table role="presentation" width="100%" cellPadding="0" cellSpacing="0">
                  <tr>
                    <td style="padding-bottom:24px;text-align:center;">
                      <img src="${logoUrl}" alt="ferm" width="40" height="40" style="display:inline-block;" />
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-bottom:16px;text-align:center;">
                      <h1 style="margin:0;font-size:24px;line-height:32px;font-weight:600;color:#11181c;">${companyHeadline}</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-bottom:28px;font-size:16px;line-height:26px;color:#3f3f46;text-align:center;">
                      ${messageHtml}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-bottom:32px;text-align:center;">
                      <a href="${dashboardUrl}" style="display:inline-block;padding:12px 24px;background-color:#11181c;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;border-radius:9999px;">Check it out!</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 40px 40px;font-size:13px;line-height:20px;color:#71717a;text-align:center;">
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

type SupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>

async function checkReminderRateLimits(options: {
  supabase: SupabaseClient
  userId: string
  jobApplicationId: string
  recipient: string
  requestIp: string | null
  now: Date
}) {
  const { supabase, userId, jobApplicationId, recipient, requestIp, now } = options
  const recentThreshold = new Date(now.getTime() - RECENT_SEND_WINDOW_MS).toISOString()
  const userWindowThreshold = new Date(now.getTime() - USER_RATE_LIMIT_WINDOW_MS).toISOString()
  const ipWindowThreshold = new Date(now.getTime() - IP_RATE_LIMIT_WINDOW_MS).toISOString()
  const { data: recentSend, error: recentSendError } = await supabase
    .from("follow_up_reminder_sends")
    .select("id, created_at")
    .eq("user_id", userId)
    .eq("job_application_id", jobApplicationId)
    .eq("recipient", recipient)
    .gte("created_at", recentThreshold)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (recentSendError) {
    return NextResponse.json({ error: recentSendError.message }, { status: 500 })
  }

  if (recentSend) {
    console.warn("Follow-up reminder suppressed (recent send)", {
      userId,
      job_application_id: jobApplicationId,
      recipient,
      created_at: recentSend.created_at,
    })
    return NextResponse.json({ error: "Reminder already sent recently." }, { status: 429 })
  }

  const { count: userSendCount, error: userCountError } = await supabase
    .from("follow_up_reminder_sends")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", userWindowThreshold)

  if (userCountError) {
    return NextResponse.json({ error: userCountError.message }, { status: 500 })
  }

  if ((userSendCount ?? 0) >= USER_RATE_LIMIT_MAX) {
    return NextResponse.json({ error: "Too many reminders sent. Please try later." }, { status: 429 })
  }

  if (!requestIp) {
    return null
  }

  const { count: ipSendCount, error: ipCountError } = await supabase
    .from("follow_up_reminder_sends")
    .select("id", { count: "exact", head: true })
    .eq("ip_address", requestIp)
    .gte("created_at", ipWindowThreshold)

  if (ipCountError) {
    return NextResponse.json({ error: ipCountError.message }, { status: 500 })
  }

  if ((ipSendCount ?? 0) >= IP_RATE_LIMIT_MAX) {
    return NextResponse.json({ error: "Too many reminders sent from this network. Please try later." }, { status: 429 })
  }

  return null
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
    .select("company_name, position_title, application_date, contact_email")
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
    .select("id, enabled, next_follow_up_date")
    .eq("job_application_id", job_application_id)
    .eq("user_id", userId)
    .maybeSingle()

  if (followUpError) {
    return NextResponse.json({ error: followUpError.message }, { status: 500 })
  }

  if (!followUp || !followUp.enabled) {
    return NextResponse.json({ error: "Follow-up reminders are not enabled for this application" }, { status: 400 })
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: "Unable to verify sender identity" }, { status: 401 })
  }

  const verifiedEmail = user.email && (user.email_confirmed_at || user.confirmed_at) ? user.email : null
  const allowedEmails = [application.contact_email, verifiedEmail].filter(Boolean)
  const allowedDomains = getAllowedDomains()

  if (!isAllowedRecipient({ recipient, allowedEmails, allowedDomains })) {
    return NextResponse.json({ error: "Recipient is not allowed for this reminder" }, { status: 403 })
  }

  const requestIp = getRequestIp(request)
  const now = new Date()
  const rateLimitError = await checkReminderRateLimits({
    supabase,
    userId,
    jobApplicationId: job_application_id,
    recipient,
    requestIp,
    now,
  })
  if (rateLimitError) {
    return rateLimitError
  }

  const emailSubject = subject ?? `Reminder: Follow up with ${application.company_name}`
  const defaultMessage = `It’s time to reach out about your ${application.position_title ?? "No Position Title"} application at ${
    application.company_name
  }.\n\nSign in to get a refresher on the position and take the next steps.\n\nNeed help?\n\nWe’ve prepped an AI draft for you that spotlights your best-fit skills for the role. You're welcome :)`
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

  const { error: logError } = await supabase.from("follow_up_reminder_sends").insert({
    user_id: userId,
    job_application_id,
    recipient,
    ip_address: requestIp,
  })

  if (logError) {
    return NextResponse.json({ error: logError.message }, { status: 500 })
  }

  const { data, error } = await supabase
    .from("application_follow_ups")
    .update({
      last_notified_at: now.toISOString(),
      next_follow_up_date: null,
      updated_at: now.toISOString(),
    })
    .eq("id", followUp.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const nextReadable = data.next_follow_up_date ? format(new Date(data.next_follow_up_date), "MMM d, yyyy") : null

  return NextResponse.json({ data: { ...data, next_follow_up_readable: nextReadable } })
}
