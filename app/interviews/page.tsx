"use client"

import { useEffect, useMemo, useState } from "react"
import { format, formatDistanceToNow } from "date-fns"
import { CalendarClock, CheckCircle2, ClipboardPen, NotebookPen, Plus } from "lucide-react"

import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import { useInterviews } from "@/lib/hooks/use-interviews"
import { useJobApplications } from "@/lib/hooks/use-job-applications"
import { getStatusRound } from "@/lib/status"
import type {
  InterviewStatus,
  InterviewType,
  InterviewWithApplication,
} from "@/lib/types/database"

type NotesUpdatePayload = Pick<InterviewWithApplication, "prep_notes" | "post_interview_notes">

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const interviewTypeOptions: InterviewType[] = ["Phone", "Video", "In-person", "Technical", "Final"]
const interviewStatusOptions: InterviewStatus[] = ["Scheduled", "Completed", "Cancelled", "Rescheduled"]
const statusClassMap: Record<InterviewStatus, string> = {
  Scheduled: "border-primary/30 text-primary",
  Completed: "border-emerald-500/40 text-emerald-500",
  Cancelled: "border-destructive/30 text-destructive",
  Rescheduled: "border-amber-500/40 text-amber-500",
}

interface InterviewNotesCardProps {
  interview: InterviewWithApplication
  onSave: (id: string, payload: NotesUpdatePayload) => Promise<void>
  onStatusChange: (id: string, status: InterviewStatus) => Promise<void>
  pendingId: string | null
}

function InterviewNotesCard({ interview, onSave, onStatusChange, pendingId }: InterviewNotesCardProps) {
  const [prepNotes, setPrepNotes] = useState(interview.prep_notes ?? "")
  const [postNotes, setPostNotes] = useState(interview.post_interview_notes ?? "")

  useEffect(() => {
    setPrepNotes(interview.prep_notes ?? "")
    setPostNotes(interview.post_interview_notes ?? "")
  }, [interview.id, interview.post_interview_notes, interview.prep_notes])

  const scheduledDate = new Date(interview.scheduled_date)
  const formattedDate = Number.isNaN(scheduledDate.getTime())
    ? "Date unavailable"
    : format(scheduledDate, "MMM d, yyyy • h:mm a")
  const relativeTime = Number.isNaN(scheduledDate.getTime())
    ? ""
    : formatDistanceToNow(scheduledDate, { addSuffix: true })

  const isDirty =
    prepNotes !== (interview.prep_notes ?? "") || postNotes !== (interview.post_interview_notes ?? "")

  const isPending = pendingId === interview.id

  return (
    <Card className="shadow-sm border-border/70">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm text-muted-foreground">
              {interview.job_applications?.company_name ?? "Company"}
            </p>
            <h3 className="text-lg font-semibold tracking-tight">
              {interview.job_applications?.position_title ?? "Interview"}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={interview.status}
              onValueChange={(value) => onStatusChange(interview.id, value as InterviewStatus)}
              disabled={isPending}
            >
              <SelectTrigger className="w-[140px] text-left">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {interviewStatusOptions.map((status) => (
                  <SelectItem value={status} key={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="outline" className={statusClassMap[interview.status]}>
              {interview.interview_type}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <CalendarClock className="h-4 w-4" />
          <span>{formattedDate}</span>
          {relativeTime && <span className="text-xs text-muted-foreground">({relativeTime})</span>}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ClipboardPen className="h-4 w-4" />
            <span>Prep notes</span>
          </div>
          <Textarea
            value={prepNotes}
            onChange={(event) => setPrepNotes(event.target.value)}
            placeholder="Research the company, confirm portfolio links, outline stories to share..."
            className="min-h-[90px]"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <NotebookPen className="h-4 w-4" />
            <span>Post-interview recap</span>
          </div>
          <Textarea
            value={postNotes}
            onChange={(event) => setPostNotes(event.target.value)}
            placeholder="Document how the conversation went, follow-up questions, or next steps."
            className="min-h-[90px]"
          />
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={!isDirty || isPending}
            onClick={() => onSave(interview.id, { prep_notes: prepNotes, post_interview_notes: postNotes })}
          >
            Save notes
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function InterviewsPage() {
  const { toast } = useToast()
  const { interviews, isLoading, mutate } = useInterviews()
  const { applications, isLoading: isLoadingApplications } = useJobApplications<undefined, true>({
    limit: 200,
    include_interviews: true,
  })
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [formState, setFormState] = useState({
    job_application_id: "",
    interview_type: interviewTypeOptions[0],
    scheduled_date: "",
    duration_minutes: "60",
    interviewer_name: "",
    interviewer_email: "",
    notes: "",
    prep_notes: "",
    post_interview_notes: "",
    status: "Scheduled" as InterviewStatus,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const upcoming = useMemo(() => {
    const current = Date.now()
    return interviews.filter((interview) => {
      const when = new Date(interview.scheduled_date).getTime()
      return interview.status === "Scheduled" && when >= current
    })
  }, [interviews])

  const completed = useMemo(
    () => interviews.filter((interview) => interview.status === "Completed"),
    [interviews],
  )

  const eligibleApplications = useMemo(() => {
    return applications.filter((application) => {
      const maxInterviewRound = getStatusRound(application.status) ?? 0
      const loggedInterviews = application.interviews?.length ?? 0

      return maxInterviewRound > 0 && loggedInterviews < maxInterviewRound
    })
  }, [applications])

  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open)
    if (!open) {
      setFormState({
        job_application_id: "",
        interview_type: interviewTypeOptions[0],
        scheduled_date: "",
        duration_minutes: "60",
        interviewer_name: "",
        interviewer_email: "",
        notes: "",
        prep_notes: "",
        post_interview_notes: "",
        status: "Scheduled",
      })
    }
  }

  const handleCreateInterview = async () => {
    if (!formState.job_application_id || !formState.scheduled_date) {
      toast({
        title: "Missing details",
        description: "Select a job and date to schedule the interview.",
        variant: "destructive",
      })
      return
    }

    const isEligible = eligibleApplications.some(
      (application) => application.id === formState.job_application_id,
    )

    if (!isEligible) {
      toast({
        title: "Update job status first",
        description: "Progress the job to the next interview round before logging it.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        ...formState,
        scheduled_date: new Date(formState.scheduled_date).toISOString(),
        duration_minutes: Number(formState.duration_minutes) || 60,
        notes: formState.notes.trim() || undefined,
        prep_notes: formState.prep_notes.trim() || undefined,
        post_interview_notes: formState.post_interview_notes.trim() || undefined,
        interviewer_name: formState.interviewer_name.trim() || undefined,
        interviewer_email: formState.interviewer_email.trim() || undefined,
      }

      const response = await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error("Failed to create interview")
      }

      toast({ title: "Interview logged", description: "Keep prepping and add notes as you go." })
      handleDialogChange(false)
      await mutate()
    } catch (error) {
      console.error(error)
      toast({
        title: "Unable to save interview",
        description: "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveNotes = async (id: string, payload: NotesUpdatePayload) => {
    setPendingId(id)
    try {
      const response = await fetch(`/api/interviews/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error("Failed to update interview")
      }

      toast({ title: "Notes saved" })
      await mutate()
    } catch (error) {
      console.error(error)
      toast({ title: "Unable to update interview", variant: "destructive" })
    } finally {
      setPendingId(null)
    }
  }

  const handleStatusChange = async (id: string, status: InterviewStatus) => {
    setPendingId(id)
    try {
      const response = await fetch(`/api/interviews/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })

      if (!response.ok) {
        throw new Error("Failed to update status")
      }

      toast({ title: "Interview updated", description: `Marked as ${status}.` })
      await mutate()
    } catch (error) {
      console.error(error)
      toast({ title: "Unable to change status", variant: "destructive" })
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 px-6 pt-24 pb-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Interviews</h1>
              <p className="text-muted-foreground">
                Log every conversation, plan your prep, and debrief quickly for each job.
              </p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
              <Button onClick={() => handleDialogChange(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Log interview
              </Button>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Log interview</DialogTitle>
                  <DialogDescription>Attach an interview to a job and capture prep details.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label>Job application</Label>
                    <Select
                      value={formState.job_application_id}
                      onValueChange={(value) => setFormState((prev) => ({ ...prev, job_application_id: value }))}
                      disabled={eligibleApplications.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={
                          isLoadingApplications
                            ? "Loading applications..."
                            : eligibleApplications.length === 0
                              ? "Update job statuses to log interviews"
                              : "Select a job"
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {eligibleApplications.length === 0 ? (
                          <SelectItem value="" disabled>
                            No jobs ready for interviews yet
                          </SelectItem>
                        ) : (
                          eligibleApplications.map((application) => (
                          <SelectItem key={application.id} value={application.id}>
                            {application.company_name} — {application.position_title}
                          </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Interview type</Label>
                      <Select
                        value={formState.interview_type}
                        onValueChange={(value) =>
                          setFormState((prev) => ({ ...prev, interview_type: value as InterviewType }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {interviewTypeOptions.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        value={formState.status}
                        onValueChange={(value) =>
                          setFormState((prev) => ({ ...prev, status: value as InterviewStatus }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {interviewStatusOptions.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Scheduled for</Label>
                      <Input
                        type="datetime-local"
                        value={formState.scheduled_date}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, scheduled_date: event.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Duration (minutes)</Label>
                      <Input
                        type="number"
                        min={10}
                        value={formState.duration_minutes}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, duration_minutes: event.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Interviewer name</Label>
                      <Input
                        value={formState.interviewer_name}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, interviewer_name: event.target.value }))
                        }
                        placeholder="e.g. Alex at Hiring"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Interviewer email</Label>
                      <Input
                        type="email"
                        value={formState.interviewer_email}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, interviewer_email: event.target.value }))
                        }
                        placeholder="alex@example.com"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Agenda & reminders</Label>
                    <Textarea
                      value={formState.notes}
                      onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))}
                      placeholder="Anything you want to remember going into the call"
                      className="min-h-[80px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Prep checklist</Label>
                    <Textarea
                      value={formState.prep_notes}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, prep_notes: event.target.value }))
                      }
                      placeholder="Key stories, research, or questions to cover"
                      className="min-h-[80px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Post-interview notes</Label>
                    <Textarea
                      value={formState.post_interview_notes}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, post_interview_notes: event.target.value }))
                      }
                      placeholder="Capture takeaways right after the call"
                      className="min-h-[80px]"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => handleDialogChange(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateInterview} disabled={isSubmitting}>
                    Save interview
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="space-y-1">
                <p className="text-sm text-muted-foreground">Upcoming</p>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <CalendarClock className="h-5 w-5 text-primary" />
                  {upcoming.length}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="space-y-1">
                <p className="text-sm text-muted-foreground">Completed</p>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  {completed.length}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="space-y-1">
                <p className="text-sm text-muted-foreground">Total logged</p>
                <CardTitle className="text-2xl">{interviews.length}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, index) => (
                <Skeleton key={index} className="h-48 w-full" />
              ))}
            </div>
          ) : interviews.length === 0 ? (
            <Card className="py-12 text-center">
              <CardContent>
                <p className="text-muted-foreground">
                  No interviews logged yet. Track prep and outcomes to build momentum.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-primary" />
                  <h2 className="text-xl font-semibold">Upcoming interviews</h2>
                </div>
                {upcoming.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No interviews scheduled yet.</p>
                ) : (
                  <div className="space-y-4">
                    {upcoming.map((interview) => (
                      <InterviewNotesCard
                        key={interview.id}
                        interview={interview}
                        onSave={handleSaveNotes}
                        onStatusChange={handleStatusChange}
                        pendingId={pendingId}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <h2 className="text-xl font-semibold">Past interviews & recaps</h2>
                </div>
                {completed.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No completed interviews yet.</p>
                ) : (
                  <div className="space-y-4">
                    {completed.map((interview) => (
                      <InterviewNotesCard
                        key={interview.id}
                        interview={interview}
                        onSave={handleSaveNotes}
                        onStatusChange={handleStatusChange}
                        pendingId={pendingId}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
