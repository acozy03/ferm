"use client"

import { useMemo, useState } from "react"
import { format } from "date-fns"
import { CalendarIcon, ArrowDownAZ, ArrowUpAZ, Filter, X } from "lucide-react"

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import type { JobApplicationFilters, JobApplicationSort, Priority } from "@/lib/types/database"
import { formatStatusFilterLabel, STATUS_STAGE_FILTER_OPTIONS } from "@/lib/status"
import type { PipelineStage } from "@/lib/status"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { getDateOrNull } from "@/lib/date"

type FilterChip =
  | { type: "status"; value: string; label: string }
  | { type: "priority"; value: Priority; label: string }
  | { type: "date_from"; value: string; label: string }
  | { type: "date_to"; value: string; label: string }
  | { type: "search"; value: string; label: string }

type ApplicationsDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  filters: JobApplicationFilters
  sort: JobApplicationSort
  onFiltersChange: (filters: JobApplicationFilters) => void
  onSortChange: (sort: JobApplicationSort) => void
}

type SortFieldOption = {
  value: JobApplicationSort["field"]
  label: string
}

const priorityOptions: Priority[] = ["Low", "Medium", "High"]
const sortFieldOptions: SortFieldOption[] = [
  { value: "created_at", label: "Date added" },
  { value: "updated_at", label: "Last updated" },
  { value: "application_date", label: "Application date" },
  { value: "priority", label: "Priority" },
  { value: "resume_match_score", label: "Fit score" },
]

type DateInputFieldProps = {
  label: string
  value?: string
  onChange: (value?: string) => void
}

function DateInputField({ label, value, onChange }: DateInputFieldProps) {
  const [open, setOpen] = useState(false)
  const selectedDate = value ? getDateOrNull(value) : null

  const handleSelect = (date: Date | undefined) => {
    const formatted = date ? format(date, "yyyy-MM-dd") : undefined
    onChange(formatted)
    setOpen(false)
  }

  const handleClear = () => {
    onChange(undefined)
    setOpen(false)
  }

  return (
    <label className="flex flex-col gap-1 text-sm text-muted-foreground">
      <span className="text-xs uppercase tracking-wide">{label}</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="w-full justify-between text-left font-normal">
            <span className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              {selectedDate ? format(selectedDate, "LLL dd, y") : `Select ${label.toLowerCase()} date`}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate ?? undefined}
            defaultMonth={selectedDate ?? undefined}
            onSelect={handleSelect}
            initialFocus
          />
          {value ? (
            <div className="border-t p-2">
              <Button type="button" variant="ghost" size="sm" className="w-full" onClick={handleClear}>
                Clear date
              </Button>
            </div>
          ) : null}
        </PopoverContent>
      </Popover>
    </label>
  )
}

export function ApplicationsDrawer({
  open,
  onOpenChange,
  filters,
  sort,
  onFiltersChange,
  onSortChange,
}: ApplicationsDrawerProps) {
  const trimmedSearch = (filters.search ?? "").trim()
  const selectedSortField = useMemo(() => {
    return sortFieldOptions.some((option) => option.value === sort.field)
      ? sort.field
      : sortFieldOptions[0]?.value ?? "created_at"
  }, [sort.field])

  const activeFilters = useMemo<FilterChip[]>(() => {
    const chips: FilterChip[] = []

    for (const status of filters.status ?? []) {
      chips.push({ type: "status", value: status, label: formatStatusFilterLabel(status) })
    }

    for (const priority of filters.priority ?? []) {
      chips.push({ type: "priority", value: priority, label: `${priority} priority` })
    }

    if (filters.date_from) {
      chips.push({ type: "date_from", value: filters.date_from, label: `From ${filters.date_from}` })
    }

    if (filters.date_to) {
      chips.push({ type: "date_to", value: filters.date_to, label: `Through ${filters.date_to}` })
    }

    if (trimmedSearch.length > 0) {
      chips.push({ type: "search", value: trimmedSearch, label: `Search: ${trimmedSearch}` })
    }

    return chips
  }, [filters, trimmedSearch])

  const handleStatusToggle = (status: PipelineStage) => {
    const current = filters.status ?? []
    const exists = current.includes(status)
    const nextStatuses = exists ? current.filter((item) => item !== status) : [...current, status]

    onFiltersChange({
      ...filters,
      status: nextStatuses.length > 0 ? nextStatuses : undefined,
    })
  }

  const handlePriorityToggle = (priority: Priority) => {
    const current = filters.priority ?? []
    const exists = current.includes(priority)
    const nextPriorities = exists ? current.filter((item) => item !== priority) : [...current, priority]

    onFiltersChange({
      ...filters,
      priority: nextPriorities.length > 0 ? nextPriorities : undefined,
    })
  }

  const handleDateChange = (key: "date_from" | "date_to") => (value?: string) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    })
  }

  const clearAllFilters = () => {
    onFiltersChange({})
  }

  const handleRemoveFilter = (chip: FilterChip) => {
    if (chip.type === "status") {
      const current = filters.status ?? []
      const nextStatuses = current.filter((item) => item !== chip.value)

      onFiltersChange({
        ...filters,
        status: nextStatuses.length > 0 ? nextStatuses : undefined,
      })
      return
    }

    if (chip.type === "priority") {
      const current = filters.priority ?? []
      if (current.includes(chip.value)) {
        handlePriorityToggle(chip.value)
      }
      return
    }

    if (chip.type === "date_from") {
      onFiltersChange({
        ...filters,
        date_from: undefined,
      })
      return
    }

    if (chip.type === "date_to") {
      onFiltersChange({
        ...filters,
        date_to: undefined,
      })
      return
    }

    if (chip.type === "search") {
      onFiltersChange({
        ...filters,
        search: undefined,
      })
    }
  }

  const handleSortFieldSelect = (value: string) => {
    const option = sortFieldOptions.find((item) => item.value === value)
    if (!option) {
      return
    }

    onSortChange({
      field: option.value,
      direction: sort.direction,
    })
  }

  const handleSortDirectionChange = (value: string) => {
    if (value !== "asc" && value !== "desc") {
      return
    }

    onSortChange({
      field: selectedSortField,
      direction: value,
    })
  }

  const hasActiveFilters = activeFilters.length > 0

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent position="right" className="sm:max-w-4xl">
       

        <div className="border-t">
          <div className="flex flex-col gap-4 p-4">
            <div className="flex flex-col gap-4">
              <div className="rounded-lg border bg-background/60 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Filter className="h-4 w-4" />
                    Refine results
                    {hasActiveFilters ? (
                      <Badge variant="secondary" className="ml-1">
                        {activeFilters.length}
                      </Badge>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    disabled={!hasActiveFilters}
                  >
                    Clear filters
                  </Button>
                </div>
              </div>

              {hasActiveFilters ? (
                <div className="flex flex-wrap gap-2">
                  {activeFilters.map((chip) => (
                    <Badge key={`${chip.type}:${chip.value}`} variant="secondary" asChild>
                      <button type="button" className="flex items-center gap-1" onClick={() => handleRemoveFilter(chip)}>
                        {chip.label}
                        <X className="h-3 w-3" />
                        <span className="sr-only">Remove {chip.label}</span>
                      </button>
                    </Badge>
                  ))}
                </div>
              ) : null}

              <div className="rounded-lg border bg-background/60 p-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Date range
                </span>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <DateInputField label="From" value={filters.date_from} onChange={handleDateChange("date_from")} />
                  <DateInputField label="To" value={filters.date_to} onChange={handleDateChange("date_to")} />
                </div>
              </div>

              <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-col gap-1 lg:max-w-md">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Sort applications
                  </span>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Select value={selectedSortField} onValueChange={handleSortFieldSelect}>
                      <SelectTrigger className="sm:w-56">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {sortFieldOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <ToggleGroup
                      type="single"
                      value={sort.direction}
                      onValueChange={handleSortDirectionChange}
                      variant="outline"
                      className="flex w-full flex-nowrap overflow-hidden sm:w-auto"
                    >
                      <ToggleGroupItem value="asc" className="flex items-center gap-2 px-3" aria-label="Sort ascending">
                        <ArrowUpAZ className="h-4 w-4" />
                        <span className="text-sm">Ascending</span>
                      </ToggleGroupItem>
                      <ToggleGroupItem value="desc" className="flex items-center gap-2 px-3" aria-label="Sort descending">
                        <ArrowDownAZ className="h-4 w-4" />
                        <span className="text-sm">Descending</span>
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                </div>
              </div>
            </div>

            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-6 pb-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {STATUS_STAGE_FILTER_OPTIONS.map((option) => {
                      const isActive = (filters.status ?? []).includes(option.value)

                      return (
                        <Button
                          key={option.value}
                          type="button"
                          variant={isActive ? "secondary" : "outline"}
                          size="sm"
                          className="justify-start"
                          onClick={() => handleStatusToggle(option.value as PipelineStage)}
                        >
                          {option.label}
                        </Button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Priority</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {priorityOptions.map((priority) => {
                      const isActive = (filters.priority ?? []).includes(priority)

                      return (
                        <Button
                          key={priority}
                          type="button"
                          variant={isActive ? "secondary" : "outline"}
                          size="sm"
                          className="justify-center"
                          onClick={() => handlePriorityToggle(priority)}
                        >
                          {priority}
                        </Button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
