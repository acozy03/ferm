"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { FileText, Loader2, UploadCloud, ShieldAlert } from "lucide-react"

import { Header } from "@/components/header"
import { useSupabase } from "@/components/supabase-provider"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/components/ui/use-toast"

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_EXTENSIONS = ["pdf", "doc", "docx"] as const

interface ResumeInfo {
  name: string
  path: string
  signedUrl: string
  updatedAt?: string
  size?: number
}

function formatFileSize(bytes?: number) {
  if (!bytes || Number.isNaN(bytes)) {
    return "Unknown size"
  }

  if (bytes < 1024) {
    return `${bytes} B`
  }

  const kb = bytes / 1024
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`
  }

  const mb = kb / 1024
  return `${mb.toFixed(2)} MB`
}

export default function ResumePage() {
  const { supabase, user, isLoading: isAuthLoading } = useSupabase()
  const [resume, setResume] = useState<ResumeInfo | null>(null)
  const [isFetching, setIsFetching] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const acceptedTypesDescription = useMemo(
    () => `Accepted formats: ${ALLOWED_EXTENSIONS.map((ext) => ext.toUpperCase()).join(", ")} • Max size ${Math.round(MAX_FILE_SIZE / (1024 * 1024))} MB`,
    [],
  )

  const fetchResume = useCallback(async () => {
    if (!user) {
      setResume(null)
      return
    }

    setIsFetching(true)
    setErrorMessage(null)

    try {
      const { data: files, error: listError } = await supabase.storage
        .from("resumes")
        .list(user.id, {
          limit: 1,
          sortBy: { column: "updated_at", order: "desc" },
          includeMetadata: true,
        })

      if (listError) {
        throw listError
      }

      const file = files?.[0]

      if (!file) {
        setResume(null)
        return
      }

      const path = `${user.id}/${file.name}`
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from("resumes")
        .createSignedUrl(path, 60 * 60)

      if (signedUrlError) {
        throw signedUrlError
      }

      if (!signedUrlData?.signedUrl) {
        throw new Error("Unable to generate a download link for your resume.")
      }

      setResume({
        name: file.name,
        path,
        signedUrl: signedUrlData.signedUrl,
        updatedAt: file.updated_at ?? file.created_at,
        size: typeof file.metadata?.size === "number" ? file.metadata.size : undefined,
      })
    } catch (error) {
      console.error("Failed to fetch resume:", error)
      setResume(null)
      setErrorMessage("We couldn't load your resume. Please try again or upload a new file.")
    } finally {
      setIsFetching(false)
    }
  }, [supabase, user])

  useEffect(() => {
    if (!user) {
      if (!isAuthLoading) {
        setResume(null)
      }
      return
    }

    void fetchResume()
  }, [fetchResume, isAuthLoading, user])

  const handleUpload = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const input = event.target
      const file = input.files?.[0]

      input.value = ""

      if (!file) {
        return
      }

      if (!user) {
        const message = "You need to be signed in to upload a resume."
        setErrorMessage(message)
        toast({ title: "Upload unavailable", description: message, variant: "destructive" })
        return
      }

      const extension = file.name.split(".").pop()?.toLowerCase() ?? ""
      if (!ALLOWED_EXTENSIONS.includes(extension as (typeof ALLOWED_EXTENSIONS)[number])) {
        const message = "Please upload a PDF, DOC, or DOCX file."
        setErrorMessage(message)
        toast({ title: "Invalid file type", description: message, variant: "destructive" })
        return
      }

      if (file.size > MAX_FILE_SIZE) {
        const message = "Your resume must be 5 MB or smaller."
        setErrorMessage(message)
        toast({ title: "File too large", description: message, variant: "destructive" })
        return
      }

      setIsUploading(true)
      setErrorMessage(null)

      try {
        const { data: existingFiles, error: listError } = await supabase.storage.from("resumes").list(user.id)

        if (listError) {
          throw listError
        }

        if (existingFiles && existingFiles.length > 0) {
          const { error: removeError } = await supabase.storage
            .from("resumes")
            .remove(existingFiles.map((item) => `${user.id}/${item.name}`))

          if (removeError) {
            throw removeError
          }
        }

        const sanitizedExtension = extension || "pdf"
        const path = `${user.id}/resume.${sanitizedExtension}`

        const { error: uploadError } = await supabase.storage
          .from("resumes")
          .upload(path, file, {
            cacheControl: "3600",
            upsert: true,
            contentType: file.type || undefined,
          })

        if (uploadError) {
          throw uploadError
        }

        toast({ title: "Resume updated", description: "Your resume has been uploaded successfully." })
        await fetchResume()
      } catch (error) {
        console.error("Failed to upload resume:", error)
        const rawMessage =
          error instanceof Error && error.message
            ? error.message
            : "Something went wrong while uploading your resume. Please try again."
        const message = rawMessage.includes("row level security")
          ? "Upload blocked by storage security policies. Double-check the bucket policies in Supabase."
          : rawMessage
        setErrorMessage(message)
        toast({ title: "Upload failed", description: message, variant: "destructive" })
      } finally {
        setIsUploading(false)
      }
    },
    [fetchResume, supabase, user],
  )

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 px-4 sm:px-6">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold">Resume manager</h1>
            <p className="text-muted-foreground text-pretty">
              Store a single source of truth for your resume. Upload a new file any time you need to replace it—the previous copy
              will be removed automatically.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Current resume</CardTitle>
              <CardDescription>Upload a PDF, DOC, or DOCX file up to 5&nbsp;MB.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {errorMessage && (
                <Alert variant="destructive">
                  <ShieldAlert className="h-4 w-4" />
                  <AlertTitle>Something isn&apos;t right</AlertTitle>
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}

              {isAuthLoading || isFetching ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-9 w-32" />
                </div>
              ) : !user ? (
                <Alert>
                  <FileText className="h-4 w-4" />
                  <AlertTitle>Sign in to manage your resume</AlertTitle>
                  <AlertDescription>
                    <span className="block">Resume uploads require an authenticated account.</span>
                    <Link href="/landing" className="font-medium text-primary underline underline-offset-4">
                      Go to the sign-in page
                    </Link>
                  </AlertDescription>
                </Alert>
              ) : resume ? (
                <div className="space-y-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-base">{resume.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {resume.updatedAt
                          ? `Last updated ${formatDistanceToNow(new Date(resume.updatedAt), { addSuffix: true })}`
                          : "Last updated information unavailable"}
                        {resume.size ? ` • ${formatFileSize(resume.size)}` : null}
                      </p>
                    </div>
                    <Button asChild variant="outline">
                      <a href={resume.signedUrl} target="_blank" rel="noopener noreferrer">
                        Download resume
                      </a>
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    The download link is temporary for security and will refresh automatically when you revisit this page.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="font-medium">No resume uploaded yet</p>
                  <p className="text-sm text-muted-foreground">
                    Upload your resume to keep it handy for applications and interviews.
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground text-pretty">{acceptedTypesDescription}</p>
              <div className="flex items-center gap-3">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={handleUpload}
                  disabled={isUploading || !user}
                />
                <Button
                  type="button"
                  variant="default"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || !user}
                  className="gap-2"
                >
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                  {resume ? "Replace resume" : "Upload resume"}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  )
}
