"use client"

import type { ReactNode } from "react"
import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
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
import { Laptop, Moon, SunMedium } from "lucide-react"
import { cn } from "@/lib/utils"

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
  const [open, setOpen] = useState(false)
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

  const handleDeleteAccount = () => {
    toast({
      title: "Account deletion scheduled",
      description: "We'll send a confirmation email with next steps.",
    })
    setOpen(false)
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
          <DialogTitle>Workspace settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-2">
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Theme</Label>
            <ToggleGroup
              type="single"
              value={draft.theme}
              onValueChange={(value) => value && updateDraft("theme", value as ThemePreference)}
              className="grid gap-2 sm:grid-cols-3"
              variant="outline"
            >
              {themeOptions.map((option) => {
                const Icon = themeIconMap[option.value]
                return (
                  <ToggleGroupItem
                    key={option.value}
                    value={option.value}
                    className={cn("h-12 flex-col gap-1 text-sm", draft.theme === option.value && "text-foreground")}
                    aria-label={option.label}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{option.label}</span>
                  </ToggleGroupItem>
                )
              })}
            </ToggleGroup>
          </div>

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
                <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <DialogFooter className="border-t border-border/60 pt-4">
          <div className="flex w-full justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={!hasChanges}>
              Save changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
