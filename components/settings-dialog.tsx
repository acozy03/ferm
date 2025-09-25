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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/use-toast"

const STORAGE_KEY = "ferm.settings"

const timezoneOptions = [
  { label: "Pacific Time (PT)", value: "America/Los_Angeles" },
  { label: "Mountain Time (MT)", value: "America/Denver" },
  { label: "Central Time (CT)", value: "America/Chicago" },
  { label: "Eastern Time (ET)", value: "America/New_York" },
  { label: "Greenwich Mean Time (GMT)", value: "Europe/London" },
  { label: "Central European Time (CET)", value: "Europe/Berlin" },
  { label: "India Standard Time (IST)", value: "Asia/Kolkata" },
  { label: "Singapore Time (SGT)", value: "Asia/Singapore" },
]

const themeOptions = [
  { label: "System", value: "system" },
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
] as const

const defaultViewOptions = [
  { label: "Pipeline", value: "pipeline" },
  { label: "Table", value: "table" },
  { label: "Timeline", value: "timeline" },
]

const defaultSortOptions = [
  { label: "Most recent", value: "recent" },
  { label: "Upcoming interviews", value: "upcoming" },
  { label: "Highest priority", value: "priority" },
]

const digestFrequencyOptions = [
  { label: "Off", value: "off" },
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
] as const

type ThemePreference = (typeof themeOptions)[number]["value"]

type DigestFrequency = (typeof digestFrequencyOptions)[number]["value"]

type SettingsState = {
  displayName: string
  email: string
  jobFocus: string
  theme: ThemePreference
  timezone: string
  defaultView: string
  defaultSort: string
  digestFrequency: DigestFrequency
  applicationReminders: boolean
  interviewPrepReminders: boolean
  weeklySummary: boolean
  productUpdates: boolean
  autoArchiveRejected: boolean
  showArchived: boolean
  shareAnalytics: boolean
  interviewPrepChecklist: boolean
  notesTemplate: string
}

const defaultSettings: SettingsState = {
  displayName: "",
  email: "",
  jobFocus: "",
  theme: "system",
  timezone: "America/Los_Angeles",
  defaultView: "pipeline",
  defaultSort: "recent",
  digestFrequency: "weekly",
  applicationReminders: true,
  interviewPrepReminders: true,
  weeklySummary: true,
  productUpdates: false,
  autoArchiveRejected: false,
  showArchived: false,
  shareAnalytics: true,
  interviewPrepChecklist: true,
  notesTemplate:
    "Hi {contact_name},\n\nThank you for taking the time to meet. I enjoyed learning more about {company_name} and the {role_name} opportunity.\n\nBest,\n{your_name}",
}

interface SettingsDialogProps {
  trigger?: ReactNode
}

export function SettingsDialog({ trigger }: SettingsDialogProps) {
  const [open, setOpen] = useState(false)
  const [settings, setSettings] = useState<SettingsState>(defaultSettings)
  const [draft, setDraft] = useState<SettingsState>(defaultSettings)
  const [activeTab, setActiveTab] = useState("general")
  const [hasHydrated, setHasHydrated] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<SettingsState>
        const merged = { ...defaultSettings, ...parsed }
        setSettings(merged)
        setDraft(merged)
      } else {
        setSettings(defaultSettings)
        setDraft(defaultSettings)
      }
    } catch (error) {
      console.error("Failed to load settings from localStorage", error)
      setSettings(defaultSettings)
      setDraft(defaultSettings)
    } finally {
      setHasHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (open) {
      setDraft(settings)
      setActiveTab("general")
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

  const persistSettings = (nextSettings: SettingsState) => {
    if (typeof window === "undefined") {
      return
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSettings))
    } catch (error) {
      console.error("Failed to save settings to localStorage", error)
    }
  }

  const handleSave = () => {
    setSettings(draft)
    persistSettings(draft)
    toast({
      title: "Settings saved",
      description: "Your workspace preferences have been updated.",
    })
    setOpen(false)
  }

  const handleReset = () => {
    setDraft(defaultSettings)
    setSettings(defaultSettings)
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY)
    }
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
          <DialogDescription>
            Configure your job tracking preferences, notifications, and workflow defaults.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="md:flex-row md:items-start md:gap-8"
        >
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
            <TabsList className="bg-transparent h-full w-full max-w-none grid grid-cols-3 gap-2 p-0 md:w-[220px] md:grid-cols-1">
              <TabsTrigger value="general" className="justify-start">
                General
              </TabsTrigger>
              <TabsTrigger value="notifications" className="justify-start">
                Notifications
              </TabsTrigger>
              <TabsTrigger value="workflow" className="justify-start">
                Workflow
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 space-y-6">
              <TabsContent value="general" className="space-y-6">
                <section className="space-y-4 rounded-lg border border-border/60 bg-muted/5 p-4">
                  <header className="space-y-1">
                    <h3 className="text-sm font-medium">Profile</h3>
                    <p className="text-sm text-muted-foreground">
                      This information is used for exports, email templates, and interview prep docs.
                    </p>
                  </header>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="display-name">Full name</Label>
                      <Input
                        id="display-name"
                        value={draft.displayName}
                        onChange={(event) => updateDraft("displayName", event.target.value)}
                        placeholder="Ada Lovelace"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-email">Contact email</Label>
                      <Input
                        id="contact-email"
                        type="email"
                        value={draft.email}
                        onChange={(event) => updateDraft("email", event.target.value)}
                        placeholder="you@personal.dev"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="job-focus">Job search focus</Label>
                    <Textarea
                      id="job-focus"
                      value={draft.jobFocus}
                      onChange={(event) => updateDraft("jobFocus", event.target.value)}
                      placeholder="e.g. Remote senior frontend roles working with React and TypeScript"
                      rows={3}
                    />
                  </div>
                </section>

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
                      <Label htmlFor="timezone">Time zone</Label>
                      <Select
                        value={draft.timezone}
                        onValueChange={(value) => updateDraft("timezone", value)}
                      >
                        <SelectTrigger id="timezone">
                          <SelectValue placeholder="Select time zone" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {timezoneOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="default-view">Default dashboard view</Label>
                      <Select
                        value={draft.defaultView}
                        onValueChange={(value) => updateDraft("defaultView", value)}
                      >
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
                      <Select
                        value={draft.defaultSort}
                        onValueChange={(value) => updateDraft("defaultSort", value)}
                      >
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
              </TabsContent>

              <TabsContent value="notifications" className="space-y-6">
                <section className="space-y-4 rounded-lg border border-border/60 bg-muted/5 p-4">
                  <header className="space-y-1">
                    <h3 className="text-sm font-medium">Reminders</h3>
                    <p className="text-sm text-muted-foreground">
                      Stay on top of follow-ups and interviews with timely nudges.
                    </p>
                  </header>
                  <div className="space-y-4">
                    <SettingToggle
                      id="application-reminders"
                      title="Application follow-ups"
                      description="Receive reminders when it&apos;s time to check in with a recruiter or hiring manager."
                      checked={draft.applicationReminders}
                      onCheckedChange={(checked) => updateDraft("applicationReminders", checked)}
                    />
                    <SettingToggle
                      id="interview-reminders"
                      title="Interview prep"
                      description="Get preparation checklists and suggested questions before each interview."
                      checked={draft.interviewPrepReminders}
                      onCheckedChange={(checked) => updateDraft("interviewPrepReminders", checked)}
                    />
                    <SettingToggle
                      id="weekly-summary"
                      title="Weekly summary"
                      description="A digest of pipeline changes and applications that need attention."
                      checked={draft.weeklySummary}
                      onCheckedChange={(checked) => updateDraft("weeklySummary", checked)}
                    />
                  </div>
                </section>

                <section className="space-y-4 rounded-lg border border-border/60 bg-muted/5 p-4">
                  <header className="space-y-1">
                    <h3 className="text-sm font-medium">Communication</h3>
                    <p className="text-sm text-muted-foreground">
                      Control the types of emails and updates you receive from ferm.dev.
                    </p>
                  </header>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="digest-frequency">Digest frequency</Label>
                      <Select
                        value={draft.digestFrequency}
                        onValueChange={(value) => updateDraft("digestFrequency", value as DigestFrequency)}
                      >
                        <SelectTrigger id="digest-frequency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {digestFrequencyOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <SettingToggle
                      id="product-updates"
                      title="Product updates"
                      description="Be the first to hear about new features, templates, and improvements."
                      checked={draft.productUpdates}
                      onCheckedChange={(checked) => updateDraft("productUpdates", checked)}
                    />
                  </div>
                </section>
              </TabsContent>

              <TabsContent value="workflow" className="space-y-6">
                <section className="space-y-4 rounded-lg border border-border/60 bg-muted/5 p-4">
                  <header className="space-y-1">
                    <h3 className="text-sm font-medium">Pipeline hygiene</h3>
                    <p className="text-sm text-muted-foreground">
                      Automate small tasks so your dashboard stays organized.
                    </p>
                  </header>
                  <div className="space-y-4">
                    <SettingToggle
                      id="auto-archive"
                      title="Auto-archive rejected roles"
                      description="Move rejected applications to the archive after two weeks."
                      checked={draft.autoArchiveRejected}
                      onCheckedChange={(checked) => updateDraft("autoArchiveRejected", checked)}
                    />
                    <SettingToggle
                      id="show-archived"
                      title="Show archived applications"
                      description="Display archived roles alongside your active pipeline."
                      checked={draft.showArchived}
                      onCheckedChange={(checked) => updateDraft("showArchived", checked)}
                    />
                    <SettingToggle
                      id="share-analytics"
                      title="Include analytics in exports"
                      description="Attach charts and summaries when exporting your pipeline."
                      checked={draft.shareAnalytics}
                      onCheckedChange={(checked) => updateDraft("shareAnalytics", checked)}
                    />
                  </div>
                </section>

                <section className="space-y-4 rounded-lg border border-border/60 bg-muted/5 p-4">
                  <header className="space-y-1">
                    <h3 className="text-sm font-medium">Templates</h3>
                    <p className="text-sm text-muted-foreground">
                      Customize the default content ferm.dev uses when drafting notes and follow-ups.
                    </p>
                  </header>
                  <div className="space-y-4">
                    <SettingToggle
                      id="interview-checklist"
                      title="Interview prep checklist"
                      description="Automatically attach a prep checklist to every scheduled interview."
                      checked={draft.interviewPrepChecklist}
                      onCheckedChange={(checked) => updateDraft("interviewPrepChecklist", checked)}
                    />
                    <div className="space-y-2">
                      <Label htmlFor="notes-template">Follow-up template</Label>
                      <Textarea
                        id="notes-template"
                        value={draft.notesTemplate}
                        onChange={(event) => updateDraft("notesTemplate", event.target.value)}
                        rows={4}
                      />
                      <p className="text-xs text-muted-foreground">
                        Use placeholders like {"{contact_name}"}, {"{company_name}"}, and {"{role_name}"}. ferm.dev will replace them when you
                        generate a note.
                      </p>
                    </div>
                  </div>
                </section>
              </TabsContent>
            </div>
          </div>
        </Tabs>

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

interface SettingToggleProps {
  id: string
  title: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

function SettingToggle({ id, title, description, checked, onCheckedChange }: SettingToggleProps) {
  return (
    <div className="flex items-start gap-4 rounded-md border border-border/40 bg-background/60 p-4">
      <div className="flex-1 space-y-1">
        <Label htmlFor={id} className="text-sm font-medium">
          {title}
        </Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}
