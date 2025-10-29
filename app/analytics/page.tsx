"use client"

import { useMemo, useRef } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
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


        </div>
      </main>
    </div>
  )
}
