"use client"

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
  return (
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
      <DropdownMenuContent align="end" className="w-48">
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
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

