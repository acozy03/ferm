"use client"
import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, MapPin, Video, Phone } from "lucide-react"
import { useInterviews } from "@/lib/hooks/use-interviews"
import { useSettings } from "@/components/settings-provider"

const typeIcons = {
  Phone: Phone,
  Video: Video,
  "In-person": MapPin,
  Technical: Clock,
  Final: Calendar,
}

const typeColors = {
  Phone: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  Video: "bg-green-500/10 text-green-500 border-green-500/20",
  "In-person": "bg-purple-500/10 text-purple-500 border-purple-500/20",
  Technical: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  Final: "bg-red-500/10 text-red-500 border-red-500/20",
}

export function UpcomingInterviews() {
  const { settings } = useSettings()
  const { interviews, isLoading, error } = useInterviews({ upcoming_only: true })

  const calendarDayFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone: settings.timezone,
      }),
    [settings.timezone],
  )

  const dateLabelFormatter = useMemo(
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const targetDay = calendarDayFormatter.format(date)
    const todayDay = calendarDayFormatter.format(today)
    const tomorrowDay = calendarDayFormatter.format(tomorrow)

    if (targetDay === todayDay) return "Today"
    if (targetDay === tomorrowDay) return "Tomorrow"
    return dateLabelFormatter.format(date)
  }

  const formatTime = (dateString: string) => {
    return timeFormatter.format(new Date(dateString))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Upcoming Interviews
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="p-3 rounded-lg border bg-card/50">
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-32 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-20 bg-muted animate-pulse rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">Error loading interviews</p>
        ) : interviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming interviews</p>
        ) : (
          <div className="space-y-4">
            {interviews.map((interview) => {
              const Icon = typeIcons[interview.interview_type] || Clock
              return (
                <div key={interview.id} className="flex items-start justify-between p-3 rounded-lg border bg-card/50">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm text-balance">
                        {interview.job_applications?.company_name ?? "Unknown Company"}
                      </h4>
                      <Badge variant="outline" className={typeColors[interview.interview_type]}>
                        <Icon className="h-3 w-3 mr-1" />
                        {interview.interview_type}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground text-pretty">
                      {interview.job_applications?.position_title ?? "Unknown Position"}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>
                        {formatDate(interview.scheduled_date)} at {formatTime(interview.scheduled_date)}
                      </span>
                      {interview.interviewer_name && <span>with {interview.interviewer_name}</span>}
                    </div>
                    {interview.duration_minutes && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{interview.duration_minutes} minutes</span>
                      </div>
                    )}
                  </div>
                  <Button variant="outline" size="sm" className="bg-transparent">
                    Details
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
