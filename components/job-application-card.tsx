"use client"
import { useState } from "react"
import type { KeyboardEvent, MouseEvent } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, MapPin, DollarSign, Calendar } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { TruncatedText } from "@/components/ui/truncate"
import { StatusUpdateDialog } from "@/components/status-update-dialog"
import { JobDetailsDialog } from "@/components/job-details-dialog"
import { EditApplicationDialog } from "@/components/edit-application-dialog"
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog"
import { JobScoreIndicator } from "@/components/job-score-indicator"
import type { JobApplication, JobApplicationStatus } from "@/lib/types/database"
import { cn } from "@/lib/utils"
import { formatStatusLabel, getStatusBadgeClass } from "@/lib/status"
import { getDateOrNull } from "@/lib/date"

interface JobApplicationCardProps {
  application: JobApplication
  isSelected?: boolean
  onSelect?: (selected: boolean) => void
  onUpdate?: () => void
}

export function JobApplicationCard({ application, isSelected, onSelect, onUpdate }: JobApplicationCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  const formatDate = (dateString: string) => {
    const parsed = getDateOrNull(dateString)
    if (!parsed) {
      return "Date unavailable"
    }
    return parsed.toLocaleDateString("en-US", {
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
            <TruncatedText
              text={application.position_title}
              className="text-lg font-semibold leading-tight"
              maxWidthClass="max-w-[30rem]"
            />
            <TruncatedText
              text={application.company_name}
              className="font-medium text-muted-foreground"
              maxWidthClass="max-w-[25rem]"
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <Badge
              className={`${getStatusBadgeClass(application.status)} shrink-0 h-8 px-3 text-sm`}
              variant="outline"
            >
              {formatStatusLabel(application.status)}
            </Badge>
            <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    setIsEditDialogOpen(true)
                    setIsMenuOpen(false)
                  }}
                >
                  Edit Application
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onSelect={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    setIsDeleteDialogOpen(true)
                    setIsMenuOpen(false)
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
              <TruncatedText text={application.location} maxWidthClass="max-w-[12rem]" />
            </div>
          )}
          {application.salary_range && (
            <div className="inline-flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <TruncatedText text={application.salary_range} maxWidthClass="max-w-[10rem]" />
            </div>
          )}
        </div>

     

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
        description={`Are you sure you want to delete this application? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={deleteApplication}
      />
      <EditApplicationDialog
        application={application}
        onUpdate={onUpdate || (() => {})}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />
    </Card>
  )
}
