"use client"

import { useEffect, useMemo, useState } from "react"
import { format, formatDistanceToNow } from "date-fns"
import { CalendarClock, CalendarIcon, CheckCircle2, ClipboardPen, NotebookPen, Plus } from "lucide-react"

import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Calendar } from "@/components/ui/calendar"
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
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
const timeOptions = Array.from({ length: 96 }, (_, index) => {
  const hours = Math.floor(index / 4)
  const minutes = (index % 4) * 15

  const value = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
  const period = hours >= 12 ? "PM" : "AM"
  const displayHour = hours % 12 === 0 ? 12 : hours % 12
  const label = `${displayHour}:${minutes.toString().padStart(2, "0")} ${period}`

  return { value, label }
})
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
  const [selectedInterviewId, setSelectedInterviewId] = useState<string | null>(null)
  const [formState, setFormState] = useState({
    job_application_id: "",
    interview_type: interviewTypeOptions[0],
    duration_minutes: "60",
    interviewer_name: "",
    interviewer_email: "",
    notes: "",
    prep_notes: "",
    post_interview_notes: "",
    status: "Scheduled" as InterviewStatus,
  })
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined)
  const [scheduledTime, setScheduledTime] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formErrors, setFormErrors] = useState<{
    job_application_id?: string
    scheduled_date?: string
  }>({})
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null)

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

  const sortedInterviews = useMemo(() => {
    return [...interviews].sort((a, b) => {
      const first = new Date(a.scheduled_date).getTime()
      const second = new Date(b.scheduled_date).getTime()

      return Number.isNaN(second) || Number.isNaN(first) ? 0 : second - first
    })
  }, [interviews])

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
        duration_minutes: "60",
        interviewer_name: "",
        interviewer_email: "",
        notes: "",
        prep_notes: "",
        post_interview_notes: "",
        status: "Scheduled",
      })
      setScheduledDate(undefined)
      setScheduledTime("")
      setFormErrors({})
      setFormErrorMessage(null)
    }
  }

  useEffect(() => {
    if (sortedInterviews.length === 0) {
      setSelectedInterviewId(null)
      return
    }

    setSelectedInterviewId((current) => {
      if (current && sortedInterviews.some((interview) => interview.id === current)) {
        return current
      }

      return sortedInterviews[0]?.id ?? null
    })
  }, [sortedInterviews])

  const handleCreateInterview = async () => {
    const newErrors: typeof formErrors = {}

    if (!formState.job_application_id) {
      newErrors.job_application_id = "Select a job"
    }

    if (!scheduledDate || !scheduledTime.trim()) {
      newErrors.scheduled_date = "Add a date and time"
    }

    setFormErrors(newErrors)

    if (Object.keys(newErrors).length > 0) {
      setFormErrorMessage("")
      return
    }

    setFormErrorMessage(null)

    const [hours, minutes] = scheduledTime.split(":").map(Number)
    const hasValidTime = Number.isFinite(hours) && Number.isFinite(minutes)

    if (!scheduledDate || !hasValidTime) {
      setFormErrors((prev) => ({
        ...prev,
        scheduled_date: newErrors.scheduled_date ?? "Add a valid date and time",
      }))
      setFormErrorMessage("Fill in the required fields before saving.")
      return
    }

    const scheduledDateTime = new Date(scheduledDate)
    scheduledDateTime.setHours(hours ?? 0, minutes ?? 0, 0, 0)

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
        scheduled_date: scheduledDateTime.toISOString(),
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

  const selectedInterview = useMemo(
    () => sortedInterviews.find((interview) => interview.id === selectedInterviewId) ?? null,
    [selectedInterviewId, sortedInterviews],
  )

  return (
    <div className="flex h-screen flex-col bg-background overflow-hidden">
      <Header />
      <main className="flex-1 overflow-hidden px-6 pb-6 pt-24">
        <div className="mx-auto flex h-full max-w-7xl flex-col gap-6">
          <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <CardHeader className="gap-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                

                <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
                  <Button onClick={() => handleDialogChange(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Log interview
                  </Button>
                  <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-4xl">
                    <DialogHeader>
                      <DialogTitle>Log interview</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Job application</Label>
                          <Select
                            value={formState.job_application_id}
                            onValueChange={(value) => {
                              setFormState((prev) => ({ ...prev, job_application_id: value }))
                              setFormErrors((prev) => ({ ...prev, job_application_id: undefined }))
                            }}
                            disabled={eligibleApplications.length === 0}
                          >
                            <SelectTrigger
                              className={cn(
                                "w-full",
                                formErrors.job_application_id &&
                                  "border-destructive focus-visible:ring-destructive",
                              )}
                            >
                              <SelectValue
                                placeholder={
                                  isLoadingApplications
                                    ? "Loading applications..."
                                    : eligibleApplications.length === 0
                                        ? "Update job statuses to log interviews"
                                        : "Select a job"
                                }
                              />
                            </SelectTrigger>
                            <SelectContent className="w-[--radix-select-trigger-width]">
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
                          {formErrors.job_application_id ? (
                            <p className="text-sm text-destructive">{formErrors.job_application_id}</p>
                          ) : null}
                        </div>
                        <div className="space-y-2">
                          <Label>Interview type</Label>
                          <Select
                            value={formState.interview_type}
                            onValueChange={(value) =>
                              setFormState((prev) => ({ ...prev, interview_type: value as InterviewType }))
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="w-[--radix-select-trigger-width]">
                              {interviewTypeOptions.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Status</Label>
                          <Select
                            value={formState.status}
                            onValueChange={(value) =>
                              setFormState((prev) => ({ ...prev, status: value as InterviewStatus }))
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="w-[--radix-select-trigger-width]">
                              {interviewStatusOptions.map((status) => (
                                <SelectItem key={status} value={status}>
                                  {status}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                      <div className="space-y-2">
                        <Label>Scheduled for</Label>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal sm:w-auto sm:flex-1",
                                  formErrors.scheduled_date &&
                                    "border-destructive focus-visible:ring-destructive",
                                )}
                                onClick={() =>
                                  setFormErrors((prev) => ({ ...prev, scheduled_date: undefined }))
                                }
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {scheduledDate ? format(scheduledDate, "PPP") : "Pick a date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={scheduledDate}
                                onSelect={(date) => {
                                  setScheduledDate(date ?? undefined)
                                  setFormErrors((prev) => ({ ...prev, scheduled_date: undefined }))
                                }}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <Select
                            value={scheduledTime}
                            onValueChange={(value) => {
                              setScheduledTime(value)
                              setFormErrors((prev) => ({ ...prev, scheduled_date: undefined }))
                            }}
                          >
                            <SelectTrigger
                              className={cn(
                                "w-full sm:w-[200px]",
                                formErrors.scheduled_date &&
                                  "border-destructive focus-visible:ring-destructive",
                              )}
                            >
                              <SelectValue placeholder="Time" />
                            </SelectTrigger>
                            <SelectContent className="w-[--radix-select-trigger-width]">
                              {timeOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {formErrors.scheduled_date ? (
                          <p className="text-sm text-destructive">{formErrors.scheduled_date}</p>
                        ) : null}
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Interviewer name</Label>
                          <Input
                            value={formState.interviewer_name}
                            onChange={(event) =>
                              setFormState((prev) => ({ ...prev, interviewer_name: event.target.value }))
                            }
                            placeholder="Who are you meeting with?"
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
                            placeholder="Add their email for quick reference"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Interview notes</Label>
                          <Textarea
                            value={formState.notes}
                            onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))}
                            placeholder="Add any prep notes or agenda items"
                            className="min-h-[80px]"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Prep notes</Label>
                          <Textarea
                            value={formState.prep_notes}
                            onChange={(event) => setFormState((prev) => ({ ...prev, prep_notes: event.target.value }))}
                            placeholder="Key stories, research, or questions to cover"
                            className="min-h-[80px]"
                          />
                        </div>
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
                      {formErrorMessage && (
                        <p className="text-sm text-destructive">{formErrorMessage}</p>
                      )}
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

            
            </CardHeader>

            <CardContent className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
              {isLoading ? (
                <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[360px_1fr]">
                  <div className="space-y-3">
                    {[...Array(4)].map((_, index) => (
                      <Skeleton key={index} className="h-24 w-full" />
                    ))}
                  </div>
                  <Skeleton className="h-full w-full" />
                </div>
              ) : interviews.length === 0 ? (
                <div className="flex flex-1 items-center justify-center text-center">
                  <div className="space-y-2">
                    <p className="text-lg font-semibold">No interviews yet</p>
                    <p className="text-sm text-muted-foreground">
                      Log your first interview to see details and notes here.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[360px_1fr]">
                  <div className="flex min-h-0 flex-col rounded-lg border bg-muted/40">
                    <div className="border-b px-4 py-3">
                      <p className="text-sm font-medium">All interviews</p>
                      <p className="text-xs text-muted-foreground">Tap a row to view prep and notes.</p>
                    </div>
                    <ScrollArea className="flex-1">
                      <div className="space-y-3 p-4 pr-2">
                        {sortedInterviews.map((interview) => {
                          const scheduledDate = new Date(interview.scheduled_date)
                          const formattedDate = Number.isNaN(scheduledDate.getTime())
                            ? "Date unavailable"
                            : format(scheduledDate, "MMM d, yyyy")
                          const timeLabel = Number.isNaN(scheduledDate.getTime())
                            ? ""
                            : format(scheduledDate, "h:mm a")

                          return (
                            <button
                              key={interview.id}
                              type="button"
                              onClick={() => setSelectedInterviewId(interview.id)}
                              className={cn(
                                "w-full rounded-lg border p-3 text-left transition",
                                selectedInterviewId === interview.id
                                  ? "border-primary bg-primary/5 shadow-sm"
                                  : "border-border/70 bg-card hover:border-primary/40",
                              )}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1">
                                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                    {interview.job_applications?.company_name ?? "Company"}
                                  </p>
                                  <p className="text-sm font-semibold leading-tight">
                                    {interview.job_applications?.position_title ?? "Interview"}
                                  </p>
                                </div>
                                <Badge variant="outline" className={statusClassMap[interview.status]}>
                                  {interview.status}
                                </Badge>
                              </div>
                              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <CalendarClock className="h-3.5 w-3.5" />
                                <span>{formattedDate}</span>
                                {timeLabel ? <span>• {timeLabel}</span> : null}
                                {interview.interview_type ? (
                                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
                                    {interview.interview_type}
                                  </span>
                                ) : null}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </ScrollArea>
                  </div>

                  <div className="min-h-0 rounded-lg border bg-card p-4 shadow-sm">
                    {selectedInterview ? (
                      <div className="flex h-full flex-col gap-4 overflow-hidden">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm text-muted-foreground">
                              {selectedInterview.job_applications?.company_name ?? "Company"}
                            </p>
                            <h2 className="text-xl font-semibold tracking-tight">
                              {selectedInterview.job_applications?.position_title ?? "Interview"}
                            </h2>
                          </div>
                          <Badge variant="outline" className={statusClassMap[selectedInterview.status]}>
                            {selectedInterview.interview_type}
                          </Badge>
                        </div>

                        <div className="text-sm text-muted-foreground">
                          {selectedInterview.scheduled_date ? (
                            <div className="flex items-center gap-2">
                              <CalendarClock className="h-4 w-4" />
                              <span>
                                {format(new Date(selectedInterview.scheduled_date), "MMM d, yyyy • h:mm a")}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                ({formatDistanceToNow(new Date(selectedInterview.scheduled_date), { addSuffix: true })})
                              </span>
                            </div>
                          ) : (
                            <p>Date unavailable</p>
                          )}
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto">
                          <InterviewNotesCard
                            interview={selectedInterview}
                            onSave={handleSaveNotes}
                            onStatusChange={handleStatusChange}
                            pendingId={pendingId}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-full items-center justify-center text-center">
                        <div className="space-y-2">
                          <p className="text-lg font-semibold">Select an interview</p>
                          <p className="text-sm text-muted-foreground">
                            Choose a row on the left to view details, notes, and status changes.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
