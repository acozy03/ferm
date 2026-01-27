"use client"

import type { ReactNode } from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { type SettingsState } from "@/lib/settings"
import { useSettings } from "@/components/settings-provider"
import { AiKeyPanel } from "@/components/settings/ai-key-panel"
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
import { useSupabase } from "@/components/supabase-provider"

interface SettingsDialogProps {
  trigger?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

type SettingsTabId = "login-security" | "chrome-extension" | "donations" | "api-key"

const settingsTabs: Array<{ id: SettingsTabId; label: string; description: string }> = [
  {
    id: "login-security",
    label: "Login & Security",
    description: "Manage your account, sign-in, and deletion settings.",
  },
  {
    id: "chrome-extension",
    label: "Chrome Extension",
    description: "Configure the browser extension connection.",
  },
  {
    id: "donations",
    label: "Donations",
    description: "Support Ferm and manage donation preferences.",
  },
  {
    id: "api-key",
    label: "API Key",
    description: "Create and manage your API credentials.",
  },
]

const SidebarTabButton = ({
  label,
  description,
  isActive,
  onClick,
}: {
  label: string
  description: string
  isActive: boolean
  onClick: () => void
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full rounded-lg border px-3 py-2 text-left transition",
        isActive
          ? "border-primary/30 bg-primary/10 text-foreground shadow-sm"
          : "border-transparent text-muted-foreground hover:border-border/70 hover:bg-muted/50",
      ].join(" ")}
    >
      <div className="text-sm font-medium text-foreground">{label}</div>
      <div className="text-xs text-muted-foreground">{description}</div>
    </button>
  )
}

const SettingsPanel = ({ title, children }: { title: string; children: ReactNode }) => {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  )
}

export function SettingsDialog({ trigger, open, onOpenChange }: SettingsDialogProps) {
  const { settings, hasHydrated, updateSettings: saveSettings } = useSettings()
  const { supabase, session } = useSupabase()
  const router = useRouter()
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<SettingsTabId>("login-security")
  const [isDeleting, setIsDeleting] = useState(false)
  const [draft, setDraft] = useState<SettingsState>(settings)
  const [aiKeyInput, setAiKeyInput] = useState("")
  const [hasStoredAiKey, setHasStoredAiKey] = useState(false)
  const [isSavingAiKey, setIsSavingAiKey] = useState(false)
  const [aiKeyError, setAiKeyError] = useState<string | null>(null)
  const isControlled = open !== undefined
  const dialogOpen = isControlled ? open : uncontrolledOpen
  const setDialogOpen = useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(nextOpen)
      }
      onOpenChange?.(nextOpen)
    },
    [isControlled, onOpenChange],
  )

  useEffect(() => {
    if (!hasHydrated) {
      return
    }

    setDraft(settings)
  }, [settings, hasHydrated])

  useEffect(() => {
    if (dialogOpen) {
      setDraft(settings)
      setActiveTab("login-security")
    }
  }, [dialogOpen, settings])

  const hasChanges = useMemo(() => {
    return JSON.stringify(settings) !== JSON.stringify(draft)
  }, [settings, draft])

  const handleSave = () => {
    saveSettings(draft)
    toast({
      title: "Settings saved",
      description: "Your workspace preferences have been updated.",
    })
    setDialogOpen(false)
  }

  const loadStoredAiKey = useCallback(async () => {
    setAiKeyError(null)

    try {
      const response = await fetch("/api/ai-keys", {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      })

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({ error: "Unable to load your AI key." }))
        throw new Error(errorPayload.error || "Unable to load your AI key.")
      }

      const data = (await response.json()) as { hasKey?: boolean }
      setHasStoredAiKey(Boolean(data.hasKey))
      setAiKeyInput("")
    } catch (error) {
      setAiKeyError(error instanceof Error ? error.message : "Unable to load your AI key.")
      setHasStoredAiKey(false)
    }
  }, [session?.access_token])

  const saveAiKey = useCallback(async () => {
    const trimmed = aiKeyInput.trim()
    if (!trimmed) return
    setIsSavingAiKey(true)
    setAiKeyError(null)

    try {
      if (trimmed.length < 20 || !/^[A-Za-z0-9._:-]+$/.test(trimmed)) {
        const message = "Please enter a valid OpenAI API key."
        setAiKeyError(message)
        toast({ title: "Invalid key", description: message, variant: "destructive" })
        return
      }

      const response = await fetch("/api/ai-keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ apiKey: trimmed }),
      })

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({ error: "Unable to save your AI key." }))
        const message = errorPayload.error || "Unable to save your AI key."
        setAiKeyError(message)
        toast({ title: "Failed to save key", description: message, variant: "destructive" })
        return
      }

      setHasStoredAiKey(true)
      setAiKeyInput("")
      toast({ title: "Key saved", description: "Your OpenAI key is ready to use." })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save your AI key."
      setAiKeyError(message)
      toast({ title: "Failed to save key", description: message, variant: "destructive" })
    } finally {
      setIsSavingAiKey(false)
    }
  }, [aiKeyInput, session?.access_token, toast])

  const clearAiKey = useCallback(() => {
    setIsSavingAiKey(true)
    setAiKeyError(null)

    void (async () => {
      try {
        const response = await fetch("/api/ai-keys", {
          method: "DELETE",
          headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
        })

        if (!response.ok) {
          const errorPayload = await response.json().catch(() => ({ error: "Unable to clear your AI key." }))
          throw new Error(errorPayload.error || "Unable to clear your AI key.")
        }

        setHasStoredAiKey(false)
        setAiKeyInput("")
        toast({ title: "Key removed", description: "Your OpenAI key was removed from your account." })
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to clear your AI key."
        setAiKeyError(message)
        toast({ title: "Failed to clear key", description: message, variant: "destructive" })
      } finally {
        setIsSavingAiKey(false)
      }
    })()
  }, [session?.access_token, toast])

  useEffect(() => {
    if (dialogOpen && activeTab === "api-key") {
      void loadStoredAiKey()
    }
  }, [activeTab, dialogOpen, loadStoredAiKey])

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
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      </Dialog>
    )
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="sm:max-w-3xl"showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-6 py-2 sm:flex-row">
          <aside className="flex w-full flex-col gap-2 sm:w-56">
            {settingsTabs.map((tab) => (
              <SidebarTabButton
                key={tab.id}
                label={tab.label}
                description={tab.description}
                isActive={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
              />
            ))}
          </aside>
          <div className="flex-1 space-y-6 rounded-lg border border-border/70 bg-muted/20 p-4">
            {activeTab === "login-security" && (
              <SettingsPanel title="Login & Security">
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Delete your account</p>
                    <p className="text-sm text-muted-foreground">
                      This permanently removes your account and all associated data.
                    </p>
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
                  </div>
                </div>
              </SettingsPanel>
            )}
            {activeTab === "chrome-extension" && (
              <SettingsPanel title="Chrome Extension">
                <div className="space-y-2 rounded-lg border border-border/70 bg-background p-4">
                  <p className="text-sm font-medium text-foreground">Extension status</p>
                  <p className="text-sm text-muted-foreground">
                    Connect your Ferm workspace with the Chrome extension to capture browsing context.
                  </p>
                  <Button variant="outline" type="button">
                    View extension instructions
                  </Button>
                </div>
              </SettingsPanel>
            )}
            {activeTab === "donations" && (
              <SettingsPanel title="Donations">
                <div className="space-y-2 rounded-lg border border-border/70 bg-background p-4">
                  <p className="text-sm font-medium text-foreground">Support Ferm</p>
                  <p className="text-sm text-muted-foreground">
                    Contributions help us keep Ferm running and fund new features.
                  </p>
                  <Button type="button">Manage donations</Button>
                </div>
              </SettingsPanel>
            )}
            {activeTab === "api-key" && (
              <SettingsPanel title="API Key">
                <div className="space-y-2 rounded-lg border border-border/70 bg-background p-4">
                  <AiKeyPanel
                    aiKeyInput={aiKeyInput}
                    onAiKeyInputChange={setAiKeyInput}
                    aiKeyError={aiKeyError}
                    onClearError={() => setAiKeyError(null)}
                    hasStoredAiKey={hasStoredAiKey}
                    isSavingAiKey={isSavingAiKey}
                    onSave={saveAiKey}
                    onClear={clearAiKey}
                  />
                </div>
              </SettingsPanel>
            )}
          </div>
        </div>
          
          <DialogFooter className="border-t border-border/60 pt-4">
         <div className="gap-2 flex w-full">
          <div className="flex w-full justify-end gap-2">
            <Button variant="outline" className="flex-1" type="button" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" className="flex-1" onClick={handleSave} disabled={!hasChanges}>
              Save changes
            </Button>
          </div>
        </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
