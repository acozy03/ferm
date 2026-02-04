import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { BulkUpdateJobApplicationsData } from "@/lib/types/api"
import type { CreateJobApplicationData } from "@/lib/types/database"
import { toNullableString } from "@/lib/utils"
import { isStatusProgressionAllowed, normalizeStatusValue, parseStatus } from "@/lib/status"
import { requireCookieCsrf } from "@/lib/api/auth"

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest) {
  try {
    const csrfError = requireCookieCsrf(request)
    if (csrfError) {
      return NextResponse.json({ error: csrfError.error.message }, { status: csrfError.error.status })
    }

    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 401 })
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const body: BulkUpdateJobApplicationsData = await request.json()
    const { ids, updates } = body

    if (!ids || ids.length === 0) {
      return NextResponse.json({ error: "No application IDs provided" }, { status: 400 })
    }

    const sanitizedUpdates: Partial<CreateJobApplicationData> = { ...updates }
    const nullableFields: (keyof CreateJobApplicationData)[] = [
      "location",
      "salary_range",
      "job_url",
      "contact_person",
      "contact_email",
      "notes",
      "job_description",
      "qualifications",
      "job_responsibilities",
    ]
    const mutableUpdates = sanitizedUpdates as Record<string, string | null | undefined>
    for (const field of nullableFields) {
      if (field in mutableUpdates) {
        mutableUpdates[field as string] = toNullableString(mutableUpdates[field as string])
      }
    }
    delete (sanitizedUpdates as { user_id?: string }).user_id
    delete (sanitizedUpdates as { resume_match_score?: number | null }).resume_match_score
    delete (sanitizedUpdates as { resume_match_summary?: string | null }).resume_match_summary

    const statusInPayload = Object.prototype.hasOwnProperty.call(sanitizedUpdates, "status")
    let previousStatuses: Record<string, string> = {}

    if (statusInPayload) {
      const { data: existingStatuses, error: existingError } = await supabase
        .from("job_applications")
        .select("id, status")
        .in("id", ids)
        .eq("user_id", user.id)

      if (existingError) {
        return NextResponse.json({ error: existingError.message }, { status: 500 })
      }

      previousStatuses = Object.fromEntries((existingStatuses ?? []).map((record) => [record.id, record.status]))

      if (typeof sanitizedUpdates.status === "string") {
        const nextStatus = normalizeStatusValue(sanitizedUpdates.status)
        const hasRegression = (existingStatuses ?? []).some((record) =>
          record?.status ? !isStatusProgressionAllowed(record.status, nextStatus) : false,
        )

        if (hasRegression) {
          return NextResponse.json(
            { error: "At least one application cannot move backwards in the pipeline" },
            { status: 400 },
          )
        }

        sanitizedUpdates.status = nextStatus
      }
    }

    const { data, error } = await supabase
      .from("job_applications")
      .update(sanitizedUpdates)
      .in("id", ids)
      .eq("user_id", user.id)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (statusInPayload) {
      for (const record of data ?? []) {
        if (!record?.id || !record?.status) continue
        if (previousStatuses[record.id] === record.status) continue

        const previousNormalized = parseStatus(previousStatuses[record.id]).value
        const nextNormalized = parseStatus(record.status).value

        if (nextNormalized === "Applied" && previousNormalized !== "Applied") {
          const { error: deleteError } = await supabase
            .from("job_application_status_history")
            .delete()
            .eq("job_application_id", record.id)
            .eq("user_id", user.id)

          if (deleteError) {
            console.error("Failed to clear status history during bulk reset", deleteError, {
              recordId: record.id,
            })
          }

          continue
        }

        const { error: historyError } = await supabase.from("job_application_status_history").insert({
          job_application_id: record.id,
          user_id: user.id,
          status: record.status,
          changed_at: record.updated_at ?? new Date().toISOString(),
        })

        if (historyError) {
          console.error("Failed to record status history for bulk update", historyError, { recordId: record.id })
        }
      }
    }

    return NextResponse.json({
      data,
      message: `Updated ${data.length} job applications`,
    })
  } catch (error) {
    console.error("Failed to bulk update job applications", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const csrfError = requireCookieCsrf(request)
    if (csrfError) {
      return NextResponse.json({ error: csrfError.error.message }, { status: csrfError.error.status })
    }

    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 401 })
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { ids }: { ids: string[] } = await request.json()

    if (!ids || ids.length === 0) {
      return NextResponse.json({ error: "No application IDs provided" }, { status: 400 })
    }

    const { error } = await supabase
      .from("job_applications")
      .delete()
      .in("id", ids)
      .eq("user_id", user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      message: `Deleted ${ids.length} job applications`,
    })
  } catch (error) {
    console.error("Failed to bulk delete job applications", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
