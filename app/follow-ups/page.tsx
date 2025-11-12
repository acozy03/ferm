"use client"

import { useCallback, useMemo, useState } from "react"
import { format, formatDistanceToNow } from "date-fns"
import { CheckCircle2, Clock, Mail } from "lucide-react"

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
import { Skeleton } from "@/components/ui/skeleton"
import { Calendar } from "@/components/ui/calendar"
import { useToast } from "@/components/ui/use-toast"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { useJobApplications } from "@/lib/hooks/use-job-applications"
import { useApplicationFollowUps } from "@/lib/hooks/use-application-follow-ups"
import type { ApplicationFollowUp, JobApplication } from "@/lib/types/database"
import { cn } from "@/lib/utils"
import { getDateOrNull } from "@/lib/date"

import { FollowUpDraftDialog } from "@/components/follow-up-draft-dialog"
export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type FollowUpRow = {
  application: JobApplication
  followUp: ApplicationFollowUp | undefined
  enabled: boolean
  nextReminder: Date | null
  lastSent: Date | null
  status: "due" | "upcoming" | "disabled"
}

type ReminderDialogState = {
  application: JobApplication
  date: Date | null
  isEnabling: boolean
}

type SortValue = "status" | "next" | "applied" | "company"

const sortOptions: { label: string; value: SortValue }[] = [
  { label: "Status (due first)", value: "status" },
  { label: "Next reminder", value: "next" },
  { label: "Applied date", value: "applied" },
  { label: "Company name", value: "company" },
]

function computeNextReminder(followUp: ApplicationFollowUp | undefined): Date | null {
  if (!followUp?.enabled) {
    return null
  }

  return getDateOrNull(followUp.next_follow_up_date ?? null)
}

function dateToLocalISOString(date: Date | null): string | null {
  if (!date) {
    return null
  }

  const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
  return Number.isNaN(localDate.getTime()) ? null : localDate.toISOString()
}

export default function FollowUpsPage() {
  const { toast } = useToast()
  const { applications, isLoading: isLoadingApplications, error } = useJobApplications({ limit: 200 })
  const { followUps, isLoading: isLoadingFollowUps, mutate } = useApplicationFollowUps()
  const [pending, setPending] = useState<Record<string, boolean>>({})
  const [reminderDialog, setReminderDialog] = useState<ReminderDialogState | null>(null)
  const [sortBy, setSortBy] = useState<SortValue>("status")

  const rows = useMemo<FollowUpRow[]>(() => {
    const now = Date.now()
    return applications.map((application) => {
      const followUp = followUps.find((item) => item.job_application_id === application.id)
      const enabled = followUp?.enabled ?? false
      const nextReminder = computeNextReminder(followUp)
      const lastSent = getDateOrNull(followUp?.last_notified_at ?? null)
      let status: FollowUpRow["status"] = "disabled"
      if (enabled && nextReminder) {
        status = nextReminder.getTime() <= now ? "due" : "upcoming"
      } else if (enabled) {
        status = "upcoming"
      }

      return {
        application,
        followUp,
        enabled,
        nextReminder,
        lastSent,
        status,
      }
    })
  }, [applications, followUps])

  const enabledRows = rows.filter((row) => row.enabled)
  const dueRows = enabledRows.filter((row) => row.status === "due")
  const upcomingRows = enabledRows
    .filter((row) => row.status === "upcoming")
    .sort((a, b) => {
      const left = a.nextReminder ? a.nextReminder.getTime() : Number.POSITIVE_INFINITY
      const right = b.nextReminder ? b.nextReminder.getTime() : Number.POSITIVE_INFINITY
      return left - right
    })

  const sortedRows = useMemo(() => {
    const items = [...rows]
    switch (sortBy) {
      case "status": {
        const priority: Record<FollowUpRow["status"], number> = { due: 0, upcoming: 1, disabled: 2 }
        return items.sort((a, b) => {
          const statusDiff = priority[a.status] - priority[b.status]
          if (statusDiff !== 0) {
            return statusDiff
          }

          const left = a.nextReminder ? a.nextReminder.getTime() : Number.POSITIVE_INFINITY
          const right = b.nextReminder ? b.nextReminder.getTime() : Number.POSITIVE_INFINITY
          return left - right
        })
      }
      case "next":
        return items.sort((a, b) => {
          const left = a.nextReminder ? a.nextReminder.getTime() : Number.POSITIVE_INFINITY
          const right = b.nextReminder ? b.nextReminder.getTime() : Number.POSITIVE_INFINITY
          return left - right
        })
      case "applied":
        return items.sort((a, b) => {
          const left = getDateOrNull(a.application.application_date)?.getTime() ?? 0
          const right = getDateOrNull(b.application.application_date)?.getTime() ?? 0
          return right - left
        })
      case "company":
        return items.sort((a, b) => {
          const left = a.application.company_name ?? ""
          const right = b.application.company_name ?? ""
          return left.localeCompare(right)
        })
      default:
        return items
    }
  }, [rows, sortBy])

  const isLoading = isLoadingApplications || isLoadingFollowUps

  const setPendingState = useCallback((id: string, value: boolean) => {
    setPending((previous) => ({ ...previous, [id]: value }))
  }, [])

  const updateFollowUp = useCallback(
    async (applicationId: string, enabled: boolean, nextReminder: string | null) => {
      setPendingState(applicationId, true)
      try {
        const response = await fetch("/api/follow-ups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            job_application_id: applicationId,
            enabled,
            next_follow_up_date: nextReminder,
          }),
        })

        if (!response.ok) {
          const body = await response.json().catch(() => ({ error: "Unable to update follow-up preferences" }))
          throw new Error(body.error ?? "Unable to update follow-up preferences")
        }

        toast({ title: "Follow-up reminder updated" })
        await mutate()
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to update follow-up preferences"
        toast({ title: "Update failed", description: message, variant: "destructive" })
      } finally {
        setPendingState(applicationId, false)
      }
    },
    [mutate, setPendingState, toast],
  )

  const openReminderDialog = useCallback((row: FollowUpRow, options?: { isEnabling?: boolean }) => {
    const fallbackDate = row.nextReminder
      ? new Date(row.nextReminder)
      : row.followUp?.next_follow_up_date
        ? getDateOrNull(row.followUp.next_follow_up_date)
        : new Date()

    setReminderDialog({
      application: row.application,
      date: fallbackDate ?? new Date(),
      isEnabling: options?.isEnabling ?? false,
    })
  }, [])

  const summaryCards = [
    {
      label: "Reminders enabled",
      value: enabledRows.length,
      helper:
        dueRows.length > 0 ? `${dueRows.length} reminder${dueRows.length === 1 ? "" : "s"} ready to send` : "All reminders scheduled",
      icon: CheckCircle2,
    },
    {
      label: "Upcoming follow-ups",
      value: upcomingRows.length,
      helper:
        upcomingRows[0]?.nextReminder
          ? `Next in ${formatDistanceToNow(upcomingRows[0].nextReminder, { addSuffix: true })}`
          : "No follow-ups scheduled",
      icon: Clock,
    },
    {
      label: "Reminders sent",
      value: followUps.filter((item) => item.last_notified_at).length,
      helper: "Total nudges emailed to you",
      icon: Mail,
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <header className="space-y-2">
            <h1 className="text-3xl font-semibold">Follow-up playbook</h1>
            <p className="text-muted-foreground text-pretty">
              Decide when to check in on each application, generate a polished follow-up email, and let ferm.dev deliver the reminder.
            </p>
          </header>

     

          <section>
            <Card>
              <CardHeader>
                <CardTitle>Reminder schedule</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {isLoading ? (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <Card key={index} className="border-dashed">
                        <CardHeader>
                          <Skeleton className="h-5 w-24" />
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-4 w-2/3" />
                          <Skeleton className="h-10 w-full" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : rows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Add job applications to start planning your follow-up cadence.
                  </p>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm text-muted-foreground">Arrange your follow-ups to focus on what matters first.</p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">Sort by</span>
                        <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortValue)}>
                          <SelectTrigger className="w-[200px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {sortOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {sortedRows.map((row) => {
                        const isPending = pending[row.application.id]
                        const appliedDate = getDateOrNull(row.application.application_date)
                        const appliedLabel = appliedDate ? format(appliedDate, "MMM d, yyyy") : "Date unavailable"
                        const nextReminderLabel = row.enabled && row.nextReminder
                          ? row.status === "due"
                            ? `Due ${formatDistanceToNow(row.nextReminder, { addSuffix: true })}`
                            : format(row.nextReminder, "MMM d, yyyy")
                          : "Not scheduled"
                        const lastReminderLabel = row.lastSent ? format(row.lastSent, "MMM d, yyyy") : "Never"

                        return (
                          <Card
                            key={row.application.id}
                            className={cn(
                              "flex h-full flex-col border transition",
                              row.status === "due" && "border-destructive/60 shadow-[0_0_0_1px] shadow-destructive/10",
                            )}
                          >
                            <CardHeader className="space-y-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1">
                                  <CardTitle className="text-lg font-semibold">
                                    {row.application.company_name}
                                  </CardTitle>
                                  <p className="text-sm text-muted-foreground">
                                    {row.application.position_title}
                                  </p>
                                </div>
                                <Badge variant="outline" className={getStatusBadgeTone(row.status)}>
                                  {row.status === "due"
                                    ? "Follow-up due"
                                    : row.status === "upcoming"
                                      ? "Scheduled"
                                      : "Off"}
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent className="flex flex-1 flex-col justify-between space-y-4">
                              <div className="space-y-3 text-sm">
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-muted-foreground">Applied</span>
                                  <span className="font-medium">{appliedLabel}</span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-muted-foreground">Next reminder</span>
                                  <span className="font-medium text-right">{nextReminderLabel}</span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-muted-foreground">Last reminder</span>
                                  <span className="font-medium">{lastReminderLabel}</span>
                                </div>
                              </div>

                              <div className="flex flex-col gap-3 border-t pt-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <FollowUpDraftDialog
                                    application={row.application}
                                    disabled={!row.enabled || isPending}
                                    hasGeneratedDraft={Boolean(row.application.ai_follow_up_draft_generated_at)}
                                  />
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openReminderDialog(row, { isEnabling: !row.enabled })}
                                    disabled={isPending}
                                  >
                                    Set reminder
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {error && (
            <div className="rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
              <p>There was a problem loading your applications. Please refresh and try again.</p>
            </div>
          )}
        </div>
      </main>

      <Dialog
        open={Boolean(reminderDialog)}
        onOpenChange={(open) => {
          if (!open) {
            setReminderDialog(null)
          }
        }}
      >
        <DialogContent className="flex flex-col gap-4 sm:max-w-[420px]">
          <DialogHeader className="text-center">
            <DialogTitle>
              {reminderDialog?.isEnabling ? "Schedule your next reminder" : "Update reminder"}
            </DialogTitle>
            <DialogDescription>
              {reminderDialog
                ? `Choose when ferm.dev should remind you about ${reminderDialog.application.company_name}.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-1 items-center justify-center">
            <Calendar
              mode="single"
              selected={reminderDialog?.date ?? undefined}
              defaultMonth={reminderDialog?.date ?? undefined}
              onSelect={(date) => {
                setReminderDialog((previous) => (previous ? { ...previous, date: date ?? previous.date } : previous))
              }}
              className="w-full max-w-[360px] rounded-md border p-4"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setReminderDialog(null)}
              disabled={reminderDialog ? pending[reminderDialog.application.id] : false}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!reminderDialog) {
                  return
                }

                const iso = dateToLocalISOString(reminderDialog.date)

                if (!iso) {
                  toast({
                    title: "Select a date",
                    description: "Pick when you’d like to be reminded.",
                    variant: "destructive",
                  })
                  return
                }

                void updateFollowUp(reminderDialog.application.id, true, iso)
                setReminderDialog(null)
              }}
              disabled={reminderDialog ? pending[reminderDialog.application.id] : false}
            >
              Save reminder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function getStatusBadgeTone(status: FollowUpRow["status"]) {
  switch (status) {
    case "due":
      return "bg-destructive/10 text-destructive border-destructive/40"
    case "upcoming":
      return "bg-primary/10 text-primary border-primary/40"
    default:
      return "bg-muted text-muted-foreground border-muted"
  }
}
