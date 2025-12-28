"use client"

import type { ReactNode } from "react"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { themeOptions, type SettingsState, type ThemePreference } from "@/lib/settings"
import { useSettings } from "@/components/settings-provider"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSupabase } from "@/components/supabase-provider"
import { Laptop, Moon, SunMedium } from "lucide-react"

interface SettingsDialogProps {
  trigger?: ReactNode
}

const themeIconMap: Record<ThemePreference, typeof SunMedium> = {
  system: Laptop,
  light: SunMedium,
  dark: Moon,
}

export function SettingsDialog({ trigger }: SettingsDialogProps) {
  const { settings, hasHydrated, updateSettings: saveSettings } = useSettings()
  const { supabase } = useSupabase()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [draft, setDraft] = useState<SettingsState>(settings)

  useEffect(() => {
    if (!hasHydrated) {
      return
    }

    setDraft(settings)
  }, [settings, hasHydrated])

  useEffect(() => {
    if (open) {
      setDraft(settings)
    }
  }, [open, settings])

  const hasChanges = useMemo(() => {
    return JSON.stringify(settings) !== JSON.stringify(draft)
  }, [settings, draft])

  const updateDraft = <Key extends keyof SettingsState>(key: Key, value: SettingsState[Key]) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = () => {
    saveSettings(draft)
    toast({
      title: "Settings saved",
      description: "Your workspace preferences have been updated.",
    })
    setOpen(false)
  }

  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch("/api/account/delete", { method: "POST" })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        const errorMessage = payload?.error || "Failed to delete account. Please try again."
        throw new Error(errorMessage)
      }

      await supabase.auth.signOut()

      toast({
        title: "Account deleted",
        description: "Your account and associated data have been removed.",
      })
      router.replace("/landing")
      router.refresh()
    } catch (error) {
      console.error("Account deletion failed", error)
      const errorMessage = error instanceof Error ? error.message : "Unable to delete account. Please try again."
      toast({ title: "Deletion failed", description: errorMessage, variant: "destructive" })
    } finally {
      setIsDeleting(false)
    }
  }

  if (!hasHydrated) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-2">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Theme</Label>
            </div>
            <Select value={draft.theme} onValueChange={(value) => updateDraft("theme", value as ThemePreference)}>
              <SelectTrigger className="sm:w-30">
                <SelectValue placeholder="Select a theme" />
              </SelectTrigger>
              <SelectContent align="start">
                {themeOptions.map((option) => {
                  const Icon = themeIconMap[option.value]
                  return (
                    <SelectItem key={option.value} value={option.value} className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span>{option.label}</span>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="border-t border-border/60 pt-4">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full sm:w-auto">
                  Delete account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => void handleDeleteAccount()}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={isDeleting}
                    aria-busy={isDeleting}
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div className="flex w-full justify-end gap-2 sm:w-auto">
              <Button variant="outline" type="button" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleSave} disabled={!hasChanges}>
                Save changes
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
