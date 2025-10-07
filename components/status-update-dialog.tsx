"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

interface StatusUpdateDialogProps {
  currentStatus: string
  onStatusUpdate: (status: string, note?: string) => void
  trigger: React.ReactNode
}

const statusOptions = [
  { value: "Applied", label: "Applied", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  { value: "Interview", label: "Interview", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
  { value: "Rejected", label: "Rejected", color: "bg-red-500/10 text-red-500 border-red-500/20" },
  { value: "Offer", label: "Offer", color: "bg-green-500/10 text-green-500 border-green-500/20" },
  { value: "Accepted", label: "Accepted", color: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
]

export function StatusUpdateDialog({ currentStatus, onStatusUpdate, trigger }: StatusUpdateDialogProps) {
  const [selectedStatus, setSelectedStatus] = useState(currentStatus)
  const [note, setNote] = useState("")
  const [open, setOpen] = useState(false)

  const handleUpdate = () => {
    onStatusUpdate(selectedStatus, note)
    setNote("")
    setOpen(false)
  }

  const selectedOption = statusOptions.find((option) => option.value === selectedStatus)

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
                  <Badge variant="outline" className={selectedOption?.color}>
                    {currentStatus}
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
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger id="new-status" className="mt-3">
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={option.color}>
                            {option.label}
                          </Badge>
                        </div>
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
            <Button onClick={handleUpdate}>Update Status</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
