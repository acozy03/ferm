"use client"

import type { ReactNode } from "react"
import { useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import {
  defaultSettings,
  defaultSortOptions,
  defaultViewOptions,
  themeOptions,
  type SettingsState,
  type ThemePreference,
} from "@/lib/settings"
import { useSettings } from "@/components/settings-provider"

interface SettingsDialogProps {
  trigger?: ReactNode
}

export function SettingsDialog({ trigger }: SettingsDialogProps) {
  const { settings, hasHydrated, updateSettings: saveSettings, resetSettings: restoreSettings } = useSettings()
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

  const isDefaultSettings = useMemo(() => {
    return JSON.stringify(settings) === JSON.stringify(defaultSettings)
  }, [settings])

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

  const handleReset = () => {
    restoreSettings()
    setDraft(defaultSettings)
    toast({
      title: "Settings restored",
      description: "All preferences have been reset to their defaults.",
    })
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
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Workspace settings</DialogTitle>
          <DialogDescription>Configure your job tracking preferences.</DialogDescription>
        </DialogHeader>

        <section className="space-y-4 rounded-lg border border-border/60 bg-muted/5 p-4">
          <header className="space-y-1">
            <h3 className="text-sm font-medium">Preferences</h3>
            <p className="text-sm text-muted-foreground">
              Choose how ferm.dev should present information by default.
            </p>
          </header>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="theme">Theme</Label>
              <Select value={draft.theme} onValueChange={(value) => updateDraft("theme", value as ThemePreference)}>
                <SelectTrigger id="theme">
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  {themeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="default-view">Default dashboard view</Label>
              <Select value={draft.defaultView} onValueChange={(value) => updateDraft("defaultView", value)}>
                <SelectTrigger id="default-view">
                  <SelectValue placeholder="Choose a view" />
                </SelectTrigger>
                <SelectContent>
                  {defaultViewOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="default-sort">Default sort</Label>
              <Select value={draft.defaultSort} onValueChange={(value) => updateDraft("defaultSort", value)}>
                <SelectTrigger id="default-sort">
                  <SelectValue placeholder="Choose a sort order" />
                </SelectTrigger>
                <SelectContent>
                  {defaultSortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <DialogFooter className="flex flex-col gap-2 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="ghost" type="button" onClick={handleReset} disabled={!hasChanges && isDefaultSettings}>
            Restore defaults
          </Button>
          <div className="flex w-full justify-end gap-2 sm:w-auto">
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
