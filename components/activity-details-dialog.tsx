"use client"

import type { ReactNode } from "react"
import { format } from "date-fns"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import type { ActivityLogWithApplication } from "@/lib/types/database"

const activityLabels: Record<ActivityLogWithApplication["action_type"], string> = {
  application_created: "Application created",
  status_change: "Status changed",
  notes_update: "Notes updated",
  interview_scheduled: "Interview scheduled",
  interview_completed: "Interview completed",
}

type ActivityDetailsDialogProps = {
  activity: ActivityLogWithApplication
  trigger: ReactNode
}

export function ActivityDetailsDialog({ activity, trigger }: ActivityDetailsDialogProps) {
  const job = activity.job_applications
  const timestamp = new Date(activity.created_at)
  const jobTitle = job?.position_title ?? activity.job_position_snapshot ?? undefined
  const companyName = job?.company_name ?? activity.job_company_snapshot ?? undefined
  const hasJobInfo = Boolean(jobTitle || companyName)
  const showValueComparison =
    Boolean(activity.old_value) &&
    Boolean(activity.new_value) &&
    activity.old_value !== activity.new_value
  const singleValue = !showValueComparison
    ? activity.new_value ?? activity.old_value ?? null
    : null

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="space-y-2 text-left">
          <DialogTitle className="text-lg">{activityLabels[activity.action_type]}</DialogTitle>
          <p className="text-sm font-medium text-pretty">
            {hasJobInfo ? (
              <>
                {jobTitle ?? "Job title unavailable"}
                {companyName ? <span className="text-muted-foreground"> - {companyName}</span> : null}
              </>
            ) : (
              "No job details available."
            )}
          </p>
          <DialogDescription>Logged {format(timestamp, "PPpp")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 text-sm">
          <div className="flex flex-col gap-2 text-left">
            <Badge variant="secondary" className="w-fit font-normal">
              {activityLabels[activity.action_type]}
            </Badge>
            {!job && hasJobInfo ? (
              <p className="text-xs text-muted-foreground">This job application has been removed.</p>
            ) : null}
          </div>

          {showValueComparison ? (
            <div className="grid grid-cols-1 gap-2 text-left sm:grid-cols-2">
              <div className="space-y-1 rounded-md border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Previous value</p>
                <p className="break-words text-sm font-medium">{activity.old_value}</p>
              </div>
              <div className="space-y-1 rounded-md border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">New value</p>
                <p className="break-words text-sm font-medium">{activity.new_value}</p>
              </div>
            </div>
          ) : singleValue ? (
            <div className="space-y-1 rounded-md border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Value</p>
              <p className="break-words text-sm font-medium">{singleValue}</p>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
