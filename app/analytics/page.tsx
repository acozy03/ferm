"use client"

import { useMemo } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingUp, Target, Clock3 } from "lucide-react"

import { useDashboardStats } from "@/lib/hooks/use-dashboard-stats"
import { useJobApplications } from "@/lib/hooks/use-job-applications"
import { useInterviews } from "@/lib/hooks/use-interviews"
import { useActivityLog } from "@/lib/hooks/use-activity-log"

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export default function AnalyticsPage() {
  const { stats, isLoading: statsLoading } = useDashboardStats()
  const { applications, isLoading: appsLoading } = useJobApplications({ limit: 200 })
  const { interviews: upcomingInterviews } = useInterviews({ upcoming_only: true })
  const { activities, isLoading: activityLoading } = useActivityLog()

  const totalApplications = stats?.total_applications ?? 0
  const interviewConversion = stats && stats.applied > 0 ? Math.round((stats.interviews / stats.applied) * 100) : 0
  const offerRate = stats && totalApplications > 0 ? Math.round((stats.offers / totalApplications) * 100) : 0
  const activePipeline = applications.filter((app) => !["Rejected", "Withdrawn", "Accepted"].includes(app.status)).length
  const awaitingResponse = applications.filter((app) => app.status === "Applied").length
  const staleFollowUps = applications.filter((app) => {
    if (app.status !== "Applied") return false
    const appliedAt = new Date(app.application_date)
    return Number.isNaN(appliedAt.getTime()) ? false : Date.now() - appliedAt.getTime() > SEVEN_DAYS_MS
  }).length

  const analyticsSummary = useMemo(
    () => [
      {
        label: "Overall response rate",
        value: stats ? `${stats.response_rate}%` : "–",
        helper: `${stats?.interviews ?? 0} interviews scheduled`,
      },
      {
        label: "Interview conversion",
        value: stats ? `${interviewConversion}%` : "–",
        helper: `${stats?.applied ?? 0} applications reached interview stage`,
      },
      {
        label: "Offer momentum",
        value: stats ? `${offerRate}%` : "–",
        helper: `${stats?.offers ?? 0} offers • ${stats?.accepted ?? 0} accepted`,
      },
      {
        label: "Active pipeline",
        value: appsLoading ? "–" : activePipeline,
        helper: `${awaitingResponse} awaiting response`,
      },
    ],
    [activePipeline, appsLoading, awaitingResponse, interviewConversion, offerRate, stats],
  )

  const funnelStages = useMemo(
    () => [
      { stage: "Applied", value: stats?.applied ?? 0 },
      { stage: "Interview", value: stats?.interviews ?? 0 },
      { stage: "Offer", value: stats?.offers ?? 0 },
      { stage: "Accepted", value: stats?.accepted ?? 0 },
    ],
    [stats?.accepted, stats?.applied, stats?.interviews, stats?.offers],
  )

  const momentumInsights = useMemo(
    () => [
      {
        icon: TrendingUp,
        text: `Response rate is ${stats?.response_rate ?? 0}% with ${stats?.interviews ?? 0} interviews on the calendar.`,
      },
      {
        icon: Target,
        text: `${upcomingInterviews.length} upcoming interview${upcomingInterviews.length === 1 ? "" : "s"} scheduled; prioritise prep for the nearest date.`,
      },
      {
        icon: Clock3,
        text:
          awaitingResponse > 0
            ? `${staleFollowUps} application${staleFollowUps === 1 ? "" : "s"} have been waiting more than a week. Time for a follow-up.`
            : "All pending applications have received recent follow-ups.",
      },
    ],
    [awaitingResponse, staleFollowUps, stats?.interviews, stats?.response_rate, upcomingInterviews.length],
  )

  const recentWindow = Date.now() - SEVEN_DAYS_MS
  const recentActivities = activities.filter((activity) => new Date(activity.created_at).getTime() >= recentWindow)
  const weeklyRecap = useMemo(() => {
    const createdCount = recentActivities.filter((activity) => activity.action_type === "application_created").length
    const interviewsScheduled = recentActivities.filter((activity) => activity.action_type === "interview_scheduled").length
    const statusChanges = recentActivities.filter((activity) => activity.action_type === "status_change").length

    return [
      `Applications added in the last 7 days: ${createdCount}.`,
      `Interviews scheduled this week: ${interviewsScheduled}.`,
      `Status updates logged: ${statusChanges}.`,
    ]
  }, [recentActivities])

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <header className="space-y-2">
            <h1 className="text-3xl font-semibold">Analytics snapshot</h1>
            <p className="text-muted-foreground text-pretty">
              High-level insights that show how your job search is trending and where to focus next.
            </p>
          </header>

          <section>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {analyticsSummary.map((item) => (
                <Card key={item.label}>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">{item.label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const shouldSkeleton =
                        (statsLoading && item.label !== "Active pipeline") ||
                        (item.label === "Active pipeline" && appsLoading)
                      if (shouldSkeleton) {
                        return <Skeleton className="h-8 w-16" />
                      }

                      return <div className="text-2xl font-semibold">{item.value}</div>
                    })()}
                    <p className="text-sm text-muted-foreground mt-2">{item.helper}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Pipeline conversion</CardTitle>
                <Badge variant="secondary">Current snapshot</Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                {statsLoading ? (
                  Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-8 w-full" />)
                ) : (
                  funnelStages.map((stage, index) => {
                    const baseline = funnelStages[0]?.value || 1
                    const percentage = index === 0 ? 100 : Math.round((stage.value / baseline) * 100)
                    return (
                      <div key={stage.stage} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-foreground">{stage.stage}</span>
                          <span className="text-muted-foreground">{percentage}%</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>

            <Card className="h-full">
              <CardHeader>
                <CardTitle>Momentum indicators</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                {momentumInsights.map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-start gap-3">
                    <Icon className="h-4 w-4 mt-1 text-primary" />
                    <p className="text-pretty">{text}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>

          <section>
            <Card>
              <CardHeader>
                <CardTitle>Weekly recap</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                {activityLoading ? (
                  Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-4 w-2/3" />)
                ) : (
                  weeklyRecap.map((item) => <p key={item}>- {item}</p>)
                )}
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </div>
  )
}
