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
import { AddNoteDialog } from "@/components/add-note-dialog"
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog"
import type { JobApplication } from "@/lib/types/database"
import { cn } from "@/lib/utils"

interface JobApplicationCardProps {
  application: JobApplication
  isSelected?: boolean
  onSelect?: (selected: boolean) => void
  onUpdate?: () => void
}

const statusColors = {
  Applied: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  Interview: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  Rejected: "bg-red-500/10 text-red-500 border-red-500/20",
  Offer: "bg-green-500/10 text-green-500 border-green-500/20",
  Accepted: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  Withdrawn: "bg-gray-500/10 text-gray-500 border-gray-500/20",
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

  const handleStatusUpdate = async (status: string, note?: string) => {
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

  const handleDuplicate = async () => {
    try {
      const duplicateData = {
        company_name: `${application.company_name} (Copy)`,
        position_title: application.position_title,
        status: "Applied" as const,
        application_date: new Date().toISOString().split("T")[0],
        location: application.location,
        salary_range: application.salary_range,
        job_url: application.job_url,
        contact_person: application.contact_person,
        contact_email: application.contact_email,
        notes: application.notes,
      }

      const response = await fetch("/api/job-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(duplicateData),
      })

      if (response.ok && onUpdate) {
        onUpdate()
      }
    } catch (error) {
      console.error("Failed to duplicate application:", error)
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-1">
            <h3 className="text-lg font-semibold leading-tight text-balance">
              {application.position_title}
            </h3>
            <p className="font-medium text-muted-foreground">{application.company_name}</p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Badge variant="outline" className={statusColors[application.status]}>
              {application.status}
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
                <AddNoteDialog
                  applicationId={application.id}
                  currentNotes={application.notes || ""}
                  onUpdate={onUpdate || (() => {})}
                  trigger={
                    <DropdownMenuItem
                      onSelect={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                      }}
                    >
                      Add Note
                    </DropdownMenuItem>
                  }
                />
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    handleDuplicate()
                  }}
                >
                  Duplicate
                </DropdownMenuItem>
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
              <span className="whitespace-normal sm:whitespace-nowrap">{application.location}</span>
            </div>
          )}
          {application.salary_range && (
            <div className="inline-flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span>{application.salary_range}</span>
            </div>
          )}
        </div>

        {application.notes && (
          <div className="flex items-start gap-2 text-sm">
            <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-muted-foreground text-pretty">{application.notes}</p>
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
          <div className="text-xs text-muted-foreground sm:text-right">ID: {application.id.slice(0, 8)}</div>
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

