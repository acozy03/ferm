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

interface StatusUpdateDialogProps {
  currentStatus: JobApplicationStatus
  statusHistory?: JobApplicationStatusHistory[]
  onStatusUpdate: (status: JobApplicationStatus, note?: string) => void
  trigger: React.ReactNode
}

export function StatusUpdateDialog({ currentStatus, statusHistory, onStatusUpdate, trigger }: StatusUpdateDialogProps) {
  const currentMetadata = useMemo(() => parseStatus(currentStatus), [currentStatus])
  const [selectedStatus, setSelectedStatus] = useState<JobApplicationStatus>(currentMetadata.value)
  const [note, setNote] = useState("")
  const [open, setOpen] = useState(false)

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
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
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
                  <Badge variant="outline" className={getStatusBadgeClass(currentMetadata.value)}>
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
                  <SelectTrigger id="new-status" className="mt-3">
                    <SelectValue placeholder="Select a status" />
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
            <Button variant="outline" onClick={() => setOpen(false)}>
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
