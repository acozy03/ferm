"use client"

import Link from "next/link"
import { useMemo } from "react"
import { formatDistanceToNow, isValid, parseISO } from "date-fns"
import { BellRing, CalendarClock, Clock, Mail } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useSettings } from "@/components/settings-provider"

import { useApplicationFollowUps } from "@/lib/hooks/use-application-follow-ups"
import { useJobApplications } from "@/lib/hooks/use-job-applications"
import type { ApplicationFollowUp, JobApplication } from "@/lib/types/database"
import { cn } from "@/lib/utils"

const MAX_VISIBLE_REMINDERS = 4

function computeNextReminder(
  application: JobApplication,
  followUp: ApplicationFollowUp,
): Date | null {
  if (!followUp.enabled) {
    return null
  }

  if (followUp.next_follow_up_date) {
    const parsed = parseISO(followUp.next_follow_up_date)
    if (isValid(parsed)) {
      return parsed
    }
  }

  const baselineSource = followUp.last_notified_at ?? application.application_date
  const baseline = isValid(new Date(baselineSource)) ? new Date(baselineSource) : new Date()
  const candidate = new Date(baseline)
  candidate.setDate(candidate.getDate() + followUp.interval_days)
  return candidate
}

type ReminderStatus = "overdue" | "soon" | "scheduled"

type ReminderTheme = {
  label: string
  badge: string
  container: string
}

const reminderThemes: Record<ReminderStatus, ReminderTheme> = {
  overdue: {
    label: "Overdue",
    badge: "border-rose-300/70 bg-rose-500/20 text-rose-50",
    container: "border-rose-500/40 bg-gradient-to-r from-rose-500/20 via-rose-500/10 to-transparent shadow-[0_10px_40px_-20px_rgba(244,63,94,0.65)]",
  },
  soon: {
    label: "Due soon",
    badge: "border-amber-300/80 bg-amber-400/20 text-amber-50",
    container: "border-amber-500/40 bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent shadow-[0_10px_40px_-24px_rgba(245,158,11,0.6)]",
  },
  scheduled: {
    label: "Scheduled",
    badge: "border-emerald-300/80 bg-emerald-500/20 text-emerald-50",
    container: "border-emerald-500/40 bg-gradient-to-r from-emerald-500/20 via-emerald-500/10 to-transparent shadow-[0_10px_40px_-24px_rgba(16,185,129,0.55)]",
  },
}

export function UpcomingReminders() {
  const { settings } = useSettings()
  const { followUps, isLoading: isLoadingFollowUps, error } = useApplicationFollowUps()
  const {
    applications,
    isLoading: isLoadingApplications,
    error: applicationsError,
  } = useJobApplications({ limit: 200 })

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        timeZone: settings.timezone,
      }),
    [settings.timezone],
  )

  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: settings.timezone,
      }),
    [settings.timezone],
  )

  const isLoading = isLoadingFollowUps || isLoadingApplications
  const loadError = error || applicationsError

  const reminders = useMemo(() => {
    const applicationMap = new Map(applications.map((application) => [application.id, application]))
    const now = Date.now()

    return followUps
      .map((followUp) => {
        const application = applicationMap.get(followUp.job_application_id)
        if (!application) {
          return null
        }

        const nextReminder = computeNextReminder(application, followUp)
        if (!nextReminder) {
          return null
        }

        const difference = nextReminder.getTime() - now
        let status: ReminderStatus = "scheduled"
        if (difference < 0) {
          status = "overdue"
        } else if (difference <= 1000 * 60 * 60 * 48) {
          status = "soon"
        }

        return {
          id: followUp.id,
          application,
          nextReminder,
          status,
          intervalDays: followUp.interval_days,
        }
      })
      .filter((value): value is NonNullable<typeof value> => value !== null)
      .sort((left, right) => left.nextReminder.getTime() - right.nextReminder.getTime())
      .slice(0, MAX_VISIBLE_REMINDERS)
  }, [applications, followUps])

  return (
    <Card className="relative overflow-hidden border border-indigo-500/40 bg-gradient-to-br from-indigo-500/20 via-slate-900/70 to-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/80 to-transparent" />
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between gap-3 text-base">
          <span className="flex items-center gap-2">
            <BellRing className="h-4 w-4" />
            Upcoming Reminders
          </span>
          <Button
            asChild
            size="sm"
            variant="secondary"
            className="border border-white/10 bg-white/10 text-white hover:bg-white/20"
          >
            <Link href="/follow-ups">Manage</Link>
          </Button>
        </CardTitle>
        <p className="text-xs text-slate-300">Stay on top of follow-ups with the next reminders in your queue.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32 bg-white/20" />
                  <Skeleton className="h-3 w-40 bg-white/10" />
                  <Skeleton className="h-3 w-28 bg-white/10" />
                </div>
              </div>
            ))}
          </div>
        ) : loadError ? (
          <p className="text-sm text-rose-200">Error loading reminders</p>
        ) : reminders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/20 bg-white/5 p-6 text-center text-sm text-slate-300">
            No reminders scheduled yet. Enable follow-up reminders on your applications to see them here.
          </div>
        ) : (
          <div className="space-y-3">
            {reminders.map((reminder) => {
              const theme = reminderThemes[reminder.status]
              return (
                <div
                  key={reminder.id}
                  className={cn("rounded-xl border p-4 transition-colors backdrop-blur", theme.container)}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">
                        {reminder.application.company_name}
                      </p>
                      <p className="text-xs text-slate-200">
                        {reminder.application.position_title}
                      </p>
                    </div>
                    <Badge variant="outline" className={cn("border", theme.badge)}>
                      {theme.label}
                    </Badge>
                  </div>

                  <div className="mt-3 grid gap-2 text-xs text-slate-200 sm:grid-cols-2">
                    <div className="flex items-center gap-2">
                      <CalendarClock className="h-3.5 w-3.5 text-white/80" />
                      <span>
                        {dateFormatter.format(reminder.nextReminder)} at {timeFormatter.format(reminder.nextReminder)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-white/80" />
                      <span>{formatDistanceToNow(reminder.nextReminder, { addSuffix: true })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-white/80" />
                      <span>Repeats every {reminder.intervalDays} days</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
