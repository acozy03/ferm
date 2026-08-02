"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { useTheme } from "next-themes"

import { SETTINGS_STORAGE_KEY, defaultSettings, type SettingsState } from "@/lib/settings"

interface SettingsContextValue {
  settings: SettingsState
  hasHydrated: boolean
  updateSettings: (next: SettingsState) => void
  updateSetting: <Key extends keyof SettingsState>(key: Key, value: SettingsState[Key]) => void
  resetSettings: () => void
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined)

const STORAGE_ERROR_MESSAGE = "Failed to persist settings to localStorage"

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SettingsState>(defaultSettings)
  const [hasHydrated, setHasHydrated] = useState(false)
  const { setTheme } = useTheme()

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    try {
      const stored = window.localStorage.getItem(SETTINGS_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<SettingsState>
        setSettings({ ...defaultSettings, ...parsed })
      }
    } catch (error) {
      console.error("Failed to load settings from localStorage", error)
      setSettings(defaultSettings)
    } finally {
      setHasHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!hasHydrated) {
      return
    }

    setTheme(settings.theme)
  }, [hasHydrated, setTheme, settings.theme])

  const persistSettings = useCallback((next: SettingsState) => {
    if (typeof window === "undefined") {
      return
    }

    try {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next))
    } catch (error) {
      console.error(STORAGE_ERROR_MESSAGE, error)
    }
  }, [])

  const handleUpdate = useCallback(
    (updater: (previous: SettingsState) => SettingsState) => {
      setSettings((previous) => {
        const next = updater(previous)
        if (hasHydrated) {
          persistSettings(next)
        }
        return next
      })
    },
    [hasHydrated, persistSettings],
  )

  const updateSettings = useCallback(
    (next: SettingsState) => {
      handleUpdate(() => next)
    },
    [handleUpdate],
  )

  const updateSetting = useCallback(
    <Key extends keyof SettingsState>(key: Key, value: SettingsState[Key]) => {
      handleUpdate((previous) => ({ ...previous, [key]: value }))
    },
    [handleUpdate],
  )

  const resetSettings = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(SETTINGS_STORAGE_KEY)
      } catch (error) {
        console.error(STORAGE_ERROR_MESSAGE, error)
      }
    }

    setSettings(defaultSettings)
  }, [])

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, hasHydrated, updateSettings, updateSetting, resetSettings }),
    [hasHydrated, resetSettings, settings, updateSetting, updateSettings],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const context = useContext(SettingsContext)

  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider")
  }

  return context
}
