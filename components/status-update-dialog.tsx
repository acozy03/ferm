"use client"

import type React from "react"

import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import type { JobApplicationStatus, JobApplicationStatusHistory } from "@/lib/types/database"
import {
  formatStatusOptionLabel,
  getAllowedStatusOptions,
  getStatusBadgeClass,
  parseStatus,
} from "@/lib/status"
import { cn } from "@/lib/utils"

interface StatusUpdateDialogProps {
  currentStatus: JobApplicationStatus
  statusHistory?: JobApplicationStatusHistory[]
  onStatusUpdate: (status: JobApplicationStatus, note?: string) => void
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function StatusUpdateDialog({
  currentStatus,
  statusHistory,
  onStatusUpdate,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: StatusUpdateDialogProps) {
  const currentMetadata = useMemo(() => parseStatus(currentStatus), [currentStatus])
  const [selectedStatus, setSelectedStatus] = useState<JobApplicationStatus>(currentMetadata.value)
  const [note, setNote] = useState("")
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const selectedMetadata = useMemo(() => parseStatus(selectedStatus), [selectedStatus])
  const isControlled = typeof controlledOpen === "boolean" && typeof onOpenChange === "function"
  const dialogOpen = isControlled ? controlledOpen : uncontrolledOpen
  const handleOpenChange = (nextOpen: boolean) => {
    if (isControlled) {
      onOpenChange(nextOpen)
    } else {
      setUncontrolledOpen(nextOpen)
    }
  }

  useEffect(() => {
    setSelectedStatus(currentMetadata.value)
  }, [currentMetadata.value])

  const options = useMemo(
    () => getAllowedStatusOptions(currentMetadata.value, { statusHistory }),
    [currentMetadata.value, statusHistory],
  )

  const handleUpdate = () => {
    onStatusUpdate(selectedStatus, note)
    setNote("")
    handleOpenChange(false)
  }

  const handleResetPipeline = () => {
    const resetStatus = "Applied" as JobApplicationStatus
    const hasNote = note.trim().length > 0
    onStatusUpdate(resetStatus, hasNote ? note : undefined)
    setSelectedStatus(resetStatus)
    setNote("")
    handleOpenChange(false)
  }

  const resetDisabled = currentMetadata.value === "Applied"

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Application Status</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="rounded-lg border bg-muted/10 p-4">
            <p className="text-sm font-medium text-muted-foreground">Status Progress</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-md border bg-background/80 p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Current</p>
                <div className="mt-3">
                  <Badge
                    variant="outline"
                    className={cn("w-full justify-center px-3 py-2 text-sm font-medium", getStatusBadgeClass(currentMetadata.value))}
                  >
                    {formatStatusOptionLabel(currentMetadata)}
                  </Badge>
                </div>
              </div>
              <div className="rounded-md border bg-background/80 p-4 shadow-sm">
                <Label
                  htmlFor="new-status"
                  className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Update To
                </Label>
                <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as JobApplicationStatus)}>
                  <SelectTrigger
                    id="new-status"
                    className="mt-3 w-full gap-0 border-none bg-transparent p-0 shadow-none focus-visible:border-transparent focus-visible:ring-0"
                    hideIcon
                  >
                    <SelectValue className="sr-only" placeholder="Select a status" />
                    <Badge
                      variant="outline"
                      className={cn(
                        "w-full justify-center px-3 py-2 text-sm font-medium",
                        selectedMetadata.badgeClass,
                      )}
                    >
                      {formatStatusOptionLabel(selectedMetadata)}
                    </Badge>
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <Badge variant="outline" className={option.badgeClass}>
                          {formatStatusOptionLabel(option)}
                        </Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/10 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">Need to start over?</p>
                <p className="text-xs text-muted-foreground">
                  Reset the pipeline to the initial &ldquo;Applied&rdquo; status if you need to re-run the progression.
                </p>
              </div>
              <Button variant="secondary" onClick={handleResetPipeline} disabled={resetDisabled}>
                Reset to Applied
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Add Note (Optional)</Label>
            <Textarea
              id="note"
              placeholder="Add any additional notes about this status change..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={selectedStatus === currentMetadata.value && note.trim().length === 0}>
              Update Status
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
