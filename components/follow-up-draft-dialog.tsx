"use client"

import { useCallback, useEffect, useState } from "react"
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
  const [isGenerating, setIsGenerating] = useState(false)
  const [hasGenerated, setHasGenerated] = useState(Boolean(hasGeneratedDraft || storedDraft))
  const { toast } = useToast()

  useEffect(() => {
    const nextStoredDraft = application.ai_follow_up_draft_text?.trim() ?? ""
    setHasGenerated(Boolean(hasGeneratedDraft || nextStoredDraft))

    if (!open && nextStoredDraft && nextStoredDraft !== draft) {
      setDraft(nextStoredDraft)
    }
  }, [application.ai_follow_up_draft_text, draft, hasGeneratedDraft, open])

  const generateDraft = useCallback(async () => {
    if (hasGenerated) {
      toast({
        title: "Draft already generated",
        description: "You can only create one AI follow-up draft per application.",
      })
      return
    }

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
        throw new Error(body.error ?? "Failed to generate follow-up")
      }

      const payload = (await response.json()) as { data?: { draft?: string } }
      const content = payload.data?.draft?.trim()
      if (!content) {
        throw new Error("The AI response did not include a draft to share.")
      }

      setDraft(content)
      setHasGenerated(true)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate follow-up"
      toast({ title: "Draft failed", description: message, variant: "destructive" })
    } finally {
      setIsGenerating(false)
    }
  }, [application, hasGenerated, toast])

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
          {!hasGenerated && (
            <Button onClick={() => void generateDraft()} disabled={isGenerating} className="gap-2">
              {isGenerating && <Loader2 className="h-4 w-4 animate-spin" />}
              {isGenerating ? "Generating" : "Generate draft"}
            </Button>
          )}
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={10}
            placeholder="Your AI-generated follow-up will appear here."
          />
          <p className="text-xs text-muted-foreground">
            {hasGenerated
              ? "This draft is saved to your application. Copy your message before you leave this page."
              : "Edit anything you&rsquo;d like before sending it to your recruiter or hiring manager."}
          </p>
        </div>
        <DialogFooter className="flex flex-row items-center justify-between gap-2 sm:flex-row">
          <span className="text-xs text-muted-foreground">
            {draft
              ? "Copy the draft and paste it into your email client."
              : hasGenerated
                ? "Your saved draft will appear here."
                : "Generate a draft to review it here."}
          </span>
          <Button variant="ghost" size="sm" onClick={handleCopy} disabled={!draft} className="gap-2">
            <Copy className="h-4 w-4" />
            Copy draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
