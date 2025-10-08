"use client"

import { useState } from "react"
import { MoreHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { JobDetailsDialog } from "@/components/job-details-dialog"
import { StatusUpdateDialog } from "@/components/status-update-dialog"
import { EditApplicationDialog } from "@/components/edit-application-dialog"
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog"
import type { JobApplication } from "@/lib/types/database"
import { cn } from "@/lib/utils"

interface ApplicationActionsMenuProps {
  application: JobApplication
  onStatusUpdate: (status: JobApplication["status"], note?: string) => void
  onApplicationUpdate: () => void
  buttonClassName?: string
}

export function ApplicationActionsMenu({
  application,
  onStatusUpdate,
  onApplicationUpdate,
  buttonClassName,
}: ApplicationActionsMenuProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const deleteApplication = async () => {
    try {
      const response = await fetch(`/api/job-applications/${application.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete application")
      }

      onApplicationUpdate()
    } catch (error) {
      console.error("Failed to delete application:", error)
      throw error
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8 p-0 text-muted-foreground hover:text-foreground", buttonClassName)}
            data-prevent-selection-toggle="true"
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Open actions for this application</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <JobDetailsDialog
            application={application}
            onUpdate={onApplicationUpdate}
            trigger={
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                }}
              >
                View details
              </DropdownMenuItem>
            }
          />
          <StatusUpdateDialog
            currentStatus={application.status}
            onStatusUpdate={onStatusUpdate}
            trigger={
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                }}
              >
                Update status
              </DropdownMenuItem>
            }
          />
          <EditApplicationDialog
            application={application}
            onUpdate={onApplicationUpdate}
            trigger={
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                }}
              >
                Edit application
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

      <DeleteConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete application"
        description={`Are you sure you want to delete the application for ${application.position_title} at ${application.company_name}? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={deleteApplication}
      />
    </>
  )
}

