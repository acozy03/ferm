"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { differenceInCalendarDays } from "date-fns"
import { Loader2, Wand2, Copy } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import type { JobApplication } from "@/lib/types/database"
import { useToast } from "@/components/ui/use-toast"

interface FollowUpDraftDialogProps {
  application: JobApplication
  disabled?: boolean
  hasGeneratedDraft?: boolean
}

export function FollowUpDraftDialog({ application, disabled, hasGeneratedDraft }: FollowUpDraftDialogProps) {
  const storedDraft = application.ai_follow_up_draft_text?.trim() ?? ""
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(storedDraft)
  const [savedDraft, setSavedDraft] = useState(storedDraft)
  const [isGenerating, setIsGenerating] = useState(false)
  const [hasGenerated, setHasGenerated] = useState(Boolean(hasGeneratedDraft || storedDraft))
  const [hasRequestedGeneration, setHasRequestedGeneration] = useState(Boolean(hasGeneratedDraft || storedDraft))
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const nextStoredDraft = application.ai_follow_up_draft_text?.trim() ?? ""
    const hasExistingDraft = Boolean(hasGeneratedDraft || nextStoredDraft)
    setHasGenerated(hasExistingDraft)
    setHasRequestedGeneration(hasExistingDraft)

    if (!open && nextStoredDraft !== savedDraft) {
      setDraft(nextStoredDraft)
      setSavedDraft(nextStoredDraft)
    }
  }, [application.ai_follow_up_draft_text, hasGeneratedDraft, open, savedDraft])

  const hasUnsavedChanges = useMemo(() => draft !== savedDraft, [draft, savedDraft])

  const generateDraft = useCallback(async () => {
    if (hasGenerated) {
      toast({
        title: "Draft already generated",
        description: "You can only create one AI follow-up draft per application.",
      })
      return
    }

    setHasRequestedGeneration(true)
    setIsGenerating(true)
    try {
      const appliedAt = application.application_date ? new Date(application.application_date) : null
      const daysSinceApplication = appliedAt
        ? Math.max(0, differenceInCalendarDays(new Date(), appliedAt))
        : 0
      const response = await fetch("/api/follow-ups/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_application_id: application.id,
          companyName: application.company_name,
          positionTitle: application.position_title,
          contactName: application.contact_person,
          notes: application.notes,
          jobDescription: application.job_description,
          appliedAt: application.application_date,
          daysSinceApplication,
        }),
      })

      if (!response.ok) {
        if (response.status === 409) {
          setHasGenerated(true)
        }
        const body = await response.json().catch(() => ({ error: "Failed to generate follow-up" }))
        const existingDraft = typeof body?.data?.draft === "string" ? body.data.draft.trim() : ""
        if (existingDraft) {
          setDraft(existingDraft)
          setSavedDraft(existingDraft)
        } else {
          setHasRequestedGeneration(false)
        }
        throw new Error(body.error ?? "Failed to generate follow-up")
      }

      const payload = (await response.json()) as { data?: { draft?: string } }
      const content = payload.data?.draft?.trim()
      if (!content) {
        throw new Error("The AI response did not include a draft to share.")
      }

      setDraft(content)
      setSavedDraft(content)
      setHasGenerated(true)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate follow-up"
      toast({ title: "Draft failed", description: message, variant: "destructive" })
    } finally {
      setIsGenerating(false)
    }
  }, [application, hasGenerated, toast])

  const saveDraft = useCallback(async () => {
    if (!hasGenerated || !hasUnsavedChanges) {
      return
    }

    const sanitizedDraft = draft.trim()
    if (!sanitizedDraft) {
      toast({
        title: "Draft is empty",
        description: "Add some content before saving your changes.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch("/api/follow-ups/draft", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_application_id: application.id, draft: sanitizedDraft }),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: "Failed to save draft" }))
        throw new Error(body.error ?? "Failed to save draft")
      }

      setDraft(sanitizedDraft)
      setSavedDraft(sanitizedDraft)
      toast({ title: "Draft saved" })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save draft"
      toast({ title: "Save failed", description: message, variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }, [application.id, draft, hasGenerated, hasUnsavedChanges, toast])

  const handleCopy = useCallback(() => {
    if (!draft) return
    void navigator.clipboard.writeText(draft)
    toast({ title: "Draft copied" })
  }, [draft, toast])

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      setOpen(nextOpen)
      if (!nextOpen) {
        setIsGenerating(false)
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" disabled={disabled} className="gap-2">
          <Wand2 className="h-4 w-4" />
          AI draft
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Draft a follow-up email</DialogTitle>
          <DialogDescription>
            We&rsquo;ll help you compose a concise, friendly message to send to {application.contact_person ?? "the hiring team"}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {!hasGenerated && !hasRequestedGeneration && (
            <Button onClick={() => void generateDraft()} disabled={isGenerating} className="gap-2">
              {isGenerating && <Loader2 className="h-4 w-4 animate-spin" />}
              {isGenerating ? "Generating" : "Generate draft"}
            </Button>
          )}
          <div className="relative">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={10}
              placeholder="Your AI-generated follow-up will appear here."
              className="pr-12"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              disabled={!draft}
              className="absolute right-2 top-2"
            >
              <Copy className="h-4 w-4" />
              <span className="sr-only">Copy draft</span>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Edit anything you&rsquo;d like before sending it to your recruiter or hiring manager.
          </p>
        </div>
        <DialogFooter className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
          <span className="text-xs text-muted-foreground">
            {hasGenerated
              ? hasUnsavedChanges
                ? "You have unsaved changes."
                : draft
                  ? "All changes saved."
                  : "Your saved draft will appear here."
              : "Generate a draft to review it here."}
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => void saveDraft()}
              disabled={!hasGenerated || !hasUnsavedChanges || isSaving}
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSaving ? "Saving" : "Save changes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
