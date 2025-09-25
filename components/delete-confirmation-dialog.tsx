"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface DeleteConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  confirmLabel?: string
  onConfirm: () => Promise<void> | void
}

export function DeleteConfirmationDialog({
  open,
  onOpenChange,
  title = "Delete item",
  description = "This action cannot be undone.",
  confirmLabel = "Delete",
  onConfirm,
}: DeleteConfirmationDialogProps) {
  const [isConfirming, setIsConfirming] = useState(false)

  const handleOpenChange = (nextOpen: boolean) => {
    if (isConfirming && !nextOpen) {
      return
    }
    onOpenChange(nextOpen)
  }

  const handleConfirm = async () => {
    try {
      setIsConfirming(true)
      await onConfirm()
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to confirm delete:", error)
    } finally {
      setIsConfirming(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isConfirming}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isConfirming}>
            {isConfirming ? "Deleting..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
