"use client"

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { apiFetch } from "@/lib/fetcher"
import { cn } from "@/lib/utils"

const CONTACT_TOPICS = [
  { value: "bug_report", label: "Bug Report" },
  { value: "feature_request", label: "Feature Request" },
  { value: "user_experience_feedback", label: "User Experience Feedback" },
  { value: "other", label: "Others" },
] as const

type ContactDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ContactDialog({ open, onOpenChange }: ContactDialogProps) {
  const { toast } = useToast()
  const [topic, setTopic] = useState("")
  const [details, setDetails] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleClose = useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])

  const canSubmit = useMemo(
    () => topic.trim().length > 0 && details.trim().length > 0 && !isSubmitting,
    [details, isSubmitting, topic],
  )

  useEffect(() => {
    if (!open) {
      setTopic("")
      setDetails("")
      setIsSubmitting(false)
    }
  }, [open])

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      if (!topic || !details.trim()) {
        toast({
          title: "Missing details",
          description: "Please choose a topic and share a few details so we can help.",
          variant: "destructive",
        })
        return
      }

      setIsSubmitting(true)
      try {
        const response = await apiFetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic, details: details.trim() }),
        })

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null
          const message = payload?.error ?? "Unable to send your message right now."
          throw new Error(message)
        }

        toast({
          title: "Message sent",
          description: "Thanks for the feedback! We’ll get back to you soon.",
        })
        handleClose()
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to send your message."
        toast({ title: "Send failed", description: message, variant: "destructive" })
      } finally {
        setIsSubmitting(false)
      }
    },
    [details, handleClose, toast, topic],
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton={false}>
        <DialogHeader className="space-y-2">
          <DialogTitle>Feedback &amp; Support</DialogTitle>
        </DialogHeader>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-3">
            <Label className="flex items-center gap-1">
              <span className="text-destructive">*</span>
              What brings you in today?
            </Label>
            <RadioGroup value={topic} onValueChange={setTopic} className="gap-2">
              {CONTACT_TOPICS.map((option) => (
                <label
                  key={option.value}
                  htmlFor={`contact-topic-${option.value}`}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border border-border/60 bg-muted/40 px-4 py-3 text-sm font-medium transition-colors",
                    topic === option.value && "border-primary bg-primary/10",
                  )}
                >
                  <RadioGroupItem id={`contact-topic-${option.value}`} value={option.value} />
                  <span>{option.label}</span>
                </label>
              ))}
            </RadioGroup>
          </div>
          <div className="space-y-3">
            <Label htmlFor="contact-details" className="flex items-center gap-1">
              <span className="text-destructive">*</span>
              Can you provide more details?
            </Label>
            <Textarea
              id="contact-details"
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="Please describe your experience or share your ideas"
              className="min-h-[140px]"
              required
            />
          </div>
          <div className="gap-2 flex w-full">
            <Button type="button" className="flex-1" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" className="min-w-[120px] flex-1" disabled={!canSubmit}>
              {isSubmitting ? "Sending..." : "Submit"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
