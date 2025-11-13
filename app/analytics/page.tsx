"use client"

import { useMemo, useRef } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { AnimatedNumber } from "@/components/animated-number"
import { ResponsiveContainer, Sankey, Tooltip as RechartsTooltip } from "recharts"
import { toPng } from "html-to-image"
import {
  getStatusChartColor,
  getStatusStage,
  isActiveStage,
  parseStatus,
} from "@/lib/status"

import { useDashboardStats } from "@/lib/hooks/use-dashboard-stats"
import { useJobApplications } from "@/lib/hooks/use-job-applications"
import { cn } from "@/lib/utils"

const SANKEY_BASE_NODE = "Applications Submitted"
const ACTIVITY_LEVEL_CLASSES = ["bg-muted/60", "bg-emerald-200/70", "bg-emerald-300/80", "bg-emerald-400/80", "bg-emerald-500"]
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
  const { applications, isLoading: appsLoading } = useJobApplications({ limit: 200, include_status_history: true })

  const totalApplications = stats?.total_applications ?? 0
  const interviewConversion = stats && stats.applied > 0 ? Math.round((stats.interviews / stats.applied) * 100) : 0
  const offerRate = stats && totalApplications > 0 ? Math.round((stats.offers / totalApplications) * 100) : 0
  const activePipeline = applications.filter((app) => isActiveStage(getStatusStage(app.status))).length
  const awaitingResponse = applications.filter((app) => app.status === "Applied").length
  const sankeyData = useMemo(() => {
    const baseNode = SANKEY_BASE_NODE
    const baseColor = getStatusChartColor("Applied")
    const links = new Map<string, number>()
    const nodes = new Map<string, { color: string; count: number; order: number }>([
      [baseNode, { color: baseColor, count: 0, order: -100 }],
    ])

    const registerLink = (source: string, target: string) => {
      const key = `${source}=>${target}`
      links.set(key, (links.get(key) ?? 0) + 1)
    }

    const incrementNode = (label: string, color: string, order: number) => {
      const existing = nodes.get(label)

      if (existing) {
        nodes.set(label, {
          color: existing.color,
          count: existing.count + 1,
          order: Math.min(existing.order, order),
        })
      } else {
        nodes.set(label, { color, count: 1, order })
      }
    }

    applications.forEach((application) => {
      const historyStatuses = (application.status_history ?? []).map((entry) => parseStatus(entry.status).value)
      const latestStatus = parseStatus(application.status).value
      const baseSequence = historyStatuses.length > 0 ? historyStatuses : [latestStatus]
      const dedupedSequence = baseSequence.filter((status, index, array) => index === 0 || status !== array[index - 1])
      const statusSequence =
        dedupedSequence[dedupedSequence.length - 1] === latestStatus
          ? dedupedSequence
          : [...dedupedSequence, latestStatus]

      const metadataSequence = statusSequence.map((status) => parseStatus(status))
      const pathMetadata = [
        { label: baseNode, color: baseColor, order: -100 },
        ...metadataSequence.map((meta) => ({ label: meta.label, color: meta.chartColor, order: meta.order })),
      ]

      pathMetadata.forEach(({ label, color, order }) => incrementNode(label, color, order))

      for (let index = 0; index < pathMetadata.length - 1; index += 1) {
        const source = pathMetadata[index].label
        const target = pathMetadata[index + 1].label
        registerLink(source, target)
      }
    })

    const orderedNodes: SankeyNodeWithCount[] = Array.from(nodes.entries())
      .sort((left, right) => {
        if (left[1].order === right[1].order) {
          return left[0].localeCompare(right[0])
        }

        return left[1].order - right[1].order
      })
      .map(([name, info]) => ({
        name,
        color: info.color,
        count: info.count,
      }))

    const orderedNodeIndex = Object.fromEntries(orderedNodes.map((node, index) => [node.name, index]))

    const orderedLinks: SankeyLink[] = Array.from(links.entries()).flatMap(([key, value]) => {
      const [source, target] = key.split("=>")
      const sourceIndex = orderedNodeIndex[source]
      const targetIndex = orderedNodeIndex[target]

      if (sourceIndex === undefined || targetIndex === undefined) {
        return []
      }

      return {
        source: sourceIndex,
        target: targetIndex,
        value,
      }
    })

    return {
      nodes: orderedNodes,
      links: orderedLinks,
    }
  }, [applications])

  const sankeyHeight = useMemo(() => {
    if (!sankeyData.nodes.length) return 320

    const baseNode = sankeyData.nodes.find((node) => node.name === SANKEY_BASE_NODE)
    const largestNode = sankeyData.nodes.reduce(
      (max, node) => (node.count > max ? node.count : max),
      baseNode?.count ?? 0,
    )

    const totalFlow = baseNode?.count ?? largestNode
    const minHeight = 320
    const maxHeight = 1200
    const pixelsPerApplication = 24

    return Math.max(minHeight, Math.min(maxHeight, totalFlow * pixelsPerApplication))
  }, [sankeyData.nodes])

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
        value: typeof stats?.response_rate === "number" ? stats.response_rate : null,
        suffix: "%",
        helper: `${stats?.interviews ?? 0} interviews scheduled`,
        isLoading: statsLoading,
      },
      {
        label: "Interview conversion",
        value: stats ? interviewConversion : null,
        suffix: "%",
        helper: `${stats?.applied ?? 0} applications reached interview stage`,
        isLoading: statsLoading,
      },
      {
        label: "Offer momentum",
        value: stats ? offerRate : null,
        suffix: "%",
        helper: `${stats?.offers ?? 0} offers • ${stats?.accepted ?? 0} accepted`,
        isLoading: statsLoading,
      },
      {
        label: "Active pipeline",
        value: appsLoading ? null : activePipeline,
        helper: `${awaitingResponse} awaiting response`,
        isLoading: appsLoading,
      },
    ],
    [activePipeline, appsLoading, awaitingResponse, interviewConversion, offerRate, stats, statsLoading],
  )

  const applicationActivity = useMemo(() => {
    if (!applications.length) {
      return { weeks: [] as { date: string; count: number; level: number }[][], maxDailyCount: 0 }
    }

    const countsByDate = new Map<string, number>()

    applications.forEach((application) => {
      const createdAt = application.created_at ?? application.application_date
      if (!createdAt) return
      const timestamp = new Date(createdAt)
      if (Number.isNaN(timestamp.getTime())) return
      const dayKey = timestamp.toISOString().split("T")[0]
      countsByDate.set(dayKey, (countsByDate.get(dayKey) ?? 0) + 1)
    })

    if (countsByDate.size === 0) {
      return { weeks: [] as { date: string; count: number; level: number }[][], maxDailyCount: 0 }
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const start = new Date(today)
    start.setDate(start.getDate() - 364)
    while (start.getDay() !== 0) {
      start.setDate(start.getDate() - 1)
    }

    const end = new Date(today)
    while (end.getDay() !== 6) {
      end.setDate(end.getDate() + 1)
    }

    const days: { date: string; count: number }[] = []
    const cursor = new Date(start)
    while (cursor <= end) {
      const dateKey = cursor.toISOString().split("T")[0]
      days.push({ date: dateKey, count: countsByDate.get(dateKey) ?? 0 })
      cursor.setDate(cursor.getDate() + 1)
    }

    const maxDailyCount = days.reduce((max, day) => (day.count > max ? day.count : max), 0)
    const levelForCount = (count: number) => {
      if (count === 0 || maxDailyCount === 0) return 0
      const scaled = Math.ceil((count / maxDailyCount) * 4)
      return Math.min(4, Math.max(1, scaled))
    }

    const weeks: { date: string; count: number; level: number }[][] = []
    days.forEach((day, index) => {
      const weekIndex = Math.floor(index / 7)
      if (!weeks[weekIndex]) {
        weeks[weekIndex] = []
      }
      weeks[weekIndex].push({ ...day, level: levelForCount(day.count) })
    })

    return { weeks, maxDailyCount }
  }, [applications])

  const monthLabels = useMemo(() => {
    return applicationActivity.weeks.map((week, index) => {
      const firstDay = week[0]
      if (!firstDay) return ""
      const date = new Date(firstDay.date)
      if (Number.isNaN(date.getTime())) return ""
      if (date.getDate() <= 7 || index === 0) {
        return date.toLocaleString(undefined, { month: "short" })
      }
      const previousWeek = applicationActivity.weeks[index - 1]
      const previousMonth = previousWeek ? new Date(previousWeek[0].date).getMonth() : null
      if (previousMonth !== date.getMonth()) {
        return date.toLocaleString(undefined, { month: "short" })
      }
      return ""
    })
  }, [applicationActivity.weeks])

  const hasActivityData = applicationActivity.weeks.some((week) => week.some((day) => day.count > 0))


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
                    <div style={{ height: `${sankeyHeight}px` }}>
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
            <Card>
              <CardHeader>
                <div className="space-y-1">
                  <CardTitle>Application activity</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    A GitHub-style snapshot of when you&rsquo;ve been adding new roles over the past year.
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                {appsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                ) : applicationActivity.weeks.length ? (
                  <div className="space-y-4">
                    <div className="overflow-x-auto">
                      <div className="flex gap-1 text-[10px] text-muted-foreground pl-8 mb-1">
                        {monthLabels.map((label, index) => (
                          <span key={`month-${index}`} className="w-3 text-center">
                            {label}
                          </span>
                        ))}
                      </div>
                      <div className="flex">
                        <div className="mr-2 flex flex-col justify-between text-[10px] text-muted-foreground py-2">
                          <span>Mon</span>
                          <span>Wed</span>
                          <span>Fri</span>
                        </div>
                        <div className="flex gap-1">
                          {applicationActivity.weeks.map((week, weekIndex) => (
                            <div key={`week-${weekIndex}`} className="flex flex-col gap-1">
                              {week.map((day, dayIndex) => {
                                const formattedDate = new Date(day.date).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })
                                return (
                                  <div
                                    key={`day-${day.date}-${dayIndex}`}
                                    className={cn(
                                      "h-3 w-3 rounded-sm border border-background/30",
                                      ACTIVITY_LEVEL_CLASSES[day.level] ?? ACTIVITY_LEVEL_CLASSES[0],
                                    )}
                                    title={`${formattedDate}: ${day.count} application${day.count === 1 ? "" : "s"}`}
                                    aria-label={`${formattedDate}: ${day.count} application${day.count === 1 ? "" : "s"}`}
                                  />
                                )
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span>Less</span>
                        <div className="flex items-center gap-1">
                          {ACTIVITY_LEVEL_CLASSES.map((levelClass, index) => (
                            <div
                              key={`legend-${index}`}
                              className={cn("h-3 w-3 rounded-sm border border-background/30", levelClass)}
                              aria-hidden
                            />
                          ))}
                        </div>
                        <span>More</span>
                      </div>
                      <p className="text-muted-foreground">
                        {hasActivityData
                          ? `${applications.length} application${applications.length === 1 ? "" : "s"} added in the last 52 weeks`
                          : "No applications tracked in the past year yet."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">Start logging applications to see your streak build up.</div>
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
                      if (item.isLoading) {
                        return <Skeleton className="h-8 w-16" />
                      }

                      return (
                        <AnimatedNumber
                          className="text-2xl font-semibold"
                          value={item.value}
                          suffix={item.suffix}
                          duration={900}
                        />
                      )
                    })()}
                    <p className="text-sm text-muted-foreground mt-2">{item.helper}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>


        </div>
      </main>
    </div>
  )
}
