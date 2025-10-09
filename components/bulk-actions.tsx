"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, Edit, X } from "lucide-react"
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog"
import { SequentialStatusSelect } from "@/components/status-select"
import type { JobApplicationStatus } from "@/lib/types/database"

interface BulkActionsProps {
  selectedCount: number
  onBulkStatusUpdate: (status: string) => void
  onBulkDelete: () => Promise<void>
  onClearSelection: () => void
}

export function BulkActions({
  selectedCount,
  onBulkStatusUpdate,
  onBulkDelete,
  onClearSelection,
}: BulkActionsProps) {
  const [bulkStatus, setBulkStatus] = useState<JobApplicationStatus | undefined>(undefined)
  const [mounted, setMounted] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (selectedCount === 0) {
      setBulkStatus(undefined)
    }
  }, [selectedCount])

  useEffect(() => {
    if (selectedCount === 0) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClearSelection()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onClearSelection, selectedCount])

  if (!mounted || selectedCount === 0) return null

  const handleStatusUpdate = () => {
    if (bulkStatus) {
      onBulkStatusUpdate(bulkStatus)
      setBulkStatus(undefined)
    }
  }

  const content = (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      <div className="pointer-events-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-3 rounded-xl border bg-background/95 p-4 shadow-lg backdrop-blur">
        <div className="flex items-center gap-3">
          <Badge variant="secondary">{selectedCount} selected</Badge>
        </div>

        <div className="flex flex-1 flex-wrap items-center justify-end gap-2 sm:flex-none">
          <SequentialStatusSelect
            value={bulkStatus}
            onChange={(status) => setBulkStatus(status)}
            placeholder="Update status"
            triggerClassName="w-full min-w-[10rem] sm:w-48"
          />

          <Button variant="outline" size="sm" onClick={handleStatusUpdate} disabled={!bulkStatus}>
            <Edit className="mr-1 h-4 w-4" />
            Update
          </Button>

          <Button variant="destructive" size="sm" onClick={() => setIsDeleteDialogOpen(true)}>
            <Trash2 className="mr-1 h-4 w-4" />
            Delete
          </Button>

          <Button variant="ghost" size="icon" onClick={onClearSelection} aria-label="Exit selection mode">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <DeleteConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete selected applications"
        description={`Are you sure you want to delete ${selectedCount} selected application${
          selectedCount === 1 ? "" : "s"
        }? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={async () => {
          await onBulkDelete()
        }}
      />
    </div>
  )

  return createPortal(content, document.body)
}
