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
const MAX_RESUME_CHARACTERS = 12000

export interface ResumeTextResult {
  text: string
  fileName: string
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

export async function getLatestResumeText(userId: string): Promise<ResumeTextResult | null> {
  const adminClient = createAdminSupabaseClient()

  const { data: files, error: listError } = await adminClient.storage
    .from(RESUME_BUCKET)
    .list(userId, { limit: 1, sortBy: { column: "updated_at", order: "desc" } })
  if (listError) throw listError

  const file = files?.[0]
  if (!file) return null

  const path = `${userId}/${file.name}`
  const { data: blob, error: downloadError } = await adminClient.storage.from(RESUME_BUCKET).download(path)
  if (downloadError) throw downloadError

  const arrayBuffer = await blob.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const rawText = await extractResumeText(buffer, file.name)
  if (!rawText) return null

  return { fileName: file.name, text: truncateText(rawText, MAX_RESUME_CHARACTERS) }
}
