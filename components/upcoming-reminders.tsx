"use client"

import { useMemo } from "react"
import { BellRing, CalendarClock, Mail } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

import { useApplicationFollowUps } from "@/lib/hooks/use-application-follow-ups"
import { useJobApplications } from "@/lib/hooks/use-job-applications"
import type { ApplicationFollowUp } from "@/lib/types/database"
import { cn } from "@/lib/utils"
import { getDateOrNull } from "@/lib/date"

const MAX_VISIBLE_REMINDERS = 4

function computeNextReminder(followUp: ApplicationFollowUp): Date | null {
  if (!followUp.enabled) {
    return null
  }

  return getDateOrNull(followUp.next_follow_up_date ?? null)
}

type ReminderStatus = "overdue" | "soon" | "scheduled"

type ReminderTheme = {
  badge: string
  time: string
}

const reminderThemes: Record<ReminderStatus, ReminderTheme> = {
  overdue: {
    badge: "border-destructive/40 bg-destructive/10 text-destructive",
    time: "text-destructive",
  },
  soon: {
    badge: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    time: "text-amber-600 dark:text-amber-400",
  },
  scheduled: {
    badge: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    time: "text-emerald-600 dark:text-emerald-400",
  },
}

export function UpcomingReminders() {
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
      }),
    [],
  )

  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
    [],
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

        const nextReminder = computeNextReminder(followUp)
        if (!nextReminder) {
          return null
        }

        const difference = nextReminder.getTime() - now
        const dayMs = 1000 * 60 * 60 * 24
        const remainingDays = difference / dayMs
        let status: ReminderStatus = "scheduled"
        if (difference < 0) {
          status = "overdue"
        } else if (difference <= 1000 * 60 * 60 * 48) {
          status = "soon"
        }

        let countdownLabel: string
        if (difference < 0) {
          const overdueDays = Math.max(1, Math.ceil(Math.abs(remainingDays)))
          countdownLabel =
            overdueDays === 1 ? "Overdue by 1 day" : `Overdue by ${overdueDays} days`
        } else if (difference <= dayMs) {
          countdownLabel = "Due today"
        } else {
          const daysLeft = Math.ceil(remainingDays)
          countdownLabel =
            daysLeft === 1 ? "1 day remaining" : `${daysLeft} days remaining`
        }

        return {
          id: followUp.id,
          application,
          nextReminder,
          status,
          countdownLabel,
        }
      })
      .filter((value): value is NonNullable<typeof value> => value !== null)
      .sort((left, right) => left.nextReminder.getTime() - right.nextReminder.getTime())
      .slice(0, MAX_VISIBLE_REMINDERS)
  }, [applications, followUps])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3 text-base">
          <span className="flex items-center gap-2">
            <BellRing className="h-4 w-4 text-muted-foreground" />
            Upcoming Reminders
          </span>
   
        </CardTitle>
    
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="rounded-lg border bg-muted/20 p-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
            ))}
          </div>
        ) : loadError ? (
          <p className="text-sm text-destructive">Error loading reminders</p>
        ) : reminders.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/10 p-6 text-center text-sm text-muted-foreground">
            No reminders scheduled yet. Enable follow-up reminders on your applications to see them here.
          </div>
        ) : (
          <div className="space-y-3">
            {reminders.map((reminder) => {
              const theme = reminderThemes[reminder.status]
              return (
                <div
                  key={reminder.id}
                  className="rounded-lg border bg-card/70 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-card-foreground">
                        {reminder.application.company_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {reminder.application.position_title}
                      </p>
                    </div>
                    <Badge variant="outline" className={cn("border", theme.badge)}>
                      {reminder.countdownLabel}
                    </Badge>
                  </div>

                  <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                    <div className="flex items-center gap-2">
                      <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>
                        {dateFormatter.format(reminder.nextReminder)} at {timeFormatter.format(reminder.nextReminder)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>We&rsquo;ll email you on this day in your local time.</span>
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
