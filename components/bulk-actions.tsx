"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Trash2, Edit, Download, X } from "lucide-react"

interface BulkActionsProps {
  selectedCount: number
  onBulkStatusUpdate: (status: string) => void
  onBulkDelete: () => void
  onBulkExport: () => void
  onClearSelection: () => void
}

const statusOptions = [
  { value: "Applied", label: "Applied" },
  { value: "Interview", label: "Interview" },
  { value: "Rejected", label: "Rejected" },
  { value: "Offer", label: "Offer" },
  { value: "Accepted", label: "Accepted" },
]

export function BulkActions({
  selectedCount,
  onBulkStatusUpdate,
  onBulkDelete,
  onBulkExport,
  onClearSelection,
}: BulkActionsProps) {
  const [bulkStatus, setBulkStatus] = useState("")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (selectedCount === 0) {
      setBulkStatus("")
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
      setBulkStatus("")
    }
  }

  const content = (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      <div className="pointer-events-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-3 rounded-xl border bg-background/95 p-4 shadow-lg backdrop-blur">
        <div className="flex items-center gap-3">
          <Badge variant="secondary">{selectedCount} selected</Badge>
          <Button variant="ghost" size="sm" onClick={onClearSelection}>
            Clear
          </Button>
        </div>

        <div className="flex flex-1 flex-wrap items-center justify-end gap-2 sm:flex-none">
          <Select value={bulkStatus} onValueChange={setBulkStatus}>
            <SelectTrigger className="w-full min-w-[10rem] sm:w-48">
              <SelectValue placeholder="Update status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={handleStatusUpdate} disabled={!bulkStatus}>
            <Edit className="mr-1 h-4 w-4" />
            Update
          </Button>

          <Button variant="outline" size="sm" onClick={onBulkExport}>
            <Download className="mr-1 h-4 w-4" />
            Export
          </Button>

          <Button variant="destructive" size="sm" onClick={onBulkDelete}>
            <Trash2 className="mr-1 h-4 w-4" />
            Delete
          </Button>

          <Button variant="ghost" size="icon" onClick={onClearSelection} aria-label="Exit selection mode">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}
