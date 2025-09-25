import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { UpdateJobApplicationData } from "@/lib/types/database"
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
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
    const { id } = params

    const { data, error } = await supabase
      .from("job_applications")
      .select(`
        *,
        interviews(*),
        activity_log(*)
      `)
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "Job application not found" }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Failed to load job application", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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
    const { id } = params
    const body: Partial<UpdateJobApplicationData> = await request.json()
    const updates: Partial<UpdateJobApplicationData> = { ...body }
    delete (updates as { id?: string }).id
    delete (updates as { user_id?: string }).user_id

    const { data, error } = await supabase
      .from("job_applications")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Failed to update job application", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
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
    const { id } = params

    const { error } = await supabase
      .from("job_applications")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: "Job application deleted successfully" })
  } catch (error) {
    console.error("Failed to delete job application", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
