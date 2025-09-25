"use client"

import { useMemo } from "react"
import { formatDistanceToNow } from "date-fns"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowRight } from "lucide-react"

import { useJobApplications } from "@/lib/hooks/use-job-applications"
import { useInterviews } from "@/lib/hooks/use-interviews"
import { useActivityLog } from "@/lib/hooks/use-activity-log"

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export default function ApplicationsPage() {
  const { applications, isLoading, error } = useJobApplications({ limit: 100, include_interviews: true })
  const { interviews: upcomingInterviews, isLoading: isLoadingInterviews } = useInterviews({ upcoming_only: true })
  const { activities, isLoading: isLoadingActivity } = useActivityLog()

  const pipelineSummary = useMemo(() => {
    const now = Date.now()
    const active = applications.filter(
      (app) => !["Rejected", "Withdrawn", "Accepted"].includes(app.status),
    ).length
    const recentSubmissions = applications.filter((app) => {
      const appliedAt = new Date(app.application_date).getTime()
      return !Number.isNaN(appliedAt) && now - appliedAt <= SEVEN_DAYS_MS
    }).length
    const pendingResponse = applications.filter((app) => app.status === "Applied").length
    const followUpsDue = applications.filter((app) => {
      if (app.status !== "Applied") return false
      const appliedAt = new Date(app.application_date).getTime()
      return Number.isNaN(appliedAt) ? false : now - appliedAt > SEVEN_DAYS_MS
    }).length

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
          ? `Next: ${new Date(nextInterview.scheduled_date).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}`
          : "No interviews scheduled",
      },
      {
        label: "Awaiting responses",
        value: pendingResponse,
        helper:
          followUpsDue > 0 ? `${followUpsDue} ready for follow-up` : "All follow-ups are up to date",
      },
    ]
  }, [applications, upcomingInterviews])

  const highlightedApplications = useMemo(() => {
    return [...applications]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 4)
  }, [applications])

  const upcomingTasks = useMemo(() => activities.slice(0, 5), [activities])

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
              {(isLoading ? Array.from({ length: 3 }) : pipelineSummary).map((item, index) => (
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
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-base text-balance">{application.company_name}</p>
                          <p className="text-sm text-muted-foreground text-pretty">{application.position_title}</p>
                        </div>
                        <Badge>{application.status}</Badge>
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">
                        Updated {formatDistanceToNow(new Date(application.updated_at), { addSuffix: true })}
                      </p>
                      {application.notes && (
                        <p className="mt-2 text-sm text-muted-foreground text-pretty">{application.notes}</p>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="h-full">
              <CardHeader>
                <CardTitle>Upcoming interviews</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                {isLoadingInterviews ? (
                  Array.from({ length: 2 }).map((_, index) => <Skeleton key={index} className="h-20 w-full" />)
                ) : upcomingInterviews.length === 0 ? (
                  <p>No interviews scheduled yet.</p>
                ) : (
                  upcomingInterviews.slice(0, 3).map((interview) => (
                    <div key={interview.id} className="rounded-lg border p-3 space-y-1">
                      <p className="font-medium text-foreground">
                        {interview.job_applications?.company_name ?? "Unknown company"}
                      </p>
                      <p className="text-xs">
                        {new Date(interview.scheduled_date).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                      <p className="text-xs">
                        {interview.job_applications?.position_title ?? "Interview"} • {interview.interview_type}
                      </p>
                    </div>
                  ))
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
                    <div key={activity.id} className="border rounded-lg p-3 space-y-1">
                      <p className="text-foreground text-pretty">{activity.description}</p>
                      <p className="text-xs">
                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      </p>
                    </div>
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
