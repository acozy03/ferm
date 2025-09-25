import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { BulkUpdateJobApplicationsData } from "@/lib/types/api"
import type { CreateJobApplicationData } from "@/lib/types/database"

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest) {
  try {
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
    delete (sanitizedUpdates as { user_id?: string }).user_id

    const { data, error } = await supabase
      .from("job_applications")
      .update(sanitizedUpdates)
      .in("id", ids)
      .eq("user_id", user.id)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
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
