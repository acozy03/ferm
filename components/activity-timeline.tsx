"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, CheckCircle, MessageSquare, Calendar, Plus } from "lucide-react"
import { useActivityLog } from "@/lib/hooks/use-activity-log"

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

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return "Just now"
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInHours < 48) return "Yesterday"
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="h-4 w-4 bg-muted animate-pulse rounded mt-1" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-32 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-16 bg-muted animate-pulse rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">Error loading activity</p>
        ) : activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent activity</p>
        ) : (
          <div className="space-y-4">
            {activities.slice(0, 10).map((item) => {
              const Icon = activityIcons[item.action_type] || Clock
              const colorClass = activityColors[item.action_type] || "text-gray-500"

              return (
                <div key={item.id} className="flex items-start gap-3">
                  <div className={`mt-1 ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm text-muted-foreground text-pretty">{item.description}</p>
                    {item.new_value && item.old_value && (
                      <div className="text-xs text-muted-foreground">
                        <span className="line-through">{item.old_value}</span> →{" "}
                        <span className="font-medium">{item.new_value}</span>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">{formatTimestamp(item.created_at)}</p>
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
