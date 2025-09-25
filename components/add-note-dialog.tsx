"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface AddNoteDialogProps {
  applicationId: string
  currentNotes?: string
  onUpdate: () => void
  trigger: React.ReactNode
}

export function AddNoteDialog({ applicationId, currentNotes = "", onUpdate, trigger }: AddNoteDialogProps) {
  const [open, setOpen] = useState(false)
  const [notes, setNotes] = useState(currentNotes)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch(`/api/job-applications/${applicationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      })

      if (response.ok) {
        onUpdate()
        setOpen(false)
      }
    } catch (error) {
      console.error("Failed to update notes:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Note</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this application, interview details, or follow-up actions..."
              rows={6}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Note"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
