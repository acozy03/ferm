"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { format, formatDistanceToNow } from "date-fns"
import { CheckCircle2, Clock, Mail } from "lucide-react"

import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"

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

function computeNextReminder(followUp: ApplicationFollowUp | undefined): Date | null {
  if (!followUp?.enabled) {
    return null
  }

  return getDateOrNull(followUp.next_follow_up_date ?? null)
}

function formatDateForInput(date: Date | null): string {
  if (!date) {
    return ""
  }

  return format(date, "yyyy-MM-dd")
}

function isoStringToDateInput(value: string | null | undefined): string {
  const parsed = getDateOrNull(value ?? null)
  return formatDateForInput(parsed)
}

function localDateInputToISOString(value: string | undefined): string | null {
  if (!value) {
    return null
  }

  const [rawYear, rawMonth, rawDay] = value.split("-")
  const year = Number.parseInt(rawYear ?? "", 10)
  const month = Number.parseInt(rawMonth ?? "", 10)
  const day = Number.parseInt(rawDay ?? "", 10)

  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    return null
  }

  const localDate = new Date(year, month - 1, day, 0, 0, 0, 0)
  return Number.isNaN(localDate.getTime()) ? null : localDate.toISOString()
}

export default function FollowUpsPage() {
  const { toast } = useToast()
  const { applications, isLoading: isLoadingApplications, error } = useJobApplications({ limit: 200 })
  const { followUps, isLoading: isLoadingFollowUps, mutate } = useApplicationFollowUps()
  const [draftDates, setDraftDates] = useState<Record<string, string>>({})
  const [pending, setPending] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const next: Record<string, string> = {}
    applications.forEach((application) => {
      const followUp = followUps.find((item) => item.job_application_id === application.id)
      next[application.id] = isoStringToDateInput(followUp?.next_follow_up_date ?? null)
    })
    setDraftDates(next)
  }, [applications, followUps])

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

  const handleDateCommit = useCallback(
    (applicationId: string, enabled: boolean, nextDateValue: string, previousDateValue: string) => {
      if (!nextDateValue) {
        if (enabled) {
          toast({
            title: "Reminder date required",
            description: "Choose a date to receive your follow-up reminder.",
            variant: "destructive",
          })
          setDraftDates((previous) => ({ ...previous, [applicationId]: previousDateValue }))
          return
        }

        if (!previousDateValue) {
          return
        }

        void updateFollowUp(applicationId, enabled, null)
        return
      }

      if (nextDateValue === previousDateValue) {
        return
      }

      const iso = localDateInputToISOString(nextDateValue)
      if (!iso) {
        toast({
          title: "Invalid date",
          description: "Enter a valid reminder date.",
          variant: "destructive",
        })
        setDraftDates((previous) => ({ ...previous, [applicationId]: previousDateValue }))
        return
      }

      void updateFollowUp(applicationId, enabled, iso)
    },
    [toast, updateFollowUp],
  )

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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(isLoading ? Array.from({ length: 3 }) : summaryCards).map((item, index) => (
                <Card key={item ? item.label : index}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {item ? item.label : <Skeleton className="h-4 w-24" />}
                    </CardTitle>
                    {item && <item.icon className="h-5 w-5 text-primary" />}
                  </CardHeader>
                  <CardContent>
                    {item ? (
                      <>
                        <div className="text-2xl font-semibold">{item.value}</div>
                        <p className="text-sm text-muted-foreground mt-2">{item.helper}</p>
                      </>
                    ) : (
                      <div className="space-y-3">
                        <Skeleton className="h-8 w-16" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section>
            <Card>
              <CardHeader>
                <CardTitle>Reminder schedule</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {isLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <Skeleton key={index} className="h-16 w-full" />
                    ))}
                  </div>
                ) : rows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Add job applications to start planning your follow-up cadence.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Role</TableHead>
                          <TableHead className="hidden lg:table-cell">Applied</TableHead>
                          <TableHead className="hidden lg:table-cell">Status</TableHead>
                          <TableHead>Reminder date</TableHead>
                          <TableHead>Next reminder</TableHead>
                          <TableHead className="hidden xl:table-cell">Last reminder</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((row) => {
                          const draftDate = draftDates[row.application.id] ?? isoStringToDateInput(row.followUp?.next_follow_up_date ?? null)
                          const isPending = pending[row.application.id]
                          const storedDate = isoStringToDateInput(row.followUp?.next_follow_up_date ?? null)
                          return (
                            <TableRow
                              key={row.application.id}
                              className={cn(row.status === "due" && "bg-destructive/5")}
                            >
                              <TableCell className="max-w-xs">
                                <div className="font-medium line-clamp-1">{row.application.company_name}</div>
                                <div className="text-sm text-muted-foreground line-clamp-2">
                                  {row.application.position_title}
                                </div>
                              </TableCell>
                              <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                                {(() => {
                                  const appliedDate = getDateOrNull(row.application.application_date)
                                  return appliedDate ? format(appliedDate, "MMM d, yyyy") : "Date unavailable"
                                })()}
                              </TableCell>
                              <TableCell className="hidden lg:table-cell">
                                <Badge variant="outline" className={getStatusBadgeTone(row.status)}>
                                  {row.status === "due" ? "Due" : row.status === "upcoming" ? "Scheduled" : "Off"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Switch
                                    checked={row.enabled}
                                    onCheckedChange={(checked) => {
                                      if (checked === row.enabled) {
                                        return
                                      }

                                      const existingDate = draftDates[row.application.id] ?? storedDate
                                      let nextDateValue = existingDate

                                      if (checked && !nextDateValue) {
                                        const today = formatDateForInput(new Date())
                                        nextDateValue = today
                                        setDraftDates((previous) => ({ ...previous, [row.application.id]: today }))
                                      }

                                      const iso = localDateInputToISOString(nextDateValue)

                                      if (checked && !iso) {
                                        toast({
                                          title: "Invalid date",
                                          description: "Enter a valid reminder date before enabling.",
                                          variant: "destructive",
                                        })
                                        return
                                      }

                                      void updateFollowUp(row.application.id, checked, iso)
                                    }}
                                    disabled={isPending}
                                  />
                                  <div className="space-y-1">
                                    <Label
                                      htmlFor={`reminder-${row.application.id}`}
                                      className="text-xs text-muted-foreground"
                                    >
                                      Remind me on
                                    </Label>
                                    <Input
                                      id={`reminder-${row.application.id}`}
                                      type="date"
                                      value={draftDate}
                                      onChange={(event) => {
                                        const { value } = event.target
                                        setDraftDates((previous) => ({ ...previous, [row.application.id]: value }))
                                      }}
                                      onBlur={() => {
                                        const value = draftDates[row.application.id] ?? ""
                                        handleDateCommit(row.application.id, row.enabled, value, storedDate)
                                      }}
                                      className="h-9 w-36"
                                      disabled={isPending}
                                    />
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                {row.enabled && row.nextReminder ? (
                                  <span className="text-sm font-medium">
                                    {row.status === "due"
                                      ? `Due ${formatDistanceToNow(row.nextReminder, { addSuffix: true })}`
                                      : format(row.nextReminder, "MMM d, yyyy")}
                                  </span>
                                ) : (
                                  <span className="text-sm text-muted-foreground">Not scheduled</span>
                                )}
                              </TableCell>
                              <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">
                                {row.lastSent ? format(row.lastSent, "MMM d, yyyy") : "Never"}
                              </TableCell>
                              <TableCell className="flex items-center justify-end gap-2">
                                <FollowUpDraftDialog application={row.application} disabled={!row.enabled} />
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
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
