"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface AiKeyPanelProps {
  aiKeyInput: string
  onAiKeyInputChange: (value: string) => void
  aiKeyError: string | null
  onClearError?: () => void
  hasStoredAiKey: boolean
  isSavingAiKey: boolean
  onSave: () => void
  onClear: () => void
  usageRemaining?: number | null
  usageLimit?: number | null
  usageError?: string | null
  title?: string
  description?: string
}

const defaultDescription =
  "Add key to use prep and job loading with no limits"

export function AiKeyPanel({
  aiKeyInput,
  onAiKeyInputChange,
  aiKeyError,
  onClearError,
  hasStoredAiKey,
  isSavingAiKey,
  onSave,
  onClear,
  usageRemaining,
  usageLimit,
  usageError,
  title = "OpenAI key",
  description = defaultDescription,
}: AiKeyPanelProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-m font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Input
        value={aiKeyInput}
        onChange={(event) => {
          onAiKeyInputChange(event.target.value)
          if (aiKeyError) {
            onClearError?.()
          }
        }}
        placeholder="Paste your AI key"
      />
      {aiKeyError && (
        <Alert className="border-destructive/50 text-destructive">
          <AlertDescription>{aiKeyError}</AlertDescription>
        </Alert>
      )}
      <div className="flex items-center gap-2">
        <Button onClick={onSave} disabled={!aiKeyInput.trim() || isSavingAiKey}>
          {isSavingAiKey ? "Saving..." : hasStoredAiKey ? "Update key" : "Save key"}
        </Button>
        <Button variant="ghost" onClick={onClear} disabled={!hasStoredAiKey || isSavingAiKey}>
          Clear key
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {hasStoredAiKey ? "A key is already saved on your account" : "No key saved yet"}
      </p>
      {usageRemaining !== null && usageRemaining !== undefined && usageLimit !== null && usageLimit !== undefined && (
        <p className="text-xs text-muted-foreground">
          Remaining messages today: {usageRemaining} / {usageLimit}
        </p>
      )}
      {usageError && <p className="text-xs text-destructive">{usageError}</p>}
    </div>
  )
}
