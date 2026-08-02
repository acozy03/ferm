"use client"

import { useState } from "react"
import { MoreHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { JobDetailsDialog } from "@/components/job-details-dialog"
import { StatusUpdateDialog } from "@/components/status-update-dialog"
import { EditApplicationDialog } from "@/components/edit-application-dialog"
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog"
import type { JobApplication } from "@/lib/types/database"
import { apiFetch } from "@/lib/fetcher"
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
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const deleteApplication = async () => {
    try {
      const response = await apiFetch(`/api/job-applications/${application.id}`, {
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
      <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
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
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault()
              event.stopPropagation()
              setIsDetailsDialogOpen(true)
              setIsMenuOpen(false)
            }}
          >
            View details
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault()
              event.stopPropagation()
              setIsStatusDialogOpen(true)
              setIsMenuOpen(false)
            }}
          >
            Update status
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault()
              event.stopPropagation()
              setIsEditDialogOpen(true)
              setIsMenuOpen(false)
            }}
          >
            Edit application
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

      <JobDetailsDialog application={application} open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen} />
      <StatusUpdateDialog
        currentStatus={application.status}
        onStatusUpdate={onStatusUpdate}
        open={isStatusDialogOpen}
        onOpenChange={setIsStatusDialogOpen}
      />
      <EditApplicationDialog
        application={application}
        onUpdate={onApplicationUpdate}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />
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
