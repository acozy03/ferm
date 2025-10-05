"use client"

import { useMemo, useState } from "react"
import { Calendar, CheckCircle, Clock, MessageSquare, Plus, Search, X } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ActivityDetailsDialog } from "@/components/activity-details-dialog"
import { useActivityLog } from "@/lib/hooks/use-activity-log"
import type { ActivityLogWithApplication } from "@/lib/types/database"

const activityIcons = {
  application_created: Plus,
  status_change: Clock,
  notes_update: MessageSquare,
  interview_scheduled: Calendar,
  interview_completed: CheckCircle,
}

const activityColors = {
  application_created: "text-blue-500",
  status_change: "text-yellow-500",
  notes_update: "text-gray-500",
  interview_scheduled: "text-purple-500",
  interview_completed: "text-green-500",
}

export function ActivityTimeline() {
  const { activities, isLoading, error } = useActivityLog()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const hasSearchFilter = searchTerm.trim().length > 0

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)

    if (Number.isNaN(date.getTime())) {
      return "Just now"
    }

    const now = new Date()
    let diffMs = now.getTime() - date.getTime()

    if (diffMs < 0) {
      diffMs = Math.abs(diffMs)
    }

    const diffInMinutes = Math.floor(diffMs / (1000 * 60))

    if (diffInMinutes < 1) return "Just now"
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`

    const diffInHours = Math.floor(diffInMinutes / 60)

    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInHours < 48) return "Yesterday"
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  const filteredActivities = useMemo(() => {
    if (!searchTerm.trim()) {
      return activities
    }

    const query = searchTerm.trim().toLowerCase()

    return activities.filter((activity) => {
      const jobTitle = activity.job_applications?.position_title ?? activity.job_position_snapshot ?? ""
      const companyName = activity.job_applications?.company_name ?? activity.job_company_snapshot ?? ""

      return [
        activity.description,
        jobTitle,
        companyName,
        activity.action_type.replace(/_/g, " "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    })
  }, [activities, searchTerm])

  const limitedActivities = filteredActivities.slice(0, 6)
  const hasMoreActivity = filteredActivities.length > limitedActivities.length

  const renderActivityItem = (item: ActivityLogWithApplication) => {
    const Icon = activityIcons[item.action_type] || Clock
    const colorClass = activityColors[item.action_type] || "text-gray-500"
    const jobTitle = item.job_applications?.position_title ?? item.job_position_snapshot ?? undefined
    const companyName = item.job_applications?.company_name ?? item.job_company_snapshot ?? undefined
    const hasJobInfo = Boolean(jobTitle || companyName)
    const jobRemoved = !item.job_applications && hasJobInfo

    return (
      <ActivityDetailsDialog
        key={item.id}
        activity={item}
        trigger={
          <button
            type="button"
            className="flex w-full items-start gap-3 rounded-lg border border-transparent p-3 text-left transition hover:border-border hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className={`mt-1 ${colorClass}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-pretty text-sm text-muted-foreground">{item.description}</p>
              {hasJobInfo ? (
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-foreground">
                    {jobTitle ?? "Job title unavailable"}
                    {companyName ? <span className="text-muted-foreground"> - {companyName}</span> : null}
                  </p>
                  {jobRemoved ? <p className="text-[11px] italic text-muted-foreground">Application removed</p> : null}
                </div>
              ) : (
                <p className="text-xs italic text-muted-foreground">Application removed</p>
              )}
              {item.new_value && item.old_value ? (
                <div className="text-xs text-muted-foreground">
                  <span className="line-through">{item.old_value}</span> {" -> "}
                  <span className="font-medium">{item.new_value}</span>
                </div>
              ) : null}
              <p className="text-xs text-muted-foreground">{formatTimestamp(item.created_at)}</p>
            </div>
          </button>
        }
      />
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="mt-1 h-4 w-4 animate-pulse rounded bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-32 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">Error loading activity</p>
          ) : filteredActivities.length === 0 ? (
            <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              <span>{hasSearchFilter ? "No activity matches your search." : "No recent activity"}</span>
              {hasSearchFilter ? (
                <Button variant="link" size="sm" className="h-auto px-0" onClick={() => setSearchTerm("")}>
                  Clear search
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="relative space-y-3">
              {limitedActivities.map((item) => renderActivityItem(item))}
              {hasMoreActivity ? (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-card to-transparent" />
              ) : null}
            </div>
          )}

          {filteredActivities.length > 0 ? (
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Showing {Math.min(limitedActivities.length, filteredActivities.length)} of {filteredActivities.length} updates
              </p>
              {filteredActivities.length > limitedActivities.length ? (
                <Button variant="ghost" size="sm" onClick={() => setIsDrawerOpen(true)}>
                  View all activity
                </Button>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent className="sm:max-w-3xl">
          <DrawerHeader>
            <DrawerTitle>Activity history</DrawerTitle>
            <DrawerDescription>Search every update tracked for your applications.</DrawerDescription>
          </DrawerHeader>
          <div className="border-t">
            <div className="flex flex-col gap-4 p-4">
              <div className="relative w-full sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Filter activity"
                  className="pl-9 pr-10"
                />
                {searchTerm ? (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted"
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Clear search</span>
                  </button>
                ) : null}
              </div>

              <ScrollArea className="h-[60vh] pr-4">
                <div className="space-y-3">
                  {filteredActivities.length === 0 ? (
                    <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed text-center">
                      <div>
                        <p className="font-medium">No activity found</p>
                        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                          Try a different search term to find specific updates.
                        </p>
                      </div>
                      {hasSearchFilter ? (
                        <Button type="button" variant="outline" size="sm" onClick={() => setSearchTerm("")}>
                          Clear search
                        </Button>
                      ) : null}
                    </div>
                  ) : (
                    filteredActivities.map((item) => renderActivityItem(item))
                  )}
                </div>
              </ScrollArea>

              <div className="flex items-center justify-end">
                <Button variant="ghost" size="sm" onClick={() => setIsDrawerOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}
