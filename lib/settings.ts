import type { JobApplicationStatus } from "@/lib/types/database"

export const SETTINGS_STORAGE_KEY = "ferm.settings"

export const timezoneOptions = [
  { label: "Pacific Time (PT)", value: "America/Los_Angeles" },
  { label: "Mountain Time (MT)", value: "America/Denver" },
  { label: "Central Time (CT)", value: "America/Chicago" },
  { label: "Eastern Time (ET)", value: "America/New_York" },
  { label: "Greenwich Mean Time (GMT)", value: "Europe/London" },
  { label: "Central European Time (CET)", value: "Europe/Berlin" },
  { label: "India Standard Time (IST)", value: "Asia/Kolkata" },
  { label: "Singapore Time (SGT)", value: "Asia/Singapore" },
] as const

export const themeOptions = [
  { label: "System", value: "system" },
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
] as const

export const defaultViewOptions = [
  { label: "Pipeline", value: "pipeline" },
  { label: "Table", value: "table" },
  { label: "Timeline", value: "timeline" },
] as const

export const defaultSortOptions = [
  { label: "Most recent", value: "recent" },
  { label: "Upcoming interviews", value: "upcoming" },
  { label: "Highest priority", value: "priority" },
] as const

export const digestFrequencyOptions = [
  { label: "Off", value: "off" },
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
] as const

export type ThemePreference = (typeof themeOptions)[number]["value"]
export type DigestFrequency = (typeof digestFrequencyOptions)[number]["value"]

export interface SettingsState {
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

export const defaultSettings: SettingsState = {
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

export const ARCHIVED_STATUSES: JobApplicationStatus[] = ["Rejected", "Withdrawn"]
export const ACTIVE_STATUSES: JobApplicationStatus[] = ["Applied", "Interview", "Offer", "Accepted"]
