"use client"

import Link from "next/link"
import { useMemo } from "react"
import { formatDistanceToNow } from "date-fns"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ActivityDetailsDialog } from "@/components/activity-details-dialog"
import { ArrowRight } from "lucide-react"

import { useJobApplications } from "@/lib/hooks/use-job-applications"
import { useInterviews } from "@/lib/hooks/use-interviews"
import { useActivityLog } from "@/lib/hooks/use-activity-log"
import { useSettings } from "@/components/settings-provider"
import { useApplicationFollowUps } from "@/lib/hooks/use-application-follow-ups"
import { formatStatusLabel, getStatusBadgeClass, getStatusStage, isActiveStage } from "@/lib/status"

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export default function ApplicationsPage() {
  const { settings } = useSettings()
  const { applications, isLoading, error } = useJobApplications({ limit: 100, include_interviews: true })
  const { interviews: upcomingInterviews } = useInterviews({ upcoming_only: true })
  const { activities, isLoading: isLoadingActivity } = useActivityLog()
  const { followUps, isLoading: isLoadingFollowUps } = useApplicationFollowUps()

  const interviewDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: settings.timezone,
      }),
    [settings.timezone],
  )

  const pipelineSummary = useMemo(() => {
    const now = Date.now()
    const active = applications.filter((app) => isActiveStage(getStatusStage(app.status))).length
    const recentSubmissions = applications.filter((app) => {
      const appliedAt = new Date(app.application_date).getTime()
      return !Number.isNaN(appliedAt) && now - appliedAt <= SEVEN_DAYS_MS
    }).length
    const pendingResponse = applications.filter((app) => app.status === "Applied").length

    const followUpRecords = followUps.filter((item) => item.enabled && item.next_follow_up_date)
    const followUpsDue = followUpRecords.filter((item) => {
      if (!item.next_follow_up_date) return false
      return new Date(item.next_follow_up_date).getTime() <= now
    }).length
    const nextFollowUp = followUpRecords
      .filter((item) => {
        if (!item.next_follow_up_date) return false
        return new Date(item.next_follow_up_date).getTime() > now
      })
      .sort((a, b) => {
        const left = a.next_follow_up_date ? new Date(a.next_follow_up_date).getTime() : Number.POSITIVE_INFINITY
        const right = b.next_follow_up_date ? new Date(b.next_follow_up_date).getTime() : Number.POSITIVE_INFINITY
        return left - right
      })[0]

    const sortedUpcoming = [...upcomingInterviews].sort(
      (a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime(),
    )
    const nextInterview = sortedUpcoming[0]

    return [
      {
        label: "Active applications",
        value: active,
        helper:
          recentSubmissions > 0
            ? `${recentSubmissions} submitted in the last 7 days`
            : "No new submissions this week",
      },
      {
        label: "Interviews scheduled",
        value: upcomingInterviews.length,
        helper: nextInterview
          ? `Next: ${interviewDateFormatter.format(new Date(nextInterview.scheduled_date))}`
          : "No interviews scheduled",
      },
      {
        label: "Awaiting responses",
        value: pendingResponse,
        helper:
          followUpsDue > 0
            ? `${followUpsDue} reminder${followUpsDue === 1 ? "" : "s"} ready for follow-up`
            : nextFollowUp?.next_follow_up_date
              ? `Next reminder ${formatDistanceToNow(new Date(nextFollowUp.next_follow_up_date), { addSuffix: true })}`
              : "All follow-ups are up to date",
      },
    ]
  }, [applications, followUps, upcomingInterviews, interviewDateFormatter])

  const highlightedApplications = useMemo(() => {
    return [...applications]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 4)
  }, [applications])

  const upcomingTasks = useMemo(() => activities.slice(0, 5), [activities])
  const isSummaryLoading = isLoading || isLoadingFollowUps

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <header className="space-y-2">
            <h1 className="text-3xl font-semibold">Applications workspace</h1>
            <p className="text-muted-foreground text-pretty">
              A focused view of every role you&apos;ve applied to, the status of each pipeline, and the next set of actions.
            </p>
          </header>

          <section>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(isSummaryLoading ? Array.from({ length: 3 }) : pipelineSummary).map((item, index) => (
                <Card key={item ? item.label : index}>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {item ? item.label : <Skeleton className="h-4 w-24" />}
                    </CardTitle>
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

          <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Highlighted applications</CardTitle>
                <Badge variant="secondary">Most recently updated</Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="rounded-lg border p-4 space-y-3">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-56" />
                    </div>
                  ))
                ) : highlightedApplications.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Add an application to see it appear here.</p>
                ) : (
                  highlightedApplications.map((application) => (
                    <div key={application.id} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p
                            className="font-semibold text-base line-clamp-1 break-words"
                            title={application.company_name}
                          >
                            {application.company_name}
                          </p>
                          <p
                            className="text-sm text-muted-foreground line-clamp-2 break-words"
                            title={application.position_title}
                          >
                            {application.position_title}
                          </p>
                        </div>
                        <Badge variant="outline" className={getStatusBadgeClass(application.status)}>
                          {formatStatusLabel(application.status)}
                        </Badge>
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">
                        Updated {formatDistanceToNow(new Date(application.updated_at), { addSuffix: true })}
                      </p>
                      {application.notes && (
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-3 break-words">
                          {application.notes}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="h-full">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Follow-up reminders</CardTitle>
                <Button asChild variant="ghost" size="sm" className="gap-2">
                  <Link href="/follow-ups">
                    Manage
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                {isLoadingFollowUps ? (
                  Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-16 w-full" />)
                ) : followUps.filter((item) => item.enabled).length === 0 ? (
                  <p>Enable reminders on an application to receive a follow-up nudge.</p>
                ) : (
                  (() => {
                    const applicationMap = new Map(applications.map((application) => [application.id, application]))
                    return followUps
                      .filter((item) => item.enabled)
                      .map((item) => ({
                        followUp: item,
                        application: applicationMap.get(item.job_application_id),
                      }))
                      .filter((entry) => entry.application && entry.followUp.next_follow_up_date)
                      .sort((a, b) => {
                        const left = a.followUp.next_follow_up_date
                          ? new Date(a.followUp.next_follow_up_date).getTime()
                          : Number.POSITIVE_INFINITY
                        const right = b.followUp.next_follow_up_date
                          ? new Date(b.followUp.next_follow_up_date).getTime()
                          : Number.POSITIVE_INFINITY
                        return left - right
                      })
                      .slice(0, 3)
                      .map((entry) => {
                        const { application, followUp } = entry
                        const dueDate = followUp.next_follow_up_date
                          ? new Date(followUp.next_follow_up_date)
                          : null
                        const isDue = dueDate ? dueDate.getTime() <= Date.now() : false
                        return (
                          <div key={followUp.id} className="rounded-lg border p-3 space-y-1">
                            <p className="font-medium text-foreground line-clamp-1 break-words">
                              {application?.company_name}
                            </p>
                            <p className="text-xs text-muted-foreground line-clamp-2 break-words">
                              {application?.position_title}
                            </p>
                            {dueDate && (
                              <p className="text-xs font-medium">
                                {isDue
                                  ? `Overdue — ${formatDistanceToNow(dueDate, { addSuffix: true })}`
                                  : `Due ${formatDistanceToNow(dueDate, { addSuffix: true })}`}
                              </p>
                            )}
                          </div>
                        )
                      })
                  })()
                )}
              </CardContent>
            </Card>
          </section>

          <section>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Pipeline checklist</CardTitle>
                <Button variant="ghost" size="sm" className="gap-2" disabled={isLoadingActivity}>
                  View full board
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                {isLoadingActivity ? (
                  Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-4 w-2/3" />)
                ) : upcomingTasks.length === 0 ? (
                  <p>No recent activity yet. Add an application to get started.</p>
                ) : (
                  upcomingTasks.map((activity) => (
                    <ActivityDetailsDialog
                      key={activity.id}
                      activity={activity}
                      trigger={
                        <button
                          type="button"
                          className="w-full rounded-lg border p-3 text-left transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <p className="text-foreground line-clamp-2 break-words">{activity.description}</p>
                          {activity.job_applications ? (
                            <p
                              className="text-xs font-medium text-foreground line-clamp-2 break-words"
                              title={activity.job_applications.position_title ?? undefined}
                            >
                              {activity.job_applications.position_title}
                              <span className="text-muted-foreground">
                                {" "}• {activity.job_applications.company_name}
                              </span>
                            </p>
                          ) : (
                            <p className="text-xs italic text-muted-foreground">Application removed</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                          </p>
                        </button>
                      }
                    />
                  ))
                )}
              </CardContent>
            </Card>
          </section>

          {error && (
            <p className="text-sm text-destructive">There was a problem loading your applications. Please try again.</p>
          )}
        </div>
      </main>
    </div>
  )
}
