import { type NextRequest, NextResponse } from "next/server"
import { addDays, isValid } from "date-fns"
import { z } from "zod"

import { getAuthedClient } from "@/lib/api/auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const UpdateFollowUpSchema = z.object({
  job_application_id: z.string().uuid(),
  enabled: z.boolean(),
  interval_days: z.number().int().min(1).max(60),
})

export async function GET(request: NextRequest) {
  const auth = await getAuthedClient(request)
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status })
  }

  const { supabase, userId } = auth

  const { data, error } = await supabase
    .from("application_follow_ups")
    .select("*")
    .eq("user_id", userId)
    .order("next_follow_up_date", { ascending: true, nullsFirst: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: data ?? [] })
}

export async function POST(request: NextRequest) {
  const auth = await getAuthedClient(request)
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status })
  }

  const payload = UpdateFollowUpSchema.safeParse(await request.json())
  if (!payload.success) {
    return NextResponse.json({ error: payload.error.message }, { status: 400 })
  }

  const { supabase, userId } = auth
  const { job_application_id, enabled, interval_days } = payload.data

  const { data: application, error: applicationError } = await supabase
    .from("job_applications")
    .select("id, application_date")
    .eq("id", job_application_id)
    .eq("user_id", userId)
    .maybeSingle()

  if (applicationError) {
    return NextResponse.json({ error: applicationError.message }, { status: 500 })
  }

  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 })
  }

  const { data: existing, error: existingError } = await supabase
    .from("application_follow_ups")
    .select("*")
    .eq("job_application_id", job_application_id)
    .eq("user_id", userId)
    .maybeSingle()

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 })
  }

  const now = new Date()
  const baselineSource = existing?.last_notified_at ?? application.application_date
  const baselineDate = isValid(new Date(baselineSource)) ? new Date(baselineSource) : now
  const nextFollowUpDate = enabled ? addDays(baselineDate, interval_days) : null

  const record = {
    user_id: userId,
    job_application_id,
    enabled,
    interval_days,
    next_follow_up_date: nextFollowUpDate ? nextFollowUpDate.toISOString() : null,
    last_notified_at: existing?.last_notified_at ?? null,
    updated_at: now.toISOString(),
  }

  const query = existing
    ? supabase.from("application_follow_ups").update(record).eq("id", existing.id).select().single()
    : supabase
        .from("application_follow_ups")
        .upsert(record, { onConflict: "user_id,job_application_id" })
        .select()
        .single()

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}
