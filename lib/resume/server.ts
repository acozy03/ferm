import "server-only"
import mammoth from "mammoth"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"

let _pdfParse: any | null = null
async function getPdfParse() {
  if (_pdfParse) return _pdfParse
  // Import our local CJS bridge; this guarantees the CJS build is used.
  const mod: any = await import("./pdf-parse.cjs")
  _pdfParse = mod?.default ?? mod
  return _pdfParse
}

const RESUME_BUCKET = "resumes"
const RESUME_TEXTS_TABLE = "resume_texts"
const MAX_RESUME_CHARACTERS = 12000

export interface ResumeTextResult {
  text: string
  fileName: string
  updatedAt: string | null
}

function sanitizeText(input: string) {
  return input.replace(/\u0000/g, "").trim()
}
function truncateText(input: string, maxLength: number) {
  if (input.length <= maxLength) return input
  return `${input.slice(0, maxLength)}\n...[truncated]`
}

async function extractResumeText(buffer: Buffer, fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? ""

  if (extension === "pdf") {
    const pdfParse = await getPdfParse()
    const result = await pdfParse(buffer)
    return sanitizeText(result.text || "")
  }

  if (extension === "docx") {
    const { value } = await mammoth.extractRawText({ buffer })
    return sanitizeText(value || "")
  }

  try {
    return sanitizeText(buffer.toString("utf-8"))
  } catch (error) {
    console.warn(`Failed to decode resume ${fileName} as UTF-8`, error)
    return ""
  }
}

function extractFileNameFromPath(path: string, userId: string) {
  const prefix = `${userId}/`
  if (path.startsWith(prefix)) {
    return path.slice(prefix.length) || "resume"
  }

  const segments = path.split("/")
  return segments.at(-1) || "resume"
}

async function upsertResumeText({
  userId,
  fileName,
  text,
}: {
  userId: string
  fileName: string
  text: string
}): Promise<ResumeTextResult> {
  const adminClient = createAdminSupabaseClient()
  const sanitizedFileName = fileName || "resume"
  const truncated = truncateText(text, MAX_RESUME_CHARACTERS)
  const trimmed = truncated.trim()

  if (!trimmed) {
    const { error: deleteError } = await adminClient.from(RESUME_TEXTS_TABLE).delete().eq("user_id", userId)

    if (deleteError && deleteError.code !== "PGRST116") {
      throw deleteError
    }

    return { fileName: sanitizedFileName, text: "", updatedAt: null }
  }

  const updatedAt = new Date().toISOString()
  const { error: upsertError } = await adminClient
    .from(RESUME_TEXTS_TABLE)
    .upsert(
      {
        user_id: userId,
        file_name: sanitizedFileName,
        text: trimmed,
        updated_at: updatedAt,
      },
      { onConflict: "user_id" },
    )

  if (upsertError) {
    throw upsertError
  }

  return { fileName: sanitizedFileName, text: trimmed, updatedAt }
}

async function downloadLatestResume({
  userId,
  path,
}: {
  userId: string
  path?: string | null
}): Promise<{ buffer: Buffer; fileName: string } | null> {
  const adminClient = createAdminSupabaseClient()

  let targetPath = path ?? null
  let fileName: string | null = null

  if (!targetPath) {
    const { data: files, error: listError } = await adminClient.storage
      .from(RESUME_BUCKET)
      .list(userId, { limit: 1, sortBy: { column: "updated_at", order: "desc" } })

    if (listError) throw listError

    const file = files?.[0]
    if (!file) return null

    targetPath = `${userId}/${file.name}`
    fileName = file.name
  } else {
    fileName = extractFileNameFromPath(targetPath, userId)
  }

  if (!targetPath || !fileName) {
    return null
  }

  const { data: blob, error: downloadError } = await adminClient.storage.from(RESUME_BUCKET).download(targetPath)

  if (downloadError) throw downloadError

  const arrayBuffer = await blob.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  return { buffer, fileName }
}

export async function refreshResumeText(userId: string, path?: string | null) {
  const download = await downloadLatestResume({ userId, path })

  if (!download) {
    return null
  }

  const rawText = await extractResumeText(download.buffer, download.fileName)

  if (!rawText) {
    await upsertResumeText({ userId, fileName: download.fileName, text: "" })
    return null
  }

  return upsertResumeText({ userId, fileName: download.fileName, text: rawText })
}

export async function getLatestResumeText(userId: string): Promise<ResumeTextResult | null> {
  const adminClient = createAdminSupabaseClient()
  const { data, error } = await adminClient
    .from(RESUME_TEXTS_TABLE)
    .select("file_name, text, updated_at")
    .eq("user_id", userId)
    .maybeSingle()

  if (error && error.code !== "PGRST116") {
    throw error
  }

  if (data?.text) {
    return {
      fileName: data.file_name ?? "resume",
      text: data.text,
      updatedAt: data.updated_at ?? null,
    }
  }

  return refreshResumeText(userId)
}
