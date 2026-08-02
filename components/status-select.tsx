"use client"

import { useMemo } from "react"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { JobApplicationStatus, JobApplicationStatusHistory } from "@/lib/types/database"
import { getAllowedStatusOptions, parseStatus } from "@/lib/status"

interface SequentialStatusSelectProps {
  value?: JobApplicationStatus
  onChange: (status: JobApplicationStatus) => void
  statusHistory?: Pick<JobApplicationStatusHistory, "status">[]
  id?: string
  placeholder?: string
  triggerClassName?: string
  disabled?: boolean
}

export function SequentialStatusSelect({
  value,
  onChange,
  statusHistory,
  id,
  placeholder = "Select a status",
  triggerClassName,
  disabled,
}: SequentialStatusSelectProps) {
  const normalizedValue = value ?? "Applied"
  const metadata = useMemo(() => parseStatus(normalizedValue), [normalizedValue])

  const options = useMemo(
    () => getAllowedStatusOptions(metadata.value, { statusHistory }),
    [metadata.value, statusHistory],
  )

  return (
    <Select
      value={value ?? undefined}
      onValueChange={(next) => onChange(next as JobApplicationStatus)}
      disabled={disabled}
    >
      <SelectTrigger id={id} className={triggerClassName}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
