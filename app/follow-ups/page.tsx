"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { format, formatDistanceToNow } from "date-fns"
import { CheckCircle2, Clock, Mail } from "lucide-react"

import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import { useSettings } from "@/components/settings-provider"
import { useSupabase } from "@/components/supabase-provider"

import { useJobApplications } from "@/lib/hooks/use-job-applications"
import { useApplicationFollowUps } from "@/lib/hooks/use-application-follow-ups"
import type { ApplicationFollowUp, JobApplication } from "@/lib/types/database"
import { cn } from "@/lib/utils"
import { getDateOrNull, getDateOrNow } from "@/lib/date"

import { FollowUpDraftDialog } from "@/components/follow-up-draft-dialog"
export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const DEFAULT_INTERVAL = 7
const MAX_INTERVAL = 60

type FollowUpRow = {
  application: JobApplication
  followUp: ApplicationFollowUp | undefined
  intervalDays: number
  enabled: boolean
  nextReminder: Date | null
  lastSent: Date | null
  status: "due" | "upcoming" | "disabled"
}

function computeNextReminder(
  application: JobApplication,
  intervalDays: number,
  followUp: ApplicationFollowUp | undefined,
): Date | null {
  if (!followUp?.enabled) {
    return null
  }

  if (followUp.next_follow_up_date) {
    const parsed = getDateOrNull(followUp.next_follow_up_date)
    if (parsed) {
      return parsed
    }
  }

  const baselineSource = followUp?.last_notified_at ?? application.application_date
  const baseline = getDateOrNow(baselineSource)
  const candidate = new Date(baseline)
  candidate.setDate(candidate.getDate() + intervalDays)
  return candidate
}

export default function FollowUpsPage() {
  const { toast } = useToast()
  const { applications, isLoading: isLoadingApplications, error } = useJobApplications({ limit: 200 })
  const { followUps, isLoading: isLoadingFollowUps, mutate } = useApplicationFollowUps()
  const { settings } = useSettings()
  const { user } = useSupabase()
  const [draftIntervals, setDraftIntervals] = useState<Record<string, number>>({})
  const [pending, setPending] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const next: Record<string, number> = {}
    applications.forEach((application) => {
      const followUp = followUps.find((item) => item.job_application_id === application.id)
      next[application.id] = followUp?.interval_days ?? DEFAULT_INTERVAL
    })
    setDraftIntervals(next)
  }, [applications, followUps])

  const rows = useMemo<FollowUpRow[]>(() => {
    const now = Date.now()
    return applications.map((application) => {
      const followUp = followUps.find((item) => item.job_application_id === application.id)
      const intervalDays = draftIntervals[application.id] ?? followUp?.interval_days ?? DEFAULT_INTERVAL
      const enabled = followUp?.enabled ?? false
      const nextReminder = computeNextReminder(application, intervalDays, followUp)
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
        intervalDays,
        enabled,
        nextReminder,
        lastSent,
        status,
      }
    })
  }, [applications, draftIntervals, followUps])

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
    async (applicationId: string, enabled: boolean, intervalDays: number) => {
      setPendingState(applicationId, true)
      try {
        const response = await fetch("/api/follow-ups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            job_application_id: applicationId,
            enabled,
            interval_days: intervalDays,
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

  const sendReminder = useCallback(
    async (application: JobApplication, recipientOverride?: string) => {
      console.log("ENTER sendReminder", { appId: application.id })

      const normalize = (v?: string | null) => {
        const t = (v ?? "").trim()
        return t.length ? t : null
      }

      const sEmail = normalize(settings?.email)
      const uEmail = normalize(user?.email)
      const rEmail = normalize(recipientOverride)

      // use || so empty strings don't short-circuit
      const recipient = rEmail || sEmail || uEmail

      console.log("resolved recipient", { recipient, sEmail, uEmail })
      if (!recipient) {
        toast({
          title: "Add your email",
          description: "Update your profile email in Settings to receive follow-up reminders.",
          variant: "destructive",
        })
        return
      }
      console.log("right before pending state")
      setPendingState(application.id, true)
      try {
        console.log("Reached")
        const response = await fetch("/api/follow-ups/remind", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            job_application_id: application.id,
            recipient,
          }),
        })

        if (!response.ok) {
          const body = await response.json().catch(() => ({ error: "Failed to send reminder" }))
          throw new Error(body.error ?? "Failed to send reminder")
        }

        toast({
          title: "Reminder sent",
          description: `We just emailed you a nudge to follow up with ${application.company_name}.`,
        })
        await mutate()
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to send reminder"
        toast({ title: "Reminder failed", description: message, variant: "destructive" })
      } finally {
        setPendingState(application.id, false)
      }
    },
    [mutate, setPendingState, settings.email, toast, user?.email],
  )

  const handleIntervalCommit = useCallback(
    (applicationId: string, enabled: boolean, nextInterval: number, previousInterval?: number) => {
      if (Number.isNaN(nextInterval) || nextInterval < 1 || nextInterval > MAX_INTERVAL) {
        setDraftIntervals((previous) => ({
          ...previous,
          [applicationId]: previousInterval ?? DEFAULT_INTERVAL,
        }))
        toast({
          title: "Invalid interval",
          description: `Choose a cadence between 1 and ${MAX_INTERVAL} days.`,
          variant: "destructive",
        })
        return
      }

      if (previousInterval === nextInterval) {
        return
      }

      void updateFollowUp(applicationId, enabled, nextInterval)
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
                          <TableHead>Interval (days)</TableHead>
                          <TableHead>Next reminder</TableHead>
                          <TableHead className="hidden xl:table-cell">Last reminder</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((row) => {
                          const draftInterval = draftIntervals[row.application.id] ?? row.intervalDays
                          const isPending = pending[row.application.id]
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
                                      const interval = draftIntervals[row.application.id] ?? row.intervalDays
                                      if (checked === row.enabled && row.followUp?.interval_days === interval) {
                                        return
                                      }
                                      setDraftIntervals((previous) => ({ ...previous, [row.application.id]: interval }))
                                      void updateFollowUp(row.application.id, checked, interval)
                                    }}
                                    disabled={isPending}
                                  />
                                  <div className="space-y-1">
                                    <Label
                                      htmlFor={`interval-${row.application.id}`}
                                      className="text-xs text-muted-foreground"
                                    >
                                      Every
                                    </Label>
                                    <Input
                                      id={`interval-${row.application.id}`}
                                      type="number"
                                      min={1}
                                      max={MAX_INTERVAL}
                                      value={draftInterval}
                                      onChange={(event) => {
                                        const raw = Number.parseInt(event.target.value, 10)
                                        const value = Number.isNaN(raw) ? 0 : raw
                                        setDraftIntervals((previous) => ({ ...previous, [row.application.id]: value }))
                                      }}
                                      onBlur={() => {
                                        const value = draftIntervals[row.application.id] ?? row.intervalDays
                                        handleIntervalCommit(
                                          row.application.id,
                                          row.enabled,
                                          value,
                                          row.followUp?.interval_days,
                                        )
                                      }}
                                      className="h-9 w-20"
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
                                <FollowUpDraftDialog
                                  application={row.application}
                                  intervalDays={draftInterval}
                                  disabled={!row.enabled}
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={isPending}
                                  onClick={() => {
    console.log("CLICK", { enabled: row.enabled, id: row.application.id })
    if (!row.enabled) {
      console.log("BLOCKED: reminders are OFF for", row.application.id)
      // keep the toast if you want, but this proves the guard is tripping
      return
    }
    console.log("CALLING sendReminder for", row.application.id)
    void sendReminder(row.application)
  }}
>
                                  Send reminder
                                </Button>
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
