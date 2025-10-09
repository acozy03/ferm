import { NextResponse } from "next/server"
import { z } from "zod"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { refreshResumeText } from "@/lib/resume/server"

const BodySchema = z
  .object({
    path: z.string().min(1).optional(),
  })
  .optional()

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let path: string | undefined

  if (request.body) {
    try {
      const json = await request.json()
      const parsed = BodySchema.safeParse(json)

      if (parsed.success) {
        path = parsed.data?.path
      }
    } catch (error) {
      console.warn("Failed to parse resume sync payload", error)
    }
  }

  if (path && !path.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "Invalid resume path" }, { status: 400 })
  }

  try {
    const result = await refreshResumeText(user.id, path)

    if (!result) {
      return NextResponse.json({ error: "No resume found to sync" }, { status: 404 })
    }

    return NextResponse.json({
      data: {
        fileName: result.fileName,
        updatedAt: result.updatedAt,
      },
    })
  } catch (error) {
    console.error("Failed to refresh resume text", error)
    return NextResponse.json({ error: "Failed to refresh resume text" }, { status: 500 })
  }
}

export async function DELETE() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createAdminSupabaseClient()

  const { error } = await admin.from("resume_texts").delete().eq("user_id", user.id)

  if (error && error.code !== "PGRST116") {
    console.error("Failed to remove stored resume text", error)
    return NextResponse.json({ error: "Failed to remove stored resume text" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
