"use client"

import { useMemo, useRef } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { TrendingUp, Target, Clock3 } from "lucide-react"
import { ResponsiveContainer, Sankey, Tooltip as RechartsTooltip } from "recharts"
import { toPng } from "html-to-image"
import type { JobApplicationStatus } from "@/lib/types/database"

import { useDashboardStats } from "@/lib/hooks/use-dashboard-stats"
import { useJobApplications } from "@/lib/hooks/use-job-applications"
import { useInterviews } from "@/lib/hooks/use-interviews"
import { useActivityLog } from "@/lib/hooks/use-activity-log"

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
const SANKEY_BASE_NODE = "Applications Submitted"

type SankeyNodeWithCount = {
  name: string
  color: string
  count: number
}

type SankeyLink = {
  source: number
  target: number
  value: number
}

const CustomSankeyNode = ({ x, y, width, height, payload }: {
  x: number
  y: number
  width: number
  height: number
  payload: SankeyNodeWithCount
}) => {
  const labelY = y + height / 2

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={3}
        ry={3}
        fill={payload.color}
        stroke="hsl(var(--background))"
        strokeWidth={1}
      />
      {/* <text
        x={x + width + 8}
        y={labelY}
        textAnchor="start"
        alignmentBaseline="middle"
        style={{
          fontSize: "25px",
          fontWeight: 800,
          fill: "hsl(var(--foreground))",
          paintOrder: "stroke",
          stroke: "hsl(var(--background) / 0.75)",
          strokeWidth: 3,
          strokeLinejoin: "round",
        }}
      >
        {payload.name}
      </text> */}
      <text
        x={x - 12}
        y={labelY}
        textAnchor="end"
        alignmentBaseline="middle"
        style={{
          fontSize: "30px",
          fontWeight: 800,
          fill: "var(--foreground)",
          opacity: 1,
          paintOrder: "stroke",
          stroke: "(var(--background) / 0.75)",
          strokeWidth: 3,
          strokeLinejoin: "round",
        }}
      >
        {payload.count}
      </text>
    </g>
  )
}

export default function AnalyticsPage() {
  const sankeyContainerRef = useRef<HTMLDivElement>(null)
  const { stats, isLoading: statsLoading } = useDashboardStats()
  const { applications, isLoading: appsLoading } = useJobApplications({ limit: 200 })
  const { interviews: upcomingInterviews } = useInterviews({ upcoming_only: true })
  const { activities, isLoading: activityLoading } = useActivityLog()

  const totalApplications = stats?.total_applications ?? 0
  const interviewConversion = stats && stats.applied > 0 ? Math.round((stats.interviews / stats.applied) * 100) : 0
  const offerRate = stats && totalApplications > 0 ? Math.round((stats.offers / totalApplications) * 100) : 0
  const activePipeline = applications.filter((app) => !["Rejected", "Withdrawn", "Accepted"].includes(app.status)).length
  const awaitingResponse = applications.filter((app) => app.status === "Applied").length
  const staleFollowUpIds = applications
    .filter((app) => {
      if (app.status !== "Applied") return false
      const appliedAt = new Date(app.application_date)
      return Number.isNaN(appliedAt.getTime()) ? false : Date.now() - appliedAt.getTime() > SEVEN_DAYS_MS
    })
    .map((app) => app.id)
  const staleFollowUps = staleFollowUpIds.length
  const staleFollowUpSet = useMemo(() => new Set(staleFollowUpIds), [staleFollowUpIds])

  const statusCounts = useMemo(
    () =>
      applications.reduce(
        (acc, application) => {
          acc[application.status] = (acc[application.status] ?? 0) + 1
          return acc
        },
        {
          Applied: 0,
          Interview: 0,
          Offer: 0,
          Accepted: 0,
          Rejected: 0,
          Withdrawn: 0,
        } satisfies Record<JobApplicationStatus, number>,
      ),
    [applications],
  )

  const sankeyData = useMemo(() => {
    const baseNode = SANKEY_BASE_NODE
    const links = new Map<string, number>()
    const nodes = new Set<string>([baseNode])
    const nodeCounts = new Map<string, number>()

    const registerLink = (source: string, target: string, value: number) => {
      if (!value) return
      nodes.add(source)
      nodes.add(target)
      const key = `${source}=>${target}`
      links.set(key, (links.get(key) ?? 0) + value)
    }

    const incrementNodeCount = (name: string) => {
      nodeCounts.set(name, (nodeCounts.get(name) ?? 0) + 1)
    }

    applications.forEach((application) => {
      const path = [baseNode]
      switch (application.status) {
        case "Applied": {
          path.push(staleFollowUpSet.has(application.id) ? "Ghosted" : "Awaiting Response")
          break
        }
        case "Interview": {
          path.push("Interviewing")
          break
        }
        case "Offer": {
          path.push("Interviewing", "Offer Received", "Offer Pending")
          break
        }
        case "Accepted": {
          path.push("Interviewing", "Offer Received", "Accepted")
          break
        }
        case "Rejected": {
          path.push("Rejected")
          break
        }
        case "Withdrawn": {
          path.push("Withdrawn")
          break
        }
        default: {
          path.push("Awaiting Response")
        }
      }

      for (let index = 0; index < path.length - 1; index += 1) {
        const source = path[index]
        const target = path[index + 1]
        registerLink(source, target, 1)
      }

      path.forEach((stage) => {
        incrementNodeCount(stage)
      })
    })

    const totalOffers = stats?.offers ?? 0
    const acceptedCount = statusCounts.Accepted ?? 0
    const pendingOffers = statusCounts.Offer ?? 0
    const declinedOffers = Math.max(totalOffers - acceptedCount - pendingOffers, 0)

    if (declinedOffers > 0) {
      registerLink("Offer Received", "Offer Declined", declinedOffers)
    }

    const nodeOrder = [
      baseNode,
      "Awaiting Response",
      "Ghosted",
      "Interviewing",
      "Offer Received",
      "Offer Pending",
      "Offer Declined",
      "Accepted",
      "Rejected",
      "Withdrawn",
    ]

    const orderedNodes: SankeyNodeWithCount[] = nodeOrder
      .filter((name) => nodes.has(name))
      .concat(Array.from(nodes).filter((name) => !nodeOrder.includes(name)))
      .map((name) => ({
        name,
        color:
          {
            [baseNode]: "#6366F1",
            "Awaiting Response": "#38BDF8",
            Ghosted: "#F472B6",
            Interviewing: "#FB923C",
            "Offer Received": "#22C55E",
            "Offer Pending": "#EAB308",
            "Offer Declined": "#F97316",
            Accepted: "#16A34A",
            Rejected: "#EF4444",
            Withdrawn: "#94A3B8",
          }[name] ?? "#94A3B8",
        count: nodeCounts.get(name) ?? 0,
      }))

    const orderedNodeIndex = Object.fromEntries(orderedNodes.map((node, index) => [node.name, index]))

    const orderedLinks: SankeyLink[] = Array.from(links.entries()).map(([key, value]) => {
      const [source, target] = key.split("=>")
      return {
        source: orderedNodeIndex[source],
        target: orderedNodeIndex[target],
        value,
      }
    })

    return {
      nodes: orderedNodes,
      links: orderedLinks,
    }
  }, [applications, staleFollowUpSet, stats?.offers, statusCounts.Accepted, statusCounts.Offer])

  const handleExportSankey = async () => {
    if (!sankeyContainerRef.current) return

    try {
      const backgroundColor = getComputedStyle(document.body).backgroundColor || "#0f1729"
      const dataUrl = await toPng(sankeyContainerRef.current, {
        cacheBust: true,
        backgroundColor,
      })

      const link = document.createElement("a")
      link.href = dataUrl
      link.download = "job-search-journey.png"
      link.click()
    } catch (error) {
      console.error("Failed to export Sankey chart", error)
    }
  }

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
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle>Job search journey</CardTitle>
                <Button
                  onClick={handleExportSankey}
                  variant="outline"
                  size="sm"
                  disabled={statsLoading || appsLoading || sankeyData.links.length === 0}
                >
                  Export PNG
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {statsLoading || appsLoading ? (
                  <div className="h-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                ) : sankeyData.links.length > 0 ? (
                  <div ref={sankeyContainerRef} className="space-y-4">
                    <div className="h-[320px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <Sankey
                          data={sankeyData}
                          nodeWidth={20}
                          nodePadding={32}
                          linkCurvature={0.5}
                          iterations={64}
                          node={<CustomSankeyNode />}
                          link={{ strokeOpacity: 0.35 }}
                        >
                          <RechartsTooltip
                            content={({ active, payload }) => {
                              if (!active || !payload?.length) return null
                              const link = payload[0]?.payload
                              if (!link?.source?.name || !link?.target?.name) return null
                              return (
                                <div className="rounded-md border bg-background px-3 py-2 text-xs shadow-sm">
                                  <p className="font-medium text-foreground">
                                    {link.source.name} → {link.target.name}
                                  </p>
                                  <p className="text-muted-foreground">{link.value} application{link.value === 1 ? "" : "s"}</p>
                                </div>
                              )
                            }}
                          />
                        </Sankey>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs">
                      {sankeyData.nodes
                        .filter((node) => node.count > 0)
                        .map((node) => (
                          <div
                            key={node.name}
                            className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-1.5"
                          >
                            <span
                              className="h-3 w-3 rounded-sm"
                              style={{ backgroundColor: node.color }}
                            />
                            <span className="text-muted-foreground">{node.name}</span>
                            <span className="font-medium text-foreground">{node.count}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Not enough application data yet to chart your journey.
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

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
