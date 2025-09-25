"use client"

import type React from "react"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { MapPin, DollarSign, Calendar, FileText, Edit, Save, X } from "lucide-react"
import type { JobApplication as DbJobApplication, JobApplicationStatus } from "@/lib/types/database"

type JobDetailsDialogProps = {
  application: DbJobApplication
  onUpdate: () => void
  trigger: React.ReactNode
}

const statusColors = {
  Applied: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  Interview: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  Rejected: "bg-red-500/10 text-red-500 border-red-500/20",
  Offer: "bg-green-500/10 text-green-500 border-green-500/20",
  Accepted: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  Withdrawn: "bg-gray-500/10 text-gray-500 border-gray-500/20",
} satisfies Record<JobApplicationStatus, string>;

export function JobDetailsDialog({ application, trigger, onUpdate }: JobDetailsDialogProps) {
  const [open, setOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedNotes, setEditedNotes] = useState<string>(application.notes ?? "")

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const handleSaveNotes = async () => {
    try {
      // update notes on the server so parent can refetch
      const resp = await fetch(`/api/job-applications/${application.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: editedNotes }),
      })
      if (!resp.ok) throw new Error("Failed to save notes")
      onUpdate() // parent will reload data
      setIsEditing(false)
    } catch (e) {
      console.error(e)
    }
  }

  const handleCancelEdit = () => {
    setEditedNotes(application.notes ?? "")
    setIsEditing(false)
  }

  const daysSinceApplied = Math.floor(
    (Date.now() - new Date(application.application_date).getTime()) / (1000 * 60 * 60 * 24),
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl text-balance">{application.position_title}</DialogTitle>
          <div className="flex items-center gap-2">
            <span className="text-lg font-medium">{application.company_name}</span>
            <Badge variant="outline" className={statusColors[application.status]}>
              {application.status}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Applied:</span>
                <span>{formatDate(application.application_date)}</span>
              </div>
              {application.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Location:</span>
                  <span>{application.location}</span>
                </div>
              )}
              {application.salary_range && (
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Salary:</span>
                  <span>{application.salary_range}</span>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="text-sm">
                <span className="text-muted-foreground">Application ID:</span>
                <span className="ml-2 font-mono text-xs">{application.id}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Days since applied:</span>
                <span className="ml-2">{daysSinceApplied} days</span>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Notes</Label>
              </div>
              {!isEditing ? (
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="gap-1">
                  <Edit className="h-3 w-3" />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={handleSaveNotes} className="gap-1">
                    <Save className="h-3 w-3" />
                    Save
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleCancelEdit} className="gap-1">
                    <X className="h-3 w-3" />
                    Cancel
                  </Button>
                </div>
              )}
            </div>

            {isEditing ? (
              <Textarea
                value={editedNotes}
                onChange={(e) => setEditedNotes(e.target.value)}
                placeholder="Add notes about this application..."
                rows={4}
              />
            ) : (
              <div className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-md">
                {application.notes || "No notes added yet."}
              </div>
            )}
          </div>

          <Separator />

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
            <div className="flex gap-2">
              {/* Hook these up later as needed */}
              <Button variant="outline">Edit Application</Button>
              <Button variant="destructive">Delete Application</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
