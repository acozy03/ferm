"use client"
import { useState } from "react"
import type { KeyboardEvent, MouseEvent } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, MapPin, DollarSign, Calendar, FileText } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { StatusUpdateDialog } from "@/components/status-update-dialog"
import { JobDetailsDialog } from "@/components/job-details-dialog"
import { EditApplicationDialog } from "@/components/edit-application-dialog"
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog"
import { JobScoreIndicator } from "@/components/job-score-indicator"
import type { JobApplication, JobApplicationStatus } from "@/lib/types/database"
import { cn } from "@/lib/utils"
import { formatStatusLabel, getStatusBadgeClass } from "@/lib/status"

interface JobApplicationCardProps {
  application: JobApplication
  isSelected?: boolean
  onSelect?: (selected: boolean) => void
  onUpdate?: () => void
}

export function JobApplicationCard({ application, isSelected, onSelect, onUpdate }: JobApplicationCardProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const handleStatusUpdate = async (status: JobApplicationStatus, note?: string) => {
    try {
      const response = await fetch(`/api/job-applications/${application.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          ...(note && { notes: note }),
        }),
      })

      if (response.ok && onUpdate) {
        onUpdate()
      }
    } catch (error) {
      console.error("Failed to update application:", error)
    }
  }

  const deleteApplication = async () => {
    try {
      const response = await fetch(`/api/job-applications/${application.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete application")
      }

      if (onUpdate) {
        onUpdate()
      }
    } catch (error) {
      console.error("Failed to delete application:", error)
      throw error
    }
  }

  const handleCardClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!onSelect) return

    const target = event.target as HTMLElement
    if (event.defaultPrevented) {
      return
    }

    if (
      target.closest(
        "button, a, [role='button'], input, textarea, select, [data-prevent-card-toggle='true']",
      )
    ) {
      return
    }

    onSelect(!isSelected)
  }

  const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!onSelect) return
    if (event.currentTarget !== event.target) return

    if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
      event.preventDefault()
      onSelect(!isSelected)
    }
  }

  return (
    <Card
      className={cn(
        "group relative transition-colors hover:bg-accent/50",
        onSelect &&
          "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        isSelected && "bg-accent/70 ring-2 ring-primary",
      )}
      role={onSelect ? "checkbox" : undefined}
      aria-checked={onSelect ? isSelected : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
    >
      <CardHeader className="pb-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
          <div className="min-w-0 space-y-1">
            <h3 className="text-lg font-semibold leading-tight line-clamp-2 break-words">
              {application.position_title}
            </h3>
            <p className="font-medium text-muted-foreground line-clamp-1 break-words">
              {application.company_name}
            </p>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Badge className={`${getStatusBadgeClass(application.status)} shrink-0`} variant="outline">
              {formatStatusLabel(application.status)}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <EditApplicationDialog
                  application={application}
                  onUpdate={onUpdate || (() => {})}
                  trigger={
                    <DropdownMenuItem
                      onSelect={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                      }}
                    >
                      Edit Application
                    </DropdownMenuItem>
                  }
                />
                <DropdownMenuItem
                  className="text-destructive"
                  onSelect={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    setIsDeleteDialogOpen(true)
                  }}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
          <div className="inline-flex items-center gap-2 whitespace-nowrap">
            <Calendar className="h-4 w-4" />
            <span>Applied {formatDate(application.application_date)}</span>
          </div>
          {application.location && (
            <div className="inline-flex min-w-[140px] items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span className="max-w-[12rem] truncate" title={application.location}>
                {application.location}
              </span>
            </div>
          )}
          {application.salary_range && (
            <div className="inline-flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="max-w-[10rem] truncate" title={application.salary_range}>
                {application.salary_range}
              </span>
            </div>
          )}
        </div>

        {application.notes && (
          <div className="flex items-start gap-2 text-sm">
            <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-muted-foreground text-pretty line-clamp-3 break-words">
              {application.notes}
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex flex-wrap items-center gap-2">
            <JobDetailsDialog
              application={application}
              onUpdate={onUpdate || (() => {})}
              trigger={
                <Button variant="outline" size="sm">
                  View Details
                </Button>
              }
            />
            <StatusUpdateDialog
              currentStatus={application.status}
              onStatusUpdate={handleStatusUpdate}
              trigger={
                <Button variant="outline" size="sm">
                  Update Status
                </Button>
              }
            />
          </div>
          <JobScoreIndicator
            score={application.resume_match_score ?? null}
            createdAt={application.created_at}
            align="end"
          />
        </div>
      </CardContent>
      <DeleteConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete application"
        description={`Are you sure you want to delete the application for ${application.position_title} at ${application.company_name}? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={deleteApplication}
      />
    </Card>
  )
}

