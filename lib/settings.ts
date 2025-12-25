import type { JobApplicationStatus } from "@/lib/types/database"

export const SETTINGS_STORAGE_KEY = "ferm.settings"

export const themeOptions = [
  { label: "System", value: "system" },
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
] as const

export const defaultViewOptions = [
  { label: "Full", value: "full" },
  { label: "Table", value: "table" },
  { label: "Condensed", value: "condensed" },
] as const

export const defaultSortOptions = [
  { label: "Most recent", value: "recent" },
  { label: "Upcoming interviews", value: "upcoming" },
  { label: "Highest priority", value: "priority" },
] as const

export type ThemePreference = (typeof themeOptions)[number]["value"]

export interface SettingsState {
  theme: ThemePreference
  defaultView: string
  defaultSort: string
}

export const defaultSettings: SettingsState = {
  theme: "system",
  defaultView: "full",
  defaultSort: "recent",
}

export const ARCHIVED_STATUSES: JobApplicationStatus[] = ["Rejected", "Withdrawn"]
export const ACTIVE_STATUSES: JobApplicationStatus[] = ["Applied", "Interview", "Offer", "Accepted"]
