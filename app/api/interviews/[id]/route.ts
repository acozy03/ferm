import { type NextRequest, NextResponse } from "next/server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { UpdateInterviewData } from "@/lib/types/database"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params

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

    const body: Partial<UpdateInterviewData> = await request.json()
    const updates: Partial<UpdateInterviewData> = { ...body }
    delete (updates as { id?: string }).id
    delete (updates as { user_id?: string }).user_id

    const { data, error } = await supabase
      .from("interviews")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select(`
        *,
        job_applications(company_name, position_title)
      `)
      .single()

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 500
      const message = error.code === "PGRST116" ? "Interview not found" : error.message
      return NextResponse.json({ error: message }, { status })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Failed to update interview", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params

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

    const { error } = await supabase.from("interviews").delete().eq("id", id).eq("user_id", user.id)

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 500
      const message = error.code === "PGRST116" ? "Interview not found" : error.message
      return NextResponse.json({ error: message }, { status })
    }

    return NextResponse.json({}, { status: 204 })
  } catch (error) {
    console.error("Failed to delete interview", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
